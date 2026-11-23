import { useState } from 'react';
import {
  buildMaintenanceRecord,
  maintenanceDraftFrom,
  normalizeItems,
  PRESET_MAINTENANCE_ITEMS,
  validateMaintenanceDraft,
  type MaintenanceDraft,
  type MaintenanceRecord,
} from '../domain/records';
import { Field } from './common';
import { DateField, FormShell, NotesField, OdometerField, SaveSection, useSaveFlow } from './formParts';

export function MaintenanceForm({ existing }: { existing?: MaintenanceRecord }) {
  const [draft, setDraft] = useState<MaintenanceDraft>(() => maintenanceDraftFrom(existing));
  const [errors, setErrors] = useState<Partial<Record<keyof MaintenanceDraft, string>>>({});
  const [customItem, setCustomItem] = useState('');
  const flow = useSaveFlow(existing);

  const update = <K extends keyof MaintenanceDraft>(key: K, value: MaintenanceDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleItem = (item: string) =>
    update('items', draft.items.includes(item) ? draft.items.filter((i) => i !== item) : [...draft.items, item]);

  const addCustomItem = () => {
    const item = customItem.trim();
    if (!item) return;
    update('items', normalizeItems([...draft.items, item]));
    setCustomItem('');
  };

  const customItems = draft.items.filter((i) => !(PRESET_MAINTENANCE_ITEMS as readonly string[]).includes(i));

  const submit = () => {
    const pending = customItem.trim() ? normalizeItems([...draft.items, customItem]) : draft.items;
    const result = validateMaintenanceDraft({ ...draft, items: pending });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    if (pending !== draft.items) {
      update('items', pending);
      setCustomItem('');
    }
    setErrors({});
    void flow.submit(buildMaintenanceRecord(result.value, existing));
  };

  return (
    <FormShell onSubmit={submit}>
      <DateField id="m-date" value={draft.date} error={errors.date} onChange={(v) => update('date', v)} />
      <OdometerField id="m-odometer" value={draft.odometer} error={errors.odometer} onChange={(v) => update('odometer', v)} />
      <Field label="保养项目（可多选）" error={errors.items}>
        <div className="chips" role="group" aria-label="保养项目">
          {PRESET_MAINTENANCE_ITEMS.map((item) => (
            <label key={item} className={`chip${draft.items.includes(item) ? ' chip-on' : ''}`}>
              <input type="checkbox" checked={draft.items.includes(item)} onChange={() => toggleItem(item)} />
              {item}
            </label>
          ))}
          {customItems.map((item) => (
            <label key={item} className="chip chip-on">
              <input type="checkbox" checked onChange={() => toggleItem(item)} />
              {item}
            </label>
          ))}
        </div>
        <div className="input-row">
          <input
            className="input"
            aria-label="自定义保养项目"
            placeholder="其他项目，例如 四轮定位"
            value={customItem}
            onChange={(e) => setCustomItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomItem();
              }
            }}
          />
          <button type="button" className="button" onClick={addCustomItem}>
            添加
          </button>
        </div>
      </Field>
      <Field label="费用（元，可选）" htmlFor="m-amount" error={errors.amount}>
        <input
          id="m-amount"
          className="input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="例如 580.00"
          value={draft.amount}
          onChange={(e) => update('amount', e.target.value)}
        />
      </Field>
      <NotesField id="m-notes" value={draft.notes} onChange={(v) => update('notes', v)} />
      <SaveSection flow={flow} label={existing ? '保存修改' : '保存保养记录'} />
    </FormShell>
  );
}
