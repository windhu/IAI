export type RecordType = 'maintenance' | 'fuel';

interface BaseRecord {
  id: string;
  type: RecordType;
  /** Local calendar date of the event, YYYY-MM-DD. */
  date: string;
  odometerKm: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceRecord extends BaseRecord {
  type: 'maintenance';
  items: string[];
  amountFen?: number;
}

export interface FuelRecord extends BaseRecord {
  type: 'fuel';
  amountFen: number;
  volumeMl?: number;
}

export type VehicleRecord = MaintenanceRecord | FuelRecord;

export const PRESET_MAINTENANCE_ITEMS = [
  '更换机油',
  '更换机滤',
  '更换空气滤芯',
  '更换空调滤芯',
  '更换刹车片',
  '更换刹车油',
  '更换轮胎',
  '更换火花塞',
  '更换蓄电池',
] as const;

export interface MaintenanceDraft {
  date: string;
  odometer: string;
  items: string[];
  amount: string;
  notes: string;
}

export interface FuelDraft {
  date: string;
  odometer: string;
  amount: string;
  volume: string;
  notes: string;
}

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export type ValidationResult<T, K extends string> = { ok: true; value: T } | { ok: false; errors: FieldErrors<K> };

export type MaintenanceFields = Pick<MaintenanceRecord, 'date' | 'odometerKm' | 'items' | 'amountFen' | 'notes'>;
export type FuelFields = Pick<FuelRecord, 'date' | 'odometerKm' | 'amountFen' | 'volumeMl' | 'notes'>;

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

export function todayLocal(now: Date = new Date()): string {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isValidLocalDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (year < 1900 || month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

export function isValidIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

export const isSafeNonNegativeInteger = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

export const isSafePositiveInteger = (v: unknown): v is number => isSafeNonNegativeInteger(v) && v > 0;

export type ParseResult<T> = { ok: true; value: T } | { ok: false; reason: 'empty' | 'format' | 'precision' | 'range' };

export function parseOdometer(input: string): ParseResult<number> {
  const text = input.trim();
  if (!text) return { ok: false, reason: 'empty' };
  if (!/^\d+$/.test(text)) return { ok: false, reason: 'format' };
  const value = Number(text);
  if (!Number.isSafeInteger(value)) return { ok: false, reason: 'range' };
  return { ok: true, value };
}

/** Converts a non-negative decimal string to integer minor units without floating point math. */
export function parseDecimalUnits(input: string, decimals: number): ParseResult<number> {
  const text = input.trim();
  if (!text) return { ok: false, reason: 'empty' };
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) return { ok: false, reason: 'format' };
  const fraction = match[2] ?? '';
  if (fraction.length > decimals) return { ok: false, reason: 'precision' };
  const units = BigInt(match[1]) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0');
  if (units > BigInt(Number.MAX_SAFE_INTEGER)) return { ok: false, reason: 'range' };
  return { ok: true, value: Number(units) };
}

export function formatUnits(units: number, decimals: number): string {
  const scale = 10 ** decimals;
  const whole = Math.trunc(units / scale);
  const fraction = String(units % scale).padStart(decimals, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}

export const formatYuan = (fen: number) => {
  const whole = Math.trunc(fen / 100);
  return `${whole}.${String(fen % 100).padStart(2, '0')}`;
};
export const formatLiters = (ml: number) => formatUnits(ml, 3);

function normalizeNotes(notes: string): string | undefined {
  const trimmed = notes.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeItems(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of items) {
    const item = raw.trim();
    if (item && !seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

function dateError(date: string): string | undefined {
  if (!date.trim()) return '请填写日期';
  if (!isValidLocalDate(date.trim())) return '日期无效';
  return undefined;
}

function odometerError(result: ParseResult<number>): string | undefined {
  if (result.ok) return undefined;
  if (result.reason === 'empty') return '请填写总里程';
  if (result.reason === 'range') return '总里程数值过大';
  return '总里程须为不含小数的非负整数（公里）';
}

function moneyError(result: ParseResult<number>, required: boolean): string | undefined {
  if (result.ok) return undefined;
  if (result.reason === 'empty') return required ? '请填写金额' : undefined;
  if (result.reason === 'precision') return '金额最多两位小数';
  if (result.reason === 'range') return '金额数值过大';
  return '金额格式无效，请输入数字';
}

export function validateMaintenanceDraft(
  draft: MaintenanceDraft,
): ValidationResult<MaintenanceFields, keyof MaintenanceDraft> {
  const errors: FieldErrors<keyof MaintenanceDraft> = {};
  const odometer = parseOdometer(draft.odometer);
  const amount = parseDecimalUnits(draft.amount, 2);
  const items = normalizeItems(draft.items);

  errors.date = dateError(draft.date);
  errors.odometer = odometerError(odometer);
  errors.amount = moneyError(amount, false);
  if (items.length === 0) errors.items = '请至少选择或填写一个保养项目';

  if (Object.values(errors).some(Boolean)) return { ok: false, errors: stripEmpty(errors) };
  return {
    ok: true,
    value: {
      date: draft.date.trim(),
      odometerKm: (odometer as { value: number }).value,
      items,
      amountFen: amount.ok ? amount.value : undefined,
      notes: normalizeNotes(draft.notes),
    },
  };
}

export function validateFuelDraft(draft: FuelDraft): ValidationResult<FuelFields, keyof FuelDraft> {
  const errors: FieldErrors<keyof FuelDraft> = {};
  const odometer = parseOdometer(draft.odometer);
  const amount = parseDecimalUnits(draft.amount, 2);
  const volume = parseDecimalUnits(draft.volume, 3);

  errors.date = dateError(draft.date);
  errors.odometer = odometerError(odometer);
  errors.amount = moneyError(amount, true);
  if (amount.ok && amount.value === 0) errors.amount = '金额须大于 0';
  if (!volume.ok && volume.reason !== 'empty') {
    errors.volume =
      volume.reason === 'precision' ? '升数最多三位小数' : volume.reason === 'range' ? '升数数值过大' : '升数格式无效，请输入数字';
  } else if (volume.ok && volume.value === 0) {
    errors.volume = '升数须大于 0';
  }

  if (Object.values(errors).some(Boolean)) return { ok: false, errors: stripEmpty(errors) };
  return {
    ok: true,
    value: {
      date: draft.date.trim(),
      odometerKm: (odometer as { value: number }).value,
      amountFen: (amount as { value: number }).value,
      volumeMl: volume.ok ? volume.value : undefined,
      notes: normalizeNotes(draft.notes),
    },
  };
}

function stripEmpty<K extends string>(errors: FieldErrors<K>): FieldErrors<K> {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) as FieldErrors<K>;
}

export function newRecordId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildMaintenanceRecord(
  fields: MaintenanceFields,
  existing?: VehicleRecord,
  now: Date = new Date(),
): MaintenanceRecord {
  const timestamp = now.toISOString();
  return stripUndefined({
    id: existing?.id ?? newRecordId(),
    type: 'maintenance',
    date: fields.date,
    odometerKm: fields.odometerKm,
    items: fields.items,
    amountFen: fields.amountFen,
    notes: fields.notes,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  });
}

export function buildFuelRecord(fields: FuelFields, existing?: VehicleRecord, now: Date = new Date()): FuelRecord {
  const timestamp = now.toISOString();
  return stripUndefined({
    id: existing?.id ?? newRecordId(),
    type: 'fuel',
    date: fields.date,
    odometerKm: fields.odometerKm,
    amountFen: fields.amountFen,
    volumeMl: fields.volumeMl,
    notes: fields.notes,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  });
}

function stripUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

export function maintenanceDraftFrom(record?: MaintenanceRecord, now?: Date): MaintenanceDraft {
  return {
    date: record?.date ?? todayLocal(now),
    odometer: record ? String(record.odometerKm) : '',
    items: record ? [...record.items] : [],
    amount: record?.amountFen !== undefined ? formatUnits(record.amountFen, 2) : '',
    notes: record?.notes ?? '',
  };
}

export function fuelDraftFrom(record?: FuelRecord, now?: Date): FuelDraft {
  return {
    date: record?.date ?? todayLocal(now),
    odometer: record ? String(record.odometerKm) : '',
    amount: record ? formatUnits(record.amountFen, 2) : '',
    volume: record?.volumeMl !== undefined ? formatUnits(record.volumeMl, 3) : '',
    notes: record?.notes ?? '',
  };
}

/** Validates a stored or imported record and returns a normalized copy with only known fields. */
export function validateStoredRecord(input: unknown): { ok: true; record: VehicleRecord } | { ok: false; error: string } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { ok: false, error: '记录不是对象' };
  const r = input as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id.trim()) return { ok: false, error: '缺少有效的记录标识' };
  if (r.type !== 'maintenance' && r.type !== 'fuel') return { ok: false, error: '记录类型无效' };
  if (typeof r.date !== 'string' || !isValidLocalDate(r.date)) return { ok: false, error: '日期无效' };
  if (!isSafeNonNegativeInteger(r.odometerKm)) return { ok: false, error: '总里程无效' };
  if (r.notes !== undefined && typeof r.notes !== 'string') return { ok: false, error: '备注无效' };
  if (!isValidIsoTimestamp(r.createdAt) || !isValidIsoTimestamp(r.updatedAt)) return { ok: false, error: '时间戳无效' };

  const base = {
    id: r.id,
    date: r.date,
    odometerKm: r.odometerKm,
    notes: typeof r.notes === 'string' && r.notes.trim() ? r.notes : undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };

  if (r.type === 'maintenance') {
    if (!Array.isArray(r.items) || r.items.length === 0) return { ok: false, error: '保养项目为空' };
    if (!r.items.every((item) => typeof item === 'string' && item.trim())) return { ok: false, error: '保养项目无效' };
    if (r.amountFen !== undefined && !isSafeNonNegativeInteger(r.amountFen)) return { ok: false, error: '保养费用无效' };
    if (r.volumeMl !== undefined) return { ok: false, error: '保养记录不应包含升数' };
    return {
      ok: true,
      record: stripUndefined({ ...base, type: 'maintenance', items: [...(r.items as string[])], amountFen: r.amountFen as number | undefined }),
    };
  }

  if (!isSafePositiveInteger(r.amountFen)) return { ok: false, error: '加油金额无效' };
  if (r.volumeMl !== undefined && !isSafePositiveInteger(r.volumeMl)) return { ok: false, error: '加油升数无效' };
  if (r.items !== undefined) return { ok: false, error: '加油记录不应包含保养项目' };
  return {
    ok: true,
    record: stripUndefined({ ...base, type: 'fuel', amountFen: r.amountFen, volumeMl: r.volumeMl as number | undefined }),
  };
}

/** Newest event date first; same-day records ordered by creation time, then id, for a stable order. */
export function compareRecords(a: VehicleRecord, b: VehicleRecord): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

export const sortRecords = (records: VehicleRecord[]) => [...records].sort(compareRecords);

/**
 * Checks the entered odometer against records on other dates. Returns a warning when an earlier
 * event has a higher reading or a later event has a lower one; it never blocks saving.
 */
export function mileageWarning(
  candidate: { id?: string; date: string; odometerKm: number },
  records: VehicleRecord[],
): string | null {
  let earlierMax: VehicleRecord | undefined;
  let laterMin: VehicleRecord | undefined;
  for (const record of records) {
    if (record.id === candidate.id) continue;
    if (record.date < candidate.date && (!earlierMax || record.odometerKm > earlierMax.odometerKm)) earlierMax = record;
    if (record.date > candidate.date && (!laterMin || record.odometerKm < laterMin.odometerKm)) laterMin = record;
  }
  if (earlierMax && candidate.odometerKm < earlierMax.odometerKm) {
    return `总里程 ${candidate.odometerKm} 公里低于更早的 ${earlierMax.date} 记录（${earlierMax.odometerKm} 公里），请核对日期和里程。`;
  }
  if (laterMin && candidate.odometerKm > laterMin.odometerKm) {
    return `总里程 ${candidate.odometerKm} 公里高于更晚的 ${laterMin.date} 记录（${laterMin.odometerKm} 公里），请核对日期和里程。`;
  }
  return null;
}
