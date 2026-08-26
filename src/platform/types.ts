/**
 * 플랫폼 어댑터 인터페이스.
 *
 * UI와 코어는 이 인터페이스에만 의존한다.
 * 향후 Tauri Desktop App에서는 같은 인터페이스를 구현한 어댑터
 * (예: Tauri store 플러그인, 네이티브 사운드)를 끼워 넣기만 하면 된다.
 */

export type PlatformKind = 'web' | 'pwa' | 'desktop';

export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export type SoundCue = 'happy' | 'pet';

export interface SoundAdapter {
  play(cue: SoundCue): void;
  dispose(): void;
}

export interface PlatformAdapters {
  kind: PlatformKind;
  storage: StorageAdapter;
  createSound(): SoundAdapter;
}
