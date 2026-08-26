'use client';

import { useEffect } from 'react';

/**
 * Service Worker 등록.
 *
 * UI에 아무것도 그리지 않는다. PWA는 기존 웹 앱 위에 얹는 기능이므로
 * 이 컴포넌트를 지워도 앱은 그대로 동작해야 한다.
 * 개발 중에는 캐시가 방해가 되므로 프로덕션에서만 등록한다.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        /* 등록 실패는 무시한다 — 오프라인 캐시는 부가 기능이다. */
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
