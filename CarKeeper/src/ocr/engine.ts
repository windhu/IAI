import { relaxedSimd, simd } from 'wasm-feature-detect';
import type { OcrWord } from './interpret';

const OCR_CACHE_PREFIX = 'carkeeper-ocr-';

export class OcrError extends Error {
  constructor(
    message: string,
    readonly code: 'unsupported' | 'offline' | 'download' | 'init' | 'recognize' | 'cancelled',
  ) {
    super(message);
    this.name = 'OcrError';
  }
}

const assetUrl = (path: string) => new URL(`${import.meta.env.BASE_URL}ocr/${path}`, window.location.href).href;

export function ocrSupported(): boolean {
  return typeof WebAssembly === 'object' && typeof Worker !== 'undefined' && 'caches' in window;
}

let corePromise: Promise<OcrAssetFile> | null = null;

/** Picks the same LSTM core variant tesseract.js would choose, so exactly that file is cached. */
function selectCore(): Promise<OcrAssetFile> {
  corePromise ??= (async () => {
    if (await relaxedSimd()) return __OCR_ASSETS__.cores.relaxedsimd;
    if (await simd()) return __OCR_ASSETS__.cores.simd;
    return __OCR_ASSETS__.cores.plain;
  })();
  return corePromise;
}

async function requiredAssets(): Promise<OcrAssetFile[]> {
  return [__OCR_ASSETS__.worker, await selectCore(), __OCR_ASSETS__.lang];
}

export async function ocrDownloadSize(): Promise<number> {
  return (await requiredAssets()).reduce((sum, a) => sum + a.size, 0);
}

export interface OcrReadiness {
  ready: boolean;
  missingBytes: number;
  totalBytes: number;
}

/** Re-checks the cache on every call: the browser may evict it at any time. */
export async function checkOcrResources(): Promise<OcrReadiness> {
  if (!ocrSupported()) throw new OcrError('此浏览器不支持本机识别，请手动输入总里程。', 'unsupported');
  const assets = await requiredAssets();
  const cache = await caches.open(__OCR_CACHE_NAME__);
  let missingBytes = 0;
  for (const asset of assets) {
    const hit = await cache.match(assetUrl(asset.path), { ignoreVary: true });
    if (!hit) missingBytes += asset.size;
  }
  const totalBytes = assets.reduce((sum, a) => sum + a.size, 0);
  return { ready: missingBytes === 0, missingBytes, totalBytes };
}

async function deleteOutdatedCaches() {
  for (const key of await caches.keys()) {
    if (key.startsWith(OCR_CACHE_PREFIX) && key !== __OCR_CACHE_NAME__) await caches.delete(key);
  }
}

/** Downloads missing OCR resources into the versioned cache, then proves they initialize. */
export async function prepareOcr(onProgress: (loaded: number, total: number) => void, signal?: AbortSignal) {
  if (!ocrSupported()) throw new OcrError('此浏览器不支持本机识别，请手动输入总里程。', 'unsupported');
  const assets = await requiredAssets();
  const total = assets.reduce((sum, a) => sum + a.size, 0);
  const cache = await caches.open(__OCR_CACHE_NAME__);
  let loaded = 0;
  onProgress(0, total);

  for (const asset of assets) {
    const url = assetUrl(asset.path);
    if (await cache.match(url, { ignoreVary: true })) {
      loaded += asset.size;
      onProgress(loaded, total);
      continue;
    }
    if (!navigator.onLine) throw new OcrError('当前离线，识别资源尚未下载完成。请联网后重试，或手动输入总里程。', 'offline');
    let response: Response;
    try {
      response = await fetch(url, { signal });
    } catch (error) {
      if (signal?.aborted) throw new OcrError('已取消下载。', 'cancelled');
      throw new OcrError('识别资源下载失败，请检查网络后重试，或手动输入总里程。', 'download');
    }
    if (!response.ok || !response.body) {
      throw new OcrError(`识别资源下载失败（HTTP ${response.status}），请稍后重试。`, 'download');
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    const start = loaded;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value as Uint8Array<ArrayBuffer>);
        loaded = Math.min(start + chunks.reduce((s, c) => s + c.byteLength, 0), start + asset.size);
        onProgress(loaded, total);
      }
    } catch {
      if (signal?.aborted) throw new OcrError('已取消下载。', 'cancelled');
      throw new OcrError('识别资源下载中断，请重试。', 'download');
    }
    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    await cache.put(url, new Response(new Blob(chunks), { status: 200, headers: { 'content-type': contentType } }));
    loaded = start + asset.size;
    onProgress(loaded, total);
  }

  await deleteOutdatedCaches();
  const worker = await createOcrWorker();
  await worker.terminate();
}

type TesseractWorker = Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>;

async function createOcrWorker(onProgress?: (progress: number) => void): Promise<TesseractWorker> {
  const [{ createWorker, OEM, PSM }, core] = await Promise.all([import('tesseract.js'), selectCore()]);
  try {
    const worker = await createWorker('eng', OEM.LSTM_ONLY, {
      workerPath: assetUrl(__OCR_ASSETS__.worker.path),
      corePath: assetUrl(core.path),
      langPath: assetUrl('lang'),
      workerBlobURL: false,
      cacheMethod: 'none',
      gzip: true,
      logger: (m) => {
        if (m.status === 'recognizing text') onProgress?.(m.progress);
      },
      errorHandler: () => undefined,
    });
    // No character whitelist: with the LSTM engine it drops word spaces and zeroes confidence.
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    return worker;
  } catch {
    throw new OcrError('识别引擎启动失败，资源可能未完整下载。请重试或手动输入总里程。', 'init');
  }
}

export interface RecognitionJob {
  result: Promise<{ words: OcrWord[]; durationMs: number }>;
  cancel(): void;
}

/** Runs one recognition in a dedicated worker that is always terminated afterwards. */
export function startRecognition(image: Blob, onProgress: (progress: number) => void): RecognitionJob {
  let worker: TesseractWorker | null = null;
  let cancelled = false;
  const started = performance.now();

  const result = (async () => {
    try {
      worker = await createOcrWorker(onProgress);
      if (cancelled) throw new OcrError('已取消识别。', 'cancelled');
      const { data } = await worker.recognize(image, {}, { text: true, blocks: true });
      if (cancelled) throw new OcrError('已取消识别。', 'cancelled');
      const words: OcrWord[] = (data.blocks ?? []).flatMap((b) =>
        b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words.map((w) => ({ text: w.text, confidence: w.confidence })))),
      );
      return { words, durationMs: Math.round(performance.now() - started) };
    } catch (error) {
      if (cancelled) throw new OcrError('已取消识别。', 'cancelled');
      if (error instanceof OcrError) throw error;
      throw new OcrError('识别过程出错，请重新裁剪、重试或手动输入总里程。', 'recognize');
    } finally {
      const w = worker as TesseractWorker | null;
      worker = null;
      await w?.terminate().catch(() => undefined);
    }
  })();

  return {
    result,
    cancel() {
      cancelled = true;
      const w = worker as TesseractWorker | null;
      worker = null;
      void w?.terminate().catch(() => undefined);
    },
  };
}
