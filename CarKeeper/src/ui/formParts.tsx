import { useState, type FormEvent, type ReactNode } from 'react';
import { mileageWarning, type VehicleRecord } from '../domain/records';
import { requestPersistentStorage } from '../storage/recordStore';
import { Field, Notice } from './common';
import { OdometerCapture } from './OdometerCapture';
import { errorMessage, useRecords } from './RecordsContext';
import { navigate } from './router';

/** Shared save flow: warns once about inconsistent mileage, reports success only after commit. */
export function useSaveFlow(existing?: VehicleRecord) {
  const { records, store, reload, setFlash } = useRecords();
  const [warning, setWarning] = useState<{ message: string; key: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(record: VehicleRecord) {
    setError(null);
    const message = mileageWarning(record, records);
    const key = `${record.date}|${record.odometerKm}`;
    if (message && warning?.key !== key) {
      setWarning({ message, key });
      return;
    }
    if (!message) setWarning(null);
    setSaving(true);
    try {
      await store.put(record);
    } catch (err) {
      setError(`${errorMessage(err)} 记录未保存，已填写的内容仍保留。`);
      setSaving(false);
      return;
    }
    void requestPersistentStorage();
    await reload();
    setSaving(false);
    setFlash(existing ? '已保存修改' : '已保存记录');
    navigate(existing ? `/records/${encodeURIComponent(record.id)}` : '/history');
  }

  return { warning, saving, error, submit, clearError: () => setError(null) };
}

export function SaveSection({
  flow,
  label,
}: {
  flow: ReturnType<typeof useSaveFlow>;
  label: string;
}) {
  return (
    <>
      {flow.warning && (
        <Notice kind="warning">
          <strong>请核对里程：</strong>
          {flow.warning.message} 确认无误可点击“仍然保存”。
        </Notice>
      )}
      {flow.error && <Notice kind="error">{flow.error}</Notice>}
      <button type="submit" className="button button-primary button-block" disabled={flow.saving}>
        {flow.saving ? '正在保存…' : flow.warning ? '仍然保存' : label}
      </button>
    </>
  );
}

export function FormShell({ onSubmit, children }: { onSubmit: () => void; children: ReactNode }) {
  return (
    <form
      className="form"
      noValidate
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}

export function DateField({ id, value, error, onChange }: { id: string; value: string; error?: string; onChange: (v: string) => void }) {
  return (
    <Field label="日期" htmlFor={id} error={error}>
      <input id={id} className="input" type="date" value={value} onChange={(e) => onChange(e.target.value)} required />
    </Field>
  );
}

export function OdometerField({
  id,
  value,
  error,
  onChange,
}: {
  id: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const [capturing, setCapturing] = useState(false);
  return (
    <Field label="总里程（公里）" htmlFor={id} error={error}>
      <div className="input-row">
        <input
          id={id}
          className="input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="例如 58320"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="button" className="button" onClick={() => setCapturing(true)} aria-expanded={capturing}>
          拍照识别
        </button>
      </div>
      {capturing && (
        <OdometerCapture
          onAccept={(km) => {
            onChange(String(km));
            setCapturing(false);
          }}
          onClose={() => setCapturing(false)}
        />
      )}
    </Field>
  );
}

export function NotesField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label="备注（可选）" htmlFor={id}>
      <textarea id={id} className="input" rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}
