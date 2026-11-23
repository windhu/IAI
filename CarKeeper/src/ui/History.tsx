import { useState } from 'react';
import { formatLiters, formatYuan, type VehicleRecord } from '../domain/records';
import { Notice, Page } from './common';
import { FuelForm } from './FuelForm';
import { MaintenanceForm } from './MaintenanceForm';
import { errorMessage, useRecords } from './RecordsContext';
import { href, navigate } from './router';

const typeLabel = (r: VehicleRecord) => (r.type === 'maintenance' ? '保养' : '加油');
const km = (n: number) => `${n.toLocaleString('zh-CN')} 公里`;

function summary(r: VehicleRecord): string {
  if (r.type === 'maintenance') return r.items.join('、');
  return r.volumeMl !== undefined ? `${formatLiters(r.volumeMl)} 升` : '未填写升数';
}

export function History() {
  const { records, load } = useRecords();
  return (
    <Page title="历史记录" back="/">
      {load.status === 'loading' && <p role="status">正在读取…</p>}
      {load.status === 'ready' && records.length === 0 && (
        <div className="empty">
          <p>还没有记录。</p>
          <a className="button" href={href('/maintenance/new')}>
            记保养
          </a>{' '}
          <a className="button" href={href('/fuel/new')}>
            记加油
          </a>
        </div>
      )}
      {records.length > 0 && (
        <ul className="record-list" aria-label="记录列表">
          {records.map((r) => (
            <li key={r.id}>
              <a className="record-item" href={href(`/records/${encodeURIComponent(r.id)}`)} data-record-id={r.id}>
                <span className={`badge badge-${r.type}`}>{typeLabel(r)}</span>
                <span className="record-main">
                  <span className="record-line">
                    <span>{r.date}</span>
                    <span>{km(r.odometerKm)}</span>
                  </span>
                  <span className="record-sub">
                    <span className="record-summary">{summary(r)}</span>
                    {r.amountFen !== undefined && <span>¥{formatYuan(r.amountFen)}</span>}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

export function RecordDetail({ id }: { id: string }) {
  const { records, load, store, reload, setFlash } = useRecords();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const record = records.find((r) => r.id === id);

  if (load.status === 'loading') return <Page title="记录详情" back="/history"><p role="status">正在读取…</p></Page>;
  if (!record) return <Page title="记录详情" back="/history"><Notice kind="error">找不到这条记录，可能已被删除。</Notice></Page>;

  const remove = async () => {
    setDeleting(true);
    setError(null);
    try {
      await store.remove(record.id);
    } catch (err) {
      setError(`${errorMessage(err)} 记录未删除。`);
      setDeleting(false);
      return;
    }
    await reload();
    setFlash('已删除记录');
    navigate('/history');
  };

  return (
    <Page title={`${typeLabel(record)}记录`} back="/history">
      <dl className="detail">
        <dt>日期</dt>
        <dd>{record.date}</dd>
        <dt>总里程</dt>
        <dd>{km(record.odometerKm)}</dd>
        {record.type === 'maintenance' ? (
          <>
            <dt>保养项目</dt>
            <dd>{record.items.join('、')}</dd>
            <dt>费用</dt>
            <dd>{record.amountFen !== undefined ? `¥${formatYuan(record.amountFen)}` : '未填写'}</dd>
          </>
        ) : (
          <>
            <dt>金额</dt>
            <dd>¥{formatYuan(record.amountFen)}</dd>
            <dt>加油量</dt>
            <dd>{record.volumeMl !== undefined ? `${formatLiters(record.volumeMl)} 升` : '未填写'}</dd>
          </>
        )}
        <dt>备注</dt>
        <dd className="pre">{record.notes ?? '无'}</dd>
      </dl>
      {error && <Notice kind="error">{error}</Notice>}
      {confirming ? (
        <div className="confirm" role="alertdialog" aria-label="确认删除">
          <p>确定删除这条记录吗？删除后无法撤销。</p>
          <div className="input-row">
            <button type="button" className="button button-danger" disabled={deleting} onClick={() => void remove()}>
              {deleting ? '正在删除…' : '确认删除'}
            </button>
            <button type="button" className="button" disabled={deleting} onClick={() => setConfirming(false)}>
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="input-row">
          <a className="button button-primary" href={href(`/records/${encodeURIComponent(record.id)}/edit`)}>
            编辑
          </a>
          <button type="button" className="button button-danger" onClick={() => setConfirming(true)}>
            删除
          </button>
        </div>
      )}
    </Page>
  );
}

export function EditRecord({ id }: { id: string }) {
  const { records, load } = useRecords();
  const record = records.find((r) => r.id === id);
  const back = `/records/${encodeURIComponent(id)}`;
  if (load.status === 'loading') return <Page title="编辑记录" back={back}><p role="status">正在读取…</p></Page>;
  if (!record) return <Page title="编辑记录" back="/history"><Notice kind="error">找不到这条记录，可能已被删除。</Notice></Page>;
  return (
    <Page title={record.type === 'maintenance' ? '编辑保养记录' : '编辑加油记录'} back={back}>
      {record.type === 'maintenance' ? <MaintenanceForm existing={record} /> : <FuelForm existing={record} />}
    </Page>
  );
}
