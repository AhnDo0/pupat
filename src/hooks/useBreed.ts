'use client';

import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_BREED_ID, isBreedId, type BreedId } from '@/core/dog';
import { getPlatform } from '@/platform';

export const BREED_STORAGE_KEY = 'pupat.breed.v1';

/**
 * 마지막으로 고른 강아지를 기억한다.
 * 저장은 StorageAdapter 뒤에 있으므로 Tauri에서도 그대로 동작한다.
 */
export function useBreed(): [BreedId, (id: BreedId) => void] {
  const [breed, setBreed] = useState<BreedId>(DEFAULT_BREED_ID);

  useEffect(() => {
    const stored = getPlatform().storage.get(BREED_STORAGE_KEY);
    if (isBreedId(stored)) setBreed(stored);
  }, []);

  const select = useCallback((id: BreedId) => {
    setBreed(id);
    getPlatform().storage.set(BREED_STORAGE_KEY, id);
  }, []);

  return [breed, select];
}
