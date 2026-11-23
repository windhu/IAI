// Copies the self-hosted OCR runtime (worker, WASM cores, English model) into public/ocr
// so the app never falls back to the tesseract.js default CDN.
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`, { paths: [root] }));
const pkgVersion = (name) => JSON.parse(readFileSync(join(pkgDir(name), 'package.json'), 'utf8')).version;

// LSTM-only cores matching OEM.LSTM_ONLY; the browser picks one by WASM feature support.
export const CORE_VARIANTS = {
  relaxedsimd: 'tesseract-core-relaxedsimd-lstm.wasm.js',
  simd: 'tesseract-core-simd-lstm.wasm.js',
  plain: 'tesseract-core-lstm.wasm.js',
};

function sources() {
  return [
    { from: join(pkgDir('tesseract.js'), 'dist', 'worker.min.js'), to: 'worker.min.js' },
    ...Object.values(CORE_VARIANTS).map((file) => ({ from: join(pkgDir('tesseract.js-core'), file), to: `core/${file}` })),
    {
      from: join(pkgDir('@tesseract.js-data/eng'), '4.0.0_best_int', 'eng.traineddata.gz'),
      to: 'lang/eng.traineddata.gz',
    },
  ];
}

export function getOcrAssetInfo() {
  const version = `tjs${pkgVersion('tesseract.js')}-core${pkgVersion('tesseract.js-core')}-eng${pkgVersion('@tesseract.js-data/eng')}`;
  const size = (rel) => statSync(sources().find((s) => s.to === rel).from).size;
  return {
    version,
    worker: { path: 'worker.min.js', size: size('worker.min.js') },
    cores: Object.fromEntries(
      Object.entries(CORE_VARIANTS).map(([key, file]) => [key, { path: `core/${file}`, size: size(`core/${file}`) }]),
    ),
    lang: { path: 'lang/eng.traineddata.gz', size: size('lang/eng.traineddata.gz') },
  };
}

export function copyOcrAssets() {
  const outDir = join(root, 'public', 'ocr');
  rmSync(outDir, { recursive: true, force: true });
  for (const { from, to } of sources()) {
    const target = join(outDir, to);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(from, target);
  }
  return outDir;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = copyOcrAssets();
  console.log(`OCR assets copied to ${out} (${getOcrAssetInfo().version})`);
}
