import { useState } from 'react';
import { buildFuelRecord, fuelDraftFrom, validateFuelDraft, type FuelDraft, type FuelRecord } from '../domain/records';
import { Field } from './common';
import { DateField, FormShell, NotesField, OdometerField, SaveSection, useSaveFlow } from './formParts';

export function FuelForm({ existing }: { existing?: FuelRecord }) {
  const [draft, setDraft] = useState<FuelDraft>(() => fuelDraftFrom(existing));
  const [errors, setErrors] = useState<Partial<Record<keyof FuelDraft, string>>>({});
  const flow = useSaveFlow(existing);

  const update = <K extends keyof FuelDraft>(key: K, value: FuelDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = () => {
    const result = validateFuelDraft(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    void flow.submit(buildFuelRecord(result.value, existing));
  };

  return (
    <FormShell onSubmit={submit}>
      <DateField id="f-date" value={draft.date} error={errors.date} onChange={(v) => update('date', v)} />
      <OdometerField id="f-odometer" value={draft.odometer} error={errors.odometer} onChange={(v) => update('odometer', v)} />
      <Field label="金额（元）" htmlFor="f-amount" error={errors.amount}>
        <input
          id="f-amount"
          className="input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="例如 300"
          value={draft.amount}
          onChange={(e) => update('amount', e.target.value)}
        />
      </Field>
      <Field label="加油量（升，可选）" htmlFor="f-volume" error={errors.volume}>
        <input
          id="f-volume"
          className="input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="例如 42.5"
          value={draft.volume}
          onChange={(e) => update('volume', e.target.value)}
        />
      </Field>
      <NotesField id="f-notes" value={draft.notes} onChange={(v) => update('notes', v)} />
      <SaveSection flow={flow} label={existing ? '保存修改' : '保存加油记录'} />
    </FormShell>
  );
}
