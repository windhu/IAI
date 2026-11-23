import { useEffect, useState } from 'react';
import { checkOcrResources, ocrSupported, prepareOcr } from '../ocr/engine';
import { promptInstall, retryOfflineSetup, usePwaState } from '../pwa/pwa';
import { Notice } from './common';
import { formatMb } from './OdometerCapture';

export function UpdateBanner({ onUpdate }: { onUpdate: () => void }) {
  const { updateAvailable } = usePwaState();
  if (!updateAvailable) return null;
  return (
    <div className="banner" role="status">
      <span>有新版本可用。请先保存正在填写的内容，再点击更新。</span>
      <button type="button" className="button button-small" onClick={onUpdate}>
        立即更新
      </button>
    </div>
  );
}

export function OfflineStatus() {
  const { offline, offlineError } = usePwaState();
  const text = {
    checking: '正在检查离线状态…',
    installing: '正在准备离线使用，请保持联网…',
    ready: '已可离线使用：断网时也能记录、查看和备份。',
    failed: offlineError ?? '离线准备未完成。',
    unsupported: '此浏览器不支持离线使用，需联网使用。',
  }[offline];
  return (
    <div className="status-line" data-testid="offline-status" data-state={offline}>
      <span>{text}</span>
      {offline === 'failed' && (
        <>
          <span> 联网时仍可正常使用。</span>
          <button type="button" className="button button-small" onClick={() => void retryOfflineSetup()}>
            重试
          </button>
        </>
      )}
    </div>
  );
}

type OcrState =
  | { s: 'checking' }
  | { s: 'ready' }
  | { s: 'missing'; bytes: number }
  | { s: 'downloading'; loaded: number; total: number }
  | { s: 'error'; message: string }
  | { s: 'unsupported' };

export function OcrReadiness() {
  const [state, setState] = useState<OcrState>({ s: 'checking' });

  const check = async () => {
    if (!ocrSupported()) return setState({ s: 'unsupported' });
    try {
      const r = await checkOcrResources();
      setState(r.ready ? { s: 'ready' } : { s: 'missing', bytes: r.missingBytes });
    } catch (error) {
      setState({ s: 'error', message: (error as Error).message });
    }
  };

  useEffect(() => {
    void check();
  }, []);

  const download = async () => {
    try {
      await prepareOcr((loaded, total) => setState({ s: 'downloading', loaded, total }));
      await check();
    } catch (error) {
      setState({ s: 'error', message: (error as Error).message });
    }
  };

  return (
    <div className="status-line" data-testid="ocr-status" data-state={state.s}>
      {state.s === 'checking' && <span>正在检查识别资源…</span>}
      {state.s === 'ready' && <span>拍照识别资源已就绪，断网时也可识别。</span>}
      {state.s === 'unsupported' && <span>此浏览器不支持本机拍照识别，请手动输入里程。</span>}
      {state.s === 'missing' && (
        <>
          <span>拍照识别需先下载约 {formatMb(state.bytes)} 资源（仅一次，之后可离线识别）。</span>
          <button type="button" className="button button-small" onClick={() => void download()}>
            下载
          </button>
        </>
      )}
      {state.s === 'downloading' && (
        <span role="status">
          正在下载识别资源 {formatMb(state.loaded)} / {formatMb(state.total)}
          <progress max={state.total || 1} value={state.loaded} />
        </span>
      )}
      {state.s === 'error' && (
        <>
          <span>{state.message}</span>
          <button type="button" className="button button-small" onClick={() => void check()}>
            重新检查
          </button>
        </>
      )}
    </div>
  );
}

export function InstallGuide() {
  const { installPrompt, standalone } = usePwaState();
  if (standalone) return <div className="status-line">已从桌面图标打开。</div>;
  return (
    <div className="status-line" data-testid="install-guide">
      {installPrompt ? (
        <>
          <span>可以把爱车记录添加到手机桌面，像普通 App 一样打开。</span>
          <button type="button" className="button button-small" onClick={() => void promptInstall()}>
            安装到桌面
          </button>
        </>
      ) : (
        <span>
          添加到桌面：在 Android Chrome 中点右上角 <strong>⋮</strong> 菜单，选择“添加到主屏幕”或“安装应用”。没有该选项也可以直接用链接继续使用。
        </span>
      )}
    </div>
  );
}

export function LoadErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Notice kind="error">
      无法读取本机记录：{message}{' '}
      <button type="button" className="button button-small" onClick={onRetry}>
        重试
      </button>
    </Notice>
  );
}
