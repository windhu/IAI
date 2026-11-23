import { describe, expect, it } from 'vitest';
import {
  buildFuelRecord,
  buildMaintenanceRecord,
  compareRecords,
  fuelDraftFrom,
  maintenanceDraftFrom,
  mileageWarning,
  parseDecimalUnits,
  todayLocal,
  validateFuelDraft,
  validateMaintenanceDraft,
  validateStoredRecord,
  type VehicleRecord,
} from '../src/domain/records';

const maintenance = (over: Partial<Parameters<typeof validateMaintenanceDraft>[0]> = {}) => ({
  date: '2026-11-20',
  odometer: '58320',
  items: ['更换机油', '更换刹车片'],
  amount: '',
  notes: '',
  ...over,
});

const fuel = (over: Partial<Parameters<typeof validateFuelDraft>[0]> = {}) => ({
  date: '2026-11-20',
  odometer: '58320',
  amount: '300',
  volume: '',
  notes: '',
  ...over,
});

describe('dates', () => {
  it('uses the local calendar date as default', () => {
    expect(todayLocal(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(maintenanceDraftFrom(undefined, new Date(2026, 10, 20)).date).toBe('2026-11-20');
  });

  it.each(['2026-02-30', '2026-13-01', '2026-11-00', '20261120', '2026/11/20', ''])('rejects invalid date %j', (date) => {
    const result = validateMaintenanceDraft(maintenance({ date }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.date).toBeTruthy();
  });

  it('accepts leap days only in leap years', () => {
    expect(validateMaintenanceDraft(maintenance({ date: '2024-02-29' })).ok).toBe(true);
    expect(validateMaintenanceDraft(maintenance({ date: '2025-02-29' })).ok).toBe(false);
  });
});

describe('maintenance validation', () => {
  it('saves several items with optional amount and notes left empty', () => {
    const result = validateMaintenanceDraft(maintenance());
    expect(result).toEqual({
      ok: true,
      value: { date: '2026-11-20', odometerKm: 58320, items: ['更换机油', '更换刹车片'], amountFen: undefined, notes: undefined },
    });
  });

  it.each(['-1', '58320.5', 'abc', '', '9007199254740992'])('rejects odometer %j', (odometer) => {
    const result = validateMaintenanceDraft(maintenance({ odometer }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.odometer).toBeTruthy();
  });

  it('accepts zero and the largest safe integer odometer', () => {
    expect(validateMaintenanceDraft(maintenance({ odometer: '0' })).ok).toBe(true);
    expect(validateMaintenanceDraft(maintenance({ odometer: String(Number.MAX_SAFE_INTEGER) })).ok).toBe(true);
  });

  it('requires at least one non-blank item and de-duplicates', () => {
    const empty = validateMaintenanceDraft(maintenance({ items: ['  '] }));
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.errors.items).toBeTruthy();
    const dup = validateMaintenanceDraft(maintenance({ items: ['四轮定位', ' 四轮定位 '] }));
    expect(dup.ok && dup.value.items).toEqual(['四轮定位']);
  });

  it('allows zero cost but rejects negative or over-precise cost', () => {
    const zero = validateMaintenanceDraft(maintenance({ amount: '0' }));
    expect(zero.ok && zero.value.amountFen).toBe(0);
    for (const amount of ['-5', '1.234', '1e3']) {
      const r = validateMaintenanceDraft(maintenance({ amount }));
      expect(r.ok, amount).toBe(false);
    }
  });

  it('reports every invalid field at once', () => {
    const result = validateMaintenanceDraft(maintenance({ date: '2026-02-30', odometer: '1.5', items: [], amount: 'x' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['amount', 'date', 'items', 'odometer']);
  });
});

describe('fuel validation', () => {
  it('saves without volume and converts amount exactly', () => {
    const result = validateFuelDraft(fuel({ amount: '300' }));
    expect(result.ok && result.value).toMatchObject({ amountFen: 30000, volumeMl: undefined });
    const cents = validateFuelDraft(fuel({ amount: '0.29' }));
    expect(cents.ok && cents.value.amountFen).toBe(29);
    const tricky = validateFuelDraft(fuel({ amount: '1.15' }));
    expect(tricky.ok && tricky.value.amountFen).toBe(115);
  });

  it.each(['', '0', '0.00', '-1', '12.345', 'abc'])('rejects amount %j', (amount) => {
    const result = validateFuelDraft(fuel({ amount }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.amount).toBeTruthy();
  });

  it('accepts volume with up to three decimals as millilitres', () => {
    const result = validateFuelDraft(fuel({ volume: '42.125' }));
    expect(result.ok && result.value.volumeMl).toBe(42125);
  });

  it.each(['0', '-1', '1.2345', 'x'])('rejects volume %j', (volume) => {
    const result = validateFuelDraft(fuel({ volume }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.volume).toBeTruthy();
  });

  it('rejects amounts beyond the safe integer range', () => {
    expect(parseDecimalUnits('90071992547409.92', 2)).toEqual({ ok: false, reason: 'range' });
    expect(parseDecimalUnits('90071992547409.91', 2)).toEqual({ ok: true, value: Number.MAX_SAFE_INTEGER });
  });

  it('round-trips a saved record back into an editable draft', () => {
    const result = validateFuelDraft(fuel({ amount: '300.5', volume: '42.1', notes: ' 加满 ' }));
    if (!result.ok) throw new Error('expected valid');
    const record = buildFuelRecord(result.value, undefined, new Date('2026-11-20T08:00:00Z'));
    expect(fuelDraftFrom(record)).toEqual({ date: '2026-11-20', odometer: '58320', amount: '300.5', volume: '42.1', notes: '加满' });
  });
});

describe('stored record validation', () => {
  const valid = buildMaintenanceRecord(
    { date: '2026-11-20', odometerKm: 1, items: ['更换机油'], amountFen: 0, notes: undefined },
    undefined,
    new Date('2026-11-20T08:00:00Z'),
  );

  it('accepts a built record and keeps identity fields', () => {
    expect(validateStoredRecord(valid)).toEqual({ ok: true, record: valid });
  });

  it.each([
    [{ ...valid, id: '' }],
    [{ ...valid, type: 'repair' }],
    [{ ...valid, date: '2026-02-30' }],
    [{ ...valid, odometerKm: -1 }],
    [{ ...valid, odometerKm: 1.5 }],
    [{ ...valid, items: [] }],
    [{ ...valid, amountFen: 1.5 }],
    [{ ...valid, createdAt: 'yesterday' }],
    [{ ...valid, type: 'fuel', amountFen: 0 }],
    [{ ...valid, type: 'fuel', amountFen: 100, items: undefined, volumeMl: 0 }],
  ])('rejects %j', (input) => {
    expect(validateStoredRecord(input).ok).toBe(false);
  });
});

describe('ordering and mileage checks', () => {
  const rec = (id: string, date: string, odometerKm: number, createdAt: string): VehicleRecord => ({
    id,
    type: 'fuel',
    date,
    odometerKm,
    amountFen: 100,
    createdAt,
    updatedAt: createdAt,
  });

  it('sorts newest date first and keeps same-day order stable by creation time', () => {
    const list = [
      rec('a', '2026-11-01', 100, '2026-11-01T01:00:00.000Z'),
      rec('b', '2026-11-20', 300, '2026-11-20T01:00:00.000Z'),
      rec('c', '2026-11-20', 310, '2026-11-20T02:00:00.000Z'),
    ];
    expect([...list].sort(compareRecords).map((r) => r.id)).toEqual(['c', 'b', 'a']);
    expect([...list].reverse().sort(compareRecords).map((r) => r.id)).toEqual(['c', 'b', 'a']);
  });

  it('allows backfilling an older event with a lower reading', () => {
    const existing = [rec('a', '2026-11-20', 60000, '2026-11-20T01:00:00.000Z')];
    expect(mileageWarning({ date: '2026-01-10', odometerKm: 50000 }, existing)).toBeNull();
  });

  it('warns when a newer event has a lower reading than an earlier one', () => {
    const existing = [rec('a', '2026-10-01', 60000, '2026-10-01T01:00:00.000Z')];
    expect(mileageWarning({ date: '2026-11-20', odometerKm: 50000 }, existing)).toContain('2026-10-01');
    expect(mileageWarning({ date: '2026-09-01', odometerKm: 65000 }, existing)).toContain('更晚');
  });

  it('ignores the record being edited', () => {
    const existing = [rec('a', '2026-10-01', 60000, '2026-10-01T01:00:00.000Z')];
    expect(mileageWarning({ id: 'a', date: '2026-11-20', odometerKm: 50000 }, existing)).toBeNull();
  });
});
