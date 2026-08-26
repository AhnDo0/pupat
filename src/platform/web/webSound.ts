import type { SoundAdapter, SoundCue } from '../types';

/**
 * Web Audio 기반 사운드.
 * 외부 음원 없이 짧은 톤을 합성하므로 오프라인에서도 그대로 동작한다.
 */
const CUES: Record<SoundCue, { from: number; to: number; gain: number; length: number }> = {
  happy: { from: 520, to: 880, gain: 0.06, length: 0.42 },
  pet: { from: 320, to: 380, gain: 0.02, length: 0.14 },
};

export function createWebSound(): SoundAdapter {
  let context: AudioContext | null = null;

  const ensureContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    try {
      if (!context) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        context = new Ctor();
      }
      if (context.state === 'suspended') void context.resume();
      return context;
    } catch {
      return null;
    }
  };

  return {
    play(cue) {
      const ctx = ensureContext();
      if (!ctx) return;
      try {
        const spec = CUES[cue];
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(spec.from, now);
        oscillator.frequency.exponentialRampToValueAtTime(spec.to, now + spec.length * 0.38);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(spec.gain, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.length);

        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start();
        oscillator.stop(now + spec.length + 0.02);
      } catch {
        /* 사운드는 부가 기능이므로 실패해도 조용히 넘어간다. */
      }
    },
    dispose() {
      try {
        void context?.close();
      } catch {
        /* noop */
      }
      context = null;
    },
  };
}
