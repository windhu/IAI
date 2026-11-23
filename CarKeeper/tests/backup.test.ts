import { describe, expect, it } from 'vitest';
import { countByType, createBackup, parseBackup, serializeBackup } from '../src/domain/backup';
import { buildFuelRecord, buildMaintenanceRecord } from '../src/domain/records';

const now = new Date('2026-11-20T08:00:00.000Z');
const maintenance = buildMaintenanceRecord(
  { date: '2026-10-01', odometerKm: 50000, items: ['更换机油', '更换刹车片'], amountFen: 58000, notes: '4S 店' },
  undefined,
  now,
);
const fuel = buildFuelRecord({ date: '2026-11-20', odometerKm: 50500, amountFen: 30050, volumeMl: 42125, notes: undefined }, undefined, now);

const validText = () => serializeBackup(createBackup([maintenance, fuel], now));
const mutate = (fn: (data: Record<string, any>) => void) => {
  const data = JSON.parse(validText());
  fn(data);
  return JSON.stringify(data);
};

describe('backup export', () => {
  it('contains format, version, units and every business field', () => {
    const data = JSON.parse(validText());
    expect(data).toMatchObject({ format: 'carkeeper-backup', version: 1, exportedAt: now.toISOString() });
    expect(data.units).toEqual({ distance: 'km', currency: 'CNY', volume: 'L' });
    expect(data.records).toEqual([fuel, maintenance]);
  });

  it('produces a valid zero-record backup', () => {
    const parsed = parseBackup(serializeBackup(createBackup([], now)));
    expect(parsed.ok && parsed.backup.records).toEqual([]);
  });

  it('round-trips without losing fields or ids', () => {
    const parsed = parseBackup(validText());
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.backup.records).toEqual([fuel, maintenance]);
      expect(countByType(parsed.backup.records)).toEqual({ maintenance: 1, fuel: 1, total: 2 });
    }
  });
});

describe('backup validation', () => {
  it.each([
    ['corrupted JSON', validText().slice(0, 40), 'JSON'],
    ['not an object', '[]', '结构'],
    ['wrong format', mutate((d) => (d.format = 'other')), '格式标识'],
    ['unknown version', mutate((d) => (d.version = 2)), '版本'],
    ['wrong unit', mutate((d) => (d.units.currency = 'USD')), '单位'],
    ['missing units', mutate((d) => delete d.units), '单位'],
    ['records missing', mutate((d) => delete d.records), '记录列表'],
    ['bad exportedAt', mutate((d) => (d.exportedAt = 'now')), '导出时间'],
    ['duplicate id', mutate((d) => (d.records[1].id = d.records[0].id)), '标识重复'],
    ['invalid amount', mutate((d) => (d.records[0].amountFen = -1)), '第 1 条'],
    ['invalid date', mutate((d) => (d.records[1].date = '2026-02-30')), '第 2 条'],
    ['empty items', mutate((d) => (d.records[1].items = [])), '保养项目'],
    ['amount in yuan', mutate((d) => (d.records[0].amountFen = 300.5)), '加油金额'],
  ])('rejects %s', (_name, text, message) => {
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toContain(message);
  });
});
