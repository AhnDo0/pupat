import { createWebSound } from './web/webSound';
import { createWebStorage } from './web/webStorage';
import type { PlatformAdapters, PlatformKind } from './types';

export type { PlatformAdapters, PlatformKind, SoundAdapter, SoundCue, StorageAdapter } from './types';

/**
 * 현재 실행 환경.
 *
 * Web과 PWA는 완전히 같은 코드로 동작하며, 표시 모드만 다르다.
 * Tauri에서 열리면 'desktop'으로 잡히고, 여기에 데스크톱 전용 어댑터를 연결하면 된다.
 */
export function detectPlatformKind(): PlatformKind {
  if (typeof window === 'undefined') return 'web';
  if ('__TAURI_INTERNALS__' in window || '__TAURI__' in window) return 'desktop';
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return standalone ? 'pwa' : 'web';
}

let adapters: PlatformAdapters | null = null;

function createWebPlatform(): PlatformAdapters {
  return {
    kind: detectPlatformKind(),
    storage: createWebStorage(),
    createSound: createWebSound,
  };
}

/** 앱 어디서든 같은 어댑터 묶음을 쓴다. */
export function getPlatform(): PlatformAdapters {
  if (!adapters) adapters = createWebPlatform();
  return adapters;
}

/**
 * 다른 플랫폼(예: Tauri)에서 부팅할 때 어댑터를 갈아 끼우는 지점.
 * UI 코드는 손대지 않는다.
 */
export function setPlatform(next: PlatformAdapters): void {
  adapters = next;
}
