import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { VehicleRecord } from '../domain/records';
import { IndexedDbRecordStore, StorageError, type RecordStore } from '../storage/recordStore';

type LoadState = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

interface RecordsContextValue {
  records: VehicleRecord[];
  load: LoadState;
  reload: () => Promise<VehicleRecord[] | null>;
  store: RecordStore;
  flash: string | null;
  setFlash: (message: string | null) => void;
}

const RecordsContext = createContext<RecordsContextValue | null>(null);

export const errorMessage = (error: unknown) =>
  error instanceof StorageError ? error.message : `操作失败：${error instanceof Error ? error.message : '未知错误'}`;

export function RecordsProvider({ children, store: injected }: { children: ReactNode; store?: RecordStore }) {
  const store = useMemo(() => injected ?? new IndexedDbRecordStore(), [injected]);
  const [records, setRecords] = useState<VehicleRecord[]>([]);
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [flash, setFlash] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const list = await store.list();
      setRecords(list);
      setLoad({ status: 'ready' });
      return list;
    } catch (error) {
      setLoad({ status: 'error', message: errorMessage(error) });
      return null;
    }
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo(() => ({ records, load, reload, store, flash, setFlash }), [records, load, reload, store, flash]);
  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>;
}

export function useRecords(): RecordsContextValue {
  const ctx = useContext(RecordsContext);
  if (!ctx) throw new Error('RecordsProvider missing');
  return ctx;
}
