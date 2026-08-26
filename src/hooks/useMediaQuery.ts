'use client';

import { useSyncExternalStore } from 'react';

function subscribe(query: string) {
  return (onChange: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {};
    const list = window.matchMedia(query);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  };
}

/** SSR에서는 항상 false를 돌려주고, 마운트 후 실제 값으로 맞춘다. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}

/** 손가락처럼 거친 포인터인지 — 인터랙션 프로파일 선택에 쓴다. */
export function useCoarsePointer(): boolean {
  return useMediaQuery('(pointer: coarse)');
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
