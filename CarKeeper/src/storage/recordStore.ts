import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { sortRecords, validateStoredRecord, type VehicleRecord } from '../domain/records';

const DB_NAME = 'carkeeper';
const DB_VERSION = 1;
const STORE = 'records';

interface CarKeeperDB extends DBSchema {
  records: { key: string; value: VehicleRecord };
}

export class StorageError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

function describe(action: string, error: unknown): StorageError {
  if (error instanceof StorageError) return error;
  const name = error instanceof DOMException || error instanceof Error ? error.name : '';
  if (name === 'QuotaExceededError') return new StorageError(`${action}失败：设备存储空间不足。`, error);
  if (name === 'InvalidStateError' || name === 'UnknownError') {
    return new StorageError(`${action}失败：本机存储暂不可用，请稍后重试。`, error);
  }
  return new StorageError(`${action}失败：本机存储出错（${name || '未知错误'}）。`, error);
}

export type OpenDatabase = () => Promise<IDBPDatabase<CarKeeperDB>>;

export const openCarKeeperDb: OpenDatabase = () =>
  openDB<CarKeeperDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    },
    blocking(_current, _blocked, event) {
      (event.target as IDBDatabase).close();
    },
  });

export interface RecordStore {
  list(): Promise<VehicleRecord[]>;
  put(record: VehicleRecord): Promise<void>;
  remove(id: string): Promise<void>;
  replaceAll(records: VehicleRecord[]): Promise<void>;
}

export class IndexedDbRecordStore implements RecordStore {
  private dbPromise: Promise<IDBPDatabase<CarKeeperDB>> | null = null;

  constructor(private readonly open: OpenDatabase = openCarKeeperDb) {}

  private async db() {
    if (!this.dbPromise) {
      this.dbPromise = this.open().catch((error) => {
        this.dbPromise = null;
        throw error;
      });
    }
    return this.dbPromise;
  }

  async list(): Promise<VehicleRecord[]> {
    try {
      const db = await this.db();
      const raw = await db.getAll(STORE);
      const records: VehicleRecord[] = [];
      for (const item of raw) {
        const result = validateStoredRecord(item);
        if (!result.ok) throw new StorageError(`读取记录失败：本机数据已损坏（${result.error}）。`);
        records.push(result.record);
      }
      return sortRecords(records);
    } catch (error) {
      throw describe('读取记录', error);
    }
  }

  async put(record: VehicleRecord): Promise<void> {
    try {
      const db = await this.db();
      const tx = db.transaction(STORE, 'readwrite');
      await Promise.all([tx.store.put(record), tx.done]);
    } catch (error) {
      throw describe('保存记录', error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const db = await this.db();
      const tx = db.transaction(STORE, 'readwrite');
      await Promise.all([tx.store.delete(id), tx.done]);
    } catch (error) {
      throw describe('删除记录', error);
    }
  }

  /** Replaces every record in a single transaction; any failure rolls the whole change back. */
  async replaceAll(records: VehicleRecord[]): Promise<void> {
    try {
      const db = await this.db();
      const tx = db.transaction(STORE, 'readwrite');
      const done = tx.done;
      const writes: Promise<unknown>[] = [];
      try {
        writes.push(tx.store.clear());
        for (const record of records) writes.push(tx.store.put(record));
        await Promise.all([...writes, done]);
      } catch (error) {
        // Pending requests reject with AbortError once the transaction aborts.
        for (const write of writes) write.catch(() => undefined);
        try {
          tx.abort();
        } catch {
          // Already aborted by the failing request.
        }
        await done.catch(() => undefined);
        throw error;
      }
    } catch (error) {
      throw describe('恢复记录', error);
    }
  }
}

/** Best-effort request so the browser is less likely to evict local records. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
