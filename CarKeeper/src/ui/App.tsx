import { useEffect } from 'react';
import { installUpdate } from '../pwa/pwa';
import { Backup } from './Backup';
import { BrandLogo } from './BrandLogo';
import { Notice, Page } from './common';
import { FuelForm } from './FuelForm';
import { EditRecord, History, RecordDetail } from './History';
import { MaintenanceForm } from './MaintenanceForm';
import { RecordsProvider, useRecords } from './RecordsContext';
import { href, useRoute, type Route } from './router';
import { InstallGuide, LoadErrorBanner, OcrReadiness, OfflineStatus, UpdateBanner } from './Status';
import { LaunchScreen } from './LaunchScreen';

function Home() {
  const { records, load } = useRecords();
  return (
    <section className="page">
      <header className="page-header home-header">
        <h1>爱车记录</h1>
        <BrandLogo />
      </header>
      <div className="actions">
        <a className="action action-maintenance" href={href('/maintenance/new')}>
          <span className="action-icon" aria-hidden>
            🔧
          </span>
          记保养
        </a>
        <a className="action action-fuel" href={href('/fuel/new')}>
          <span className="action-icon" aria-hidden>
            ⛽
          </span>
          记加油
        </a>
      </div>
      <div className="links">
        <a className="link-card" href={href('/history')}>
          历史记录
          <span className="muted">{load.status === 'ready' ? `${records.length} 条` : ''}</span>
        </a>
        <a className="link-card" href={href('/backup')}>
          备份与恢复
          <span className="muted">导出 / 恢复</span>
        </a>
      </div>
      <section className="card">
        <h2>使用与离线</h2>
        <OfflineStatus />
        <OcrReadiness />
        <InstallGuide />
      </section>
      <p className="muted small">第一版按单车记录，里程单位为公里，金额单位为人民币元。数据只保存在本机。</p>
      <footer className="home-footer">
        <BrandLogo decorative />
        <span>峰哥出品</span>
      </footer>
    </section>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <Home />;
    case 'new-maintenance':
      return (
        <Page title="记保养" back="/">
          <MaintenanceForm />
        </Page>
      );
    case 'new-fuel':
      return (
        <Page title="记加油" back="/">
          <FuelForm />
        </Page>
      );
    case 'history':
      return <History />;
    case 'record':
      return <RecordDetail id={route.id} />;
    case 'edit':
      return <EditRecord id={route.id} />;
    case 'backup':
      return <Backup />;
    default:
      return (
        <Page title="页面不存在" back="/">
          <p>
            <a href={href('/')}>返回首页</a>
          </p>
        </Page>
      );
  }
}

function Shell() {
  const route = useRoute();
  const { load, reload, flash, setFlash } = useRecords();
  const routeKey = JSON.stringify(route);
  const narrow = ['new-maintenance', 'new-fuel', 'edit', 'backup'].includes(route.name);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(timer);
  }, [flash, setFlash]);

  return (
    <>
      <UpdateBanner onUpdate={() => void installUpdate()} />
      <main className={`main${narrow ? ' main-narrow' : ''}`}>
        {load.status === 'error' && <LoadErrorBanner message={load.message} onRetry={() => void reload()} />}
        {flash && <Notice kind="success">{flash}</Notice>}
        <Screen key={routeKey} route={route} />
      </main>
      <nav className="tabbar" aria-label="主导航">
        <a href={href('/')} aria-current={route.name === 'home' ? 'page' : undefined}>
          首页
        </a>
        <a href={href('/history')} aria-current={['history', 'record', 'edit'].includes(route.name) ? 'page' : undefined}>
          历史
        </a>
        <a href={href('/backup')} aria-current={route.name === 'backup' ? 'page' : undefined}>
          备份
        </a>
      </nav>
    </>
  );
}

export function App() {
  return (
    <RecordsProvider>
      <Shell />
      <LaunchScreen />
    </RecordsProvider>
  );
}
