import type { StorageAdapter } from '../types';

/**
 * localStorage 어댑터.
 *
 * SSR, 프라이빗 모드, 저장소 차단 등 접근이 실패하는 상황에서도
 * 앱이 멈추지 않도록 항상 메모리로 폴백한다.
 */
export function createWebStorage(): StorageAdapter {
  const memory = new Map<string, string>();

  const available = (): Storage | null => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const probe = '__pupat_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch {
      return null;
    }
  };

  let store: Storage | null | undefined;
  const resolve = (): Storage | null => {
    if (store === undefined) store = available();
    return store;
  };

  return {
    get(key) {
      const target = resolve();
      if (!target) return memory.get(key) ?? null;
      try {
        return target.getItem(key);
      } catch {
        return memory.get(key) ?? null;
      }
    },
    set(key, value) {
      memory.set(key, value);
      const target = resolve();
      if (!target) return;
      try {
        target.setItem(key, value);
      } catch {
        /* 용량 초과 등은 무시하고 메모리 값만 유지한다. */
      }
    },
    remove(key) {
      memory.delete(key);
      const target = resolve();
      if (!target) return;
      try {
        target.removeItem(key);
      } catch {
        /* noop */
      }
    },
  };
}
