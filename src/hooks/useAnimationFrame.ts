'use client';

import { useEffect, useRef } from 'react';

/**
 * requestAnimationFrame 루프.
 * 콜백은 ref에 담아 두어 매 렌더마다 루프를 다시 만들지 않는다.
 */
export function useAnimationFrame(callback: (now: number) => void, active = true): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!active || typeof window === 'undefined') return;

    let frame = 0;
    const tick = (time: number) => {
      callbackRef.current(time);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frame);
  }, [active]);
}
