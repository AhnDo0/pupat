'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createRecordStore,
  dateKey,
  dayRecord,
  parseRecordStore,
  RECORD_STORAGE_KEY,
  serializeRecordStore,
  withDayRecord,
  type PetRecordStore,
} from '@/core/record/petRecord';
import { getPlatform } from '@/platform';

export interface PetRecordApi {
  store: PetRecordStore;
  /** 저장소에서 읽어 왔는지(첫 페인트 깜빡임 방지용) */
  ready: boolean;
  /** 오늘 이미 쌓여 있던 쓰담 시간(초) */
  baselineSeconds: number;
  /** 오늘 기록을 갱신한다. 값이 실제로 변할 때만 저장한다. */
  saveToday: (seconds: number, sessionPets: number) => void;
}

/**
 * 기록 저장/복원.
 * 저장 수단은 StorageAdapter 뒤에 있으므로 Tauri에서도 그대로 쓸 수 있다.
 */
export function usePetRecord(): PetRecordApi {
  const [store, setStore] = useState<PetRecordStore>(createRecordStore);
  const [ready, setReady] = useState(false);
  const baselineRef = useRef({ key: '', seconds: 0, pets: 0 });
  const lastSavedRef = useRef(-1);

  useEffect(() => {
    const storage = getPlatform().storage;
    const loaded = parseRecordStore(storage.get(RECORD_STORAGE_KEY));
    const key = dateKey();
    const today = dayRecord(loaded, key);
    baselineRef.current = { key, seconds: today.seconds, pets: today.pets };
    setStore(loaded);
    setReady(true);
  }, []);

  const saveToday = useCallback((seconds: number, sessionPets: number) => {
    const rounded = Math.floor(seconds);
    if (rounded === lastSavedRef.current) return;
    lastSavedRef.current = rounded;

    const baseline = baselineRef.current;
    const key = baseline.key || dateKey();

    setStore((previous) => {
      const next = withDayRecord(previous, key, {
        seconds: rounded,
        pets: baseline.pets + sessionPets,
      });
      getPlatform().storage.set(RECORD_STORAGE_KEY, serializeRecordStore(next));
      return next;
    });
  }, []);

  return {
    store,
    ready,
    baselineSeconds: baselineRef.current.seconds,
    saveToday,
  };
}
