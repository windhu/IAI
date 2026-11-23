import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import { buildFuelRecord, buildMaintenanceRecord, type VehicleRecord } from '../src/domain/records';
import { IndexedDbRecordStore, StorageError, type OpenDatabase } from '../src/storage/recordStore';

let n = 0;
const uniqueDb = (): OpenDatabase => {
  const name = `test-${++n}`;
  return () =>
    openDB(name, 1, {
      upgrade(db) {
        db.createObjectStore('records', { keyPath: 'id' });
      },
    }) as ReturnType<OpenDatabase>;
};

const fuel = (odometerKm: number, date = '2026-11-20') =>
  buildFuelRecord({ date, odometerKm, amountFen: 30000, volumeMl: undefined, notes: undefined });
const maintenance = (odometerKm: number) =>
  buildMaintenanceRecord({ date: '2026-10-01', odometerKm, items: ['更换机油'], amountFen: undefined, notes: '备注' });

const stores: IndexedDbRecordStore[] = [];
const newStore = (open: OpenDatabase = uniqueDb()) => {
  const store = new IndexedDbRecordStore(open);
  stores.push(store);
  return store;
};
afterEach(() => {
  stores.length = 0;
});

describe('IndexedDbRecordStore', () => {
  it('persists records so a fresh store instance reads them back', async () => {
    const open = uniqueDb();
    const a = newStore(open);
    const record = maintenance(50000);
    await a.put(record);
    const reopened = newStore(open);
    expect(await reopened.list()).toEqual([record]);
  });

  it('updates in place and deletes only the target record', async () => {
    const store = newStore();
    const first = fuel(100);
    const second = fuel(200);
    await store.put(first);
    await store.put(second);
    await store.put({ ...first, odometerKm: 150 });
    await store.remove(second.id);
    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: first.id, odometerKm: 150 });
  });

  it('reports a read failure as an error instead of an empty history', async () => {
    const store = newStore(() => Promise.reject(new DOMException('broken', 'UnknownError')));
    await expect(store.list()).rejects.toBeInstanceOf(StorageError);
    await expect(store.list()).rejects.toThrow('读取记录失败');
  });

  it('reports a write failure and does not persist anything', async () => {
    const open = uniqueDb();
    const store = newStore(open);
    const bad = { ...fuel(1), notes: (() => 1) as unknown as string };
    await expect(store.put(bad)).rejects.toThrow('保存记录失败');
    expect(await newStore(open).list()).toEqual([]);
  });

  it('maps quota errors to a clear storage-full message', async () => {
    const store = newStore(() => Promise.reject(new DOMException('full', 'QuotaExceededError')));
    await expect(store.put(fuel(1))).rejects.toThrow('存储空间不足');
  });

  it('treats corrupted stored data as a read error', async () => {
    const open = uniqueDb();
    const db = await open();
    await db.put('records', { id: 'x', type: 'fuel' } as unknown as VehicleRecord);
    await expect(newStore(open).list()).rejects.toThrow('数据已损坏');
  });

  it('replaces all records atomically', async () => {
    const store = newStore();
    await store.put(fuel(1));
    const replacement = [maintenance(10), fuel(20)];
    await store.replaceAll(replacement);
    expect((await store.list()).map((r) => r.id).sort()).toEqual(replacement.map((r) => r.id).sort());
  });

  it('rolls back the whole replacement when one write fails', async () => {
    const open = uniqueDb();
    const store = newStore(open);
    const original = [fuel(1), maintenance(2)];
    for (const r of original) await store.put(r);
    const broken = [fuel(3), { ...fuel(4), notes: (() => 1) as unknown as string }];
    await expect(store.replaceAll(broken)).rejects.toThrow('恢复记录失败');
    const after = await newStore(open).list();
    expect(after.map((r) => r.id).sort()).toEqual(original.map((r) => r.id).sort());
  });
});
