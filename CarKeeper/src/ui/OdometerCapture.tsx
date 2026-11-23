import { useEffect, useRef, useState } from 'react';
import { parseOdometer } from '../domain/records';
import { checkOcrResources, OcrError, prepareOcr, startRecognition, type RecognitionJob } from '../ocr/engine';
import { cropForOcr, decodeImage, DEFAULT_CROP, type CropRect } from '../ocr/image';
import { interpretOdometer, type OdometerReading } from '../ocr/interpret';
import { Notice } from './common';
import { CropSelector } from './CropSelector';

type Phase =
  | { name: 'pick' }
  | { name: 'loading' }
  | { name: 'crop' }
  | { name: 'preparing'; loaded: number; total: number }
  | { name: 'recognizing'; progress: number }
  | { name: 'result'; reading: OdometerReading; durationMs: number }
  | { name: 'error'; message: string; canRetry: boolean };

export const formatMb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function OdometerCapture({ onAccept, onClose }: { onAccept: (km: number) => void; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>({ name: 'pick' });
  const [crop, setCrop] = useState<CropRect>(DEFAULT_CROP);
  const [preview, setPreview] = useState<string | null>(null);
  const [edited, setEdited] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const bitmap = useRef<ImageBitmap | null>(null);
  const job = useRef<RecognitionJob | null>(null);
  const download = useRef<AbortController | null>(null);
  // Every new image, cancel or unmount bumps the token so late results are ignored.
  const token = useRef(0);

  const stopWork = () => {
    token.current++;
    job.current?.cancel();
    job.current = null;
    download.current?.abort();
    download.current = null;
  };

  const releaseImage = () => {
    bitmap.current?.close();
    bitmap.current = null;
    setPreview((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
  };

  useEffect(
    () => () => {
      stopWork();
      bitmap.current?.close();
      bitmap.current = null;
    },
    [],
  );
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const close = () => {
    stopWork();
    releaseImage();
    onClose();
  };

  async function onFile(file: File | undefined) {
    if (!file) return;
    stopWork();
    releaseImage();
    const current = token.current;
    setPhase({ name: 'loading' });
    try {
      const decoded = await decodeImage(file);
      if (current !== token.current) {
        decoded.close();
        return;
      }
      bitmap.current = decoded;
      setPreview(URL.createObjectURL(file));
      setCrop(DEFAULT_CROP);
      setPhase({ name: 'crop' });
    } catch (error) {
      if (current === token.current) setPhase({ name: 'error', message: (error as Error).message, canRetry: false });
    }
  }

  async function recognize() {
    if (!bitmap.current) return;
    stopWork();
    const current = token.current;
    const alive = () => current === token.current;
    try {
      const readiness = await checkOcrResources();
      if (!alive()) return;
      if (!readiness.ready) {
        if (!navigator.onLine) {
          throw new OcrError('识别资源尚未下载，且当前处于离线状态。请直接手动输入总里程，联网后可再使用识别。', 'offline');
        }
        const controller = new AbortController();
        download.current = controller;
        setPhase({ name: 'preparing', loaded: 0, total: readiness.totalBytes });
        await prepareOcr((loaded, total) => alive() && setPhase({ name: 'preparing', loaded, total }), controller.signal);
        download.current = null;
        if (!alive()) return;
      }
      const image = await cropForOcr(bitmap.current, crop);
      if (!alive()) return;
      setPhase({ name: 'recognizing', progress: 0 });
      const running = startRecognition(image, (progress) => alive() && setPhase({ name: 'recognizing', progress }));
      job.current = running;
      const { words, durationMs } = await running.result;
      if (!alive()) return;
      job.current = null;
      const reading = interpretOdometer(words);
      setEdited(reading.kind === 'candidate' ? String(reading.value) : '');
      setEditError(null);
      setPhase({ name: 'result', reading, durationMs });
    } catch (error) {
      if (!alive()) return;
      job.current = null;
      if (error instanceof OcrError && error.code === 'cancelled') return;
      const message = error instanceof Error ? error.message : '识别失败，请手动输入总里程。';
      setPhase({ name: 'error', message, canRetry: !(error instanceof OcrError && error.code === 'unsupported') });
    }
  }

  const cancelRunning = () => {
    stopWork();
    setPhase(bitmap.current ? { name: 'crop' } : { name: 'pick' });
  };

  const accept = () => {
    const parsed = parseOdometer(edited);
    if (!parsed.ok) {
      setEditError('请输入不含小数的非负整数公里数');
      return;
    }
    stopWork();
    releaseImage();
    onAccept(parsed.value);
  };

  return (
    <div className="capture" role="region" aria-label="拍照识别总里程">
      <div className="capture-head">
        <strong>拍照识别总里程</strong>
        <button type="button" className="button button-small" onClick={close}>
          关闭
        </button>
      </div>
      <p className="muted small">照片只在本机处理，不会上传或保存。识别失败时可直接在上方手动输入。</p>

      <div className="input-row">
        <label className="button">
          拍照
          <input
            className="visually-hidden"
            type="file"
            accept="image/*"
            capture="environment"
            data-testid="camera-input"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        <label className="button">
          从相册选择
          <input
            className="visually-hidden"
            type="file"
            accept="image/*"
            data-testid="album-input"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {phase.name === 'pick' && (
        <p className="muted small">如果无法打开相机（未授权或浏览器不支持），请从相册选择照片，或直接手动输入。</p>
      )}

      {phase.name === 'loading' && <p role="status">正在读取照片…</p>}

      {preview && phase.name !== 'loading' && (
        <>
          <p className="small">在照片上拖动，框选只包含总里程（ODO）数字的区域：</p>
          <CropSelector src={preview} rect={crop} onChange={setCrop} />
        </>
      )}

      {phase.name === 'crop' && (
        <button type="button" className="button button-primary button-block" onClick={() => void recognize()}>
          识别所选区域
        </button>
      )}

      {phase.name === 'preparing' && (
        <div role="status">
          <p>首次使用，正在下载本机识别资源（{formatMb(phase.loaded)} / {formatMb(phase.total)}）…</p>
          <progress max={phase.total || 1} value={phase.loaded} />
          <button type="button" className="button" onClick={cancelRunning}>
            取消
          </button>
        </div>
      )}

      {phase.name === 'recognizing' && (
        <div role="status">
          <p>正在本机识别… {Math.round(phase.progress * 100)}%</p>
          <progress max={1} value={phase.progress} />
          <button type="button" className="button" onClick={cancelRunning}>
            取消识别
          </button>
        </div>
      )}

      {phase.name === 'result' && (
        <>
          <p className="muted small" data-testid="ocr-duration" data-ms={phase.durationMs}>
            本机识别用时 {(phase.durationMs / 1000).toFixed(1)} 秒
          </p>
          <ResultView
            reading={phase.reading}
            edited={edited}
            editError={editError}
            onEdit={(v) => {
              setEdited(v);
              setEditError(null);
            }}
            onAccept={accept}
            onRetry={() => void recognize()}
            onClose={close}
          />
        </>
      )}

      {phase.name === 'error' && (
        <>
          <Notice kind="error">{phase.message}</Notice>
          <div className="input-row">
            {phase.canRetry && bitmap.current && (
              <button type="button" className="button" onClick={() => void recognize()}>
                重试
              </button>
            )}
            <button type="button" className="button" onClick={close}>
              改为手动输入
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ResultView({
  reading,
  edited,
  editError,
  onEdit,
  onAccept,
  onRetry,
  onClose,
}: {
  reading: OdometerReading;
  edited: string;
  editError: string | null;
  onEdit: (v: string) => void;
  onAccept: () => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  const retry = (
    <div className="input-row">
      <button type="button" className="button" onClick={onRetry}>
        重新识别
      </button>
      <button type="button" className="button" onClick={onClose}>
        改为手动输入
      </button>
    </div>
  );

  if (reading.kind === 'candidate') {
    return (
      <div className="ocr-result" data-testid="ocr-candidate">
        <Notice kind="info">
          识别结果：<strong>{reading.value}</strong> 公里（可信度 {reading.confidence}%）。请核对这是<strong>总里程（ODO）</strong>
          ，而不是小计里程或续航里程；如有误可直接修改。
        </Notice>
        <div className="input-row">
          <input
            className="input"
            aria-label="核对识别出的总里程"
            inputMode="numeric"
            value={edited}
            onChange={(e) => onEdit(e.target.value)}
          />
          <button type="button" className="button button-primary" onClick={onAccept}>
            采用
          </button>
        </div>
        {editError && <div className="field-error">{editError}</div>}
        {retry}
      </div>
    );
  }

  const message = {
    'low-confidence':
      reading.kind === 'low-confidence'
        ? `识别可信度过低（${reading.confidence}%），为避免填错，未给出结果。请缩小框选范围或换一张更清晰的照片重试，或手动输入。`
        : '',
    ambiguous:
      reading.kind === 'ambiguous'
        ? `所选区域识别到多个数字（${reading.readings.join('、')}），无法确定哪个是总里程。请缩小框选范围只包含总里程，或手动输入。`
        : '',
    'decimal-only':
      reading.kind === 'decimal-only'
        ? `只识别到带小数的数字（${reading.readings.join('、')}），可能是小计里程。请框选总里程（ODO）或手动输入。`
        : '',
    none: '未能识别出数字。可能是反光、模糊或框选范围不对，请重新框选、换一张照片，或手动输入。',
  }[reading.kind];

  return (
    <div
      className="ocr-result"
      data-testid="ocr-rejected"
      data-kind={reading.kind}
      data-value={reading.kind === 'low-confidence' ? reading.value : undefined}
      data-confidence={reading.kind === 'low-confidence' ? reading.confidence : undefined}
    >
      <Notice kind="warning">{message}</Notice>
      {retry}
    </div>
  );
}
