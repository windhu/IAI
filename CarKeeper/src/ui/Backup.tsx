import { useState } from 'react';
import { backupFileName, countByType, createBackup, parseBackup, serializeBackup, type BackupV1 } from '../domain/backup';
import { Notice, Page } from './common';
import { errorMessage, useRecords } from './RecordsContext';

type RestoreState =
  | { step: 'idle' }
  | { step: 'invalid'; message: string }
  | { step: 'preview'; backup: BackupV1; current: ReturnType<typeof countByType> }
  | { step: 'restoring'; backup: BackupV1; current: ReturnType<typeof countByType> }
  | { step: 'done'; count: number }
  | { step: 'failed'; message: string };

function downloadText(text: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function Backup() {
  const { store, reload } = useRecords();
  const [exportState, setExportState] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [restore, setRestore] = useState<RestoreState>({ step: 'idle' });

  const exportNow = async () => {
    setExportState(null);
    try {
      const records = await store.list();
      const backup = createBackup(records);
      downloadText(serializeBackup(backup), backupFileName());
      const c = countByType(records);
      setExportState({
        kind: 'success',
        message: `已导出 ${c.total} 条记录（保养 ${c.maintenance} 条，加油 ${c.fuel} 条）。请把文件保存到安全的地方。`,
      });
    } catch (error) {
      setExportState({ kind: 'error', message: `${errorMessage(error)} 未生成备份文件。` });
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setRestore({ step: 'invalid', message: '无法读取所选文件。' });
      return;
    }
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      setRestore({ step: 'invalid', message: parsed.error });
      return;
    }
    try {
      const current = countByType(await store.list());
      setRestore({ step: 'preview', backup: parsed.backup, current });
    } catch (error) {
      setRestore({ step: 'invalid', message: `${errorMessage(error)} 暂时无法恢复。` });
    }
  };

  const confirmRestore = async () => {
    if (restore.step !== 'preview') return;
    setRestore({ ...restore, step: 'restoring' });
    try {
      await store.replaceAll(restore.backup.records);
    } catch (error) {
      setRestore({ step: 'failed', message: `${errorMessage(error)} 本机原有记录保持不变。` });
      return;
    }
    await reload();
    setRestore({ step: 'done', count: restore.backup.records.length });
  };

  return (
    <Page title="备份与恢复" back="/">
      <Notice kind="info">
        <ul className="plain-list">
          <li>所有记录只保存在这台手机的浏览器中，没有云端副本。</li>
          <li>清除浏览器数据、卸载浏览器或更换手机都可能导致记录丢失，请定期导出备份。</li>
          <li>备份文件未加密，包含全部记录，请自行妥善保管。</li>
          <li>恢复会用备份内容整体替换本机记录，建议恢复前先导出当前数据。</li>
        </ul>
      </Notice>

      <section className="card">
        <h2>导出备份</h2>
        <button type="button" className="button button-primary button-block" onClick={() => void exportNow()}>
          导出备份文件
        </button>
        {exportState && <Notice kind={exportState.kind}>{exportState.message}</Notice>}
      </section>

      <section className="card">
        <h2>从备份恢复</h2>
        <label className="button button-block">
          选择备份文件
          <input
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            data-testid="restore-input"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>

        {restore.step === 'invalid' && <Notice kind="error">无法恢复：{restore.message} 本机记录未作任何修改。</Notice>}

        {(restore.step === 'preview' || restore.step === 'restoring') && (
          <div className="confirm" role="alertdialog" aria-label="确认恢复">
            <p>
              备份导出于 {new Date(restore.backup.exportedAt).toLocaleString('zh-CN')}，包含保养{' '}
              {countByType(restore.backup.records).maintenance} 条、加油 {countByType(restore.backup.records).fuel} 条。
            </p>
            <p>
              本机当前有 {restore.current.total} 条记录（保养 {restore.current.maintenance} 条，加油 {restore.current.fuel}{' '}
              条）。
            </p>
            <Notice kind="warning">
              {restore.backup.records.length === 0
                ? '这个备份没有任何记录，恢复后本机所有记录将被清空。'
                : `恢复后，本机现有的 ${restore.current.total} 条记录将被备份内容整体替换（不会合并）。`}
              {restore.current.total > 0 && ' 如需保留当前数据，请先点击上方“导出备份文件”。'}
            </Notice>
            <div className="input-row">
              <button
                type="button"
                className="button button-danger"
                disabled={restore.step === 'restoring'}
                onClick={() => void confirmRestore()}
              >
                {restore.step === 'restoring' ? '正在恢复…' : '确认恢复'}
              </button>
              <button
                type="button"
                className="button"
                disabled={restore.step === 'restoring'}
                onClick={() => setRestore({ step: 'idle' })}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {restore.step === 'done' && <Notice kind="success">恢复完成，本机现有 {restore.count} 条记录。</Notice>}
        {restore.step === 'failed' && <Notice kind="error">恢复失败：{restore.message}</Notice>}
      </section>
    </Page>
  );
}
