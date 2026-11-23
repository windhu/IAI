import { isValidIsoTimestamp, sortRecords, validateStoredRecord, type VehicleRecord } from './records';

export const BACKUP_FORMAT = 'carkeeper-backup';
export const BACKUP_VERSION = 1;
export const BACKUP_UNITS = { distance: 'km', currency: 'CNY', volume: 'L' } as const;

export interface BackupV1 {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  units: typeof BACKUP_UNITS;
  records: VehicleRecord[];
}

export function createBackup(records: VehicleRecord[], now: Date = new Date()): BackupV1 {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    units: { ...BACKUP_UNITS },
    records: sortRecords(records),
  };
}

export const serializeBackup = (backup: BackupV1) => `${JSON.stringify(backup, null, 2)}\n`;

export function backupFileName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `carkeeper-backup-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}.json`;
}

export type ParsedBackup = { ok: true; backup: BackupV1 } | { ok: false; error: string };

export function parseBackup(text: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: '文件不是有效的 JSON，可能已损坏。' };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, error: '文件结构无效，不是爱车记录备份。' };
  }
  const obj = data as Record<string, unknown>;
  if (obj.format !== BACKUP_FORMAT) return { ok: false, error: '文件不是爱车记录备份（格式标识不匹配）。' };
  if (obj.version !== BACKUP_VERSION) {
    return { ok: false, error: `不支持的备份版本：${String(obj.version)}，当前仅支持版本 ${BACKUP_VERSION}。` };
  }
  if (!isValidIsoTimestamp(obj.exportedAt)) return { ok: false, error: '备份导出时间无效。' };
  const units = obj.units as Record<string, unknown> | undefined;
  if (
    typeof units !== 'object' ||
    units === null ||
    units.distance !== BACKUP_UNITS.distance ||
    units.currency !== BACKUP_UNITS.currency ||
    units.volume !== BACKUP_UNITS.volume
  ) {
    return { ok: false, error: '备份单位不受支持（仅支持公里、人民币、升）。' };
  }
  if (!Array.isArray(obj.records)) return { ok: false, error: '备份缺少记录列表。' };

  const ids = new Set<string>();
  const records: VehicleRecord[] = [];
  for (const [index, raw] of obj.records.entries()) {
    const result = validateStoredRecord(raw);
    if (!result.ok) return { ok: false, error: `第 ${index + 1} 条记录无效：${result.error}。` };
    if (ids.has(result.record.id)) return { ok: false, error: `第 ${index + 1} 条记录的标识重复。` };
    ids.add(result.record.id);
    records.push(result.record);
  }

  return {
    ok: true,
    backup: { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: obj.exportedAt, units: { ...BACKUP_UNITS }, records },
  };
}

export function countByType(records: VehicleRecord[]) {
  let maintenance = 0;
  let fuel = 0;
  for (const r of records) {
    if (r.type === 'maintenance') maintenance++;
    else fuel++;
  }
  return { maintenance, fuel, total: records.length };
}
