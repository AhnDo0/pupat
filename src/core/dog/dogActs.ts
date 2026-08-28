import type { EyeVariant } from './types';

/**
 * idle / 랜덤 행동 (Phase 2).
 *
 * 행동 하나는 "0..1로 진행되는 짧은 연출"이다.
 * 진행도(p)에서 몸의 오프셋을 계산할 뿐, 상태 머신이나 DOM을 알지 못한다.
 */

export type ActName =
  | 'lookAround'
  | 'yawn'
  | 'stretch'
  | 'earFlick'
  | 'scratch'
  | 'sniff'
  | 'headTilt'
  | 'shake'
  | 'bark'
  | 'butterfly'
  | 'sneeze'
  | 'zoomies'
  | 'tailWag';

/** 행동 길이(초) */
export const ACT_DURATION_SEC: Record<ActName, number> = {
  lookAround: 2.6,
  yawn: 2.0,
  stretch: 2.3,
  earFlick: 0.9,
  scratch: 1.9,
  sniff: 2.4,
  headTilt: 1.7,
  shake: 1.2,
  bark: 1.4,
  butterfly: 6.5,
  sneeze: 1.1,
  zoomies: 1.7,
  tailWag: 1.2,
};

/** 모션을 줄여 달라고 한 사용자에게는 격한 행동을 뺀다. */
const CALM_ACTS: ReadonlySet<ActName> = new Set<ActName>([
  'lookAround',
  'earFlick',
  'headTilt',
  'sniff',
  'yawn',
  'tailWag',
]);

export function isCalmAct(name: ActName): boolean {
  return CALM_ACTS.has(name);
}

export interface ActState {
  name: ActName;
  /** 진행도 0..1 */
  progress: number;
  /** 전체 길이(초) */
  duration: number;
}

/** 행동이 몸에 더하는 오프셋. 기본 애니메이션 위에 그대로 얹힌다. */
export interface ActOffsets {
  rotation: number;
  headX: number;
  headY: number;
  ear: number;
  /** 꼬리 회전 보정(deg) */
  tail: number;
  hop: number;
  bodyScaleX: number;
  pawLeft: number;
  pawRight: number;
  tongue: number;
  mouth: string | null;
  eyes: EyeVariant | null;
}

export const NEUTRAL_ACT_OFFSETS: ActOffsets = {
  rotation: 0,
  headX: 0,
  headY: 0,
  ear: 0,
  tail: 0,
  hop: 0,
  bodyScaleX: 0,
  pawLeft: 0,
  pawRight: 0,
  tongue: 0,
  mouth: null,
  eyes: null,
};

export function startAct(name: ActName): ActState {
  return { name, progress: 0, duration: ACT_DURATION_SEC[name] };
}

/** 한 프레임 전진. 끝났으면 null을 돌려준다. */
export function advanceAct(act: ActState | null, dt: number): ActState | null {
  if (!act) return null;
  const progress = act.progress + dt / act.duration;
  if (progress >= 1) return null;
  return { ...act, progress };
}

/** 나비가 도는 궤적. 강아지의 시선도 이 좌표를 따라간다. */
export function butterflyPos(progress: number): { x: number; y: number; nx: number } {
  const angle = progress * Math.PI * 2.2;
  return {
    x: 300 + Math.cos(angle) * 210,
    y: 190 + Math.sin(angle * 1.6) * 90,
    nx: Math.cos(angle),
  };
}

const YAWN_MOUTH = 'M266 314 Q 300 356 334 314';
const BARK_OPEN = 'M272 314 Q 300 348 328 314';
const BARK_CLOSED = 'M276 310 Q 288 324 300 310 Q 312 324 324 310';
const SNEEZE_MOUTH = 'M280 316 Q 300 336 320 316';
const ZOOMIES_MOUTH = 'M272 316 Q 300 344 328 316';

/**
 * 진행도 -> 몸의 오프셋.
 * @param scale 모션 감소 모드에서 진폭을 줄이기 위한 배율(0..1)
 */
export function actOffsets(act: ActState | null, scale = 1): ActOffsets {
  if (!act) return NEUTRAL_ACT_OFFSETS;

  const p = Math.min(1, act.progress);
  const ease = Math.sin(Math.PI * p) * scale;
  const o: ActOffsets = { ...NEUTRAL_ACT_OFFSETS };

  switch (act.name) {
    case 'lookAround':
      o.rotation = Math.sin(p * Math.PI * 3) * 13 * ease;
      o.headX = Math.sin(p * Math.PI * 3) * 16 * ease;
      break;
    case 'yawn':
      o.headY = -12 * ease;
      o.eyes = 'flat';
      o.mouth = YAWN_MOUTH;
      o.tongue = ease;
      break;
    case 'stretch':
      o.headY = 20 * ease;
      o.bodyScaleX = 0.06 * ease;
      o.eyes = p > 0.3 && p < 0.8 ? 'closed' : null;
      break;
    case 'earFlick':
      o.ear = Math.sin(p * Math.PI * 6) * 22 * scale;
      break;
    case 'scratch':
      o.rotation = 9 * ease;
      o.headY = 8 * ease;
      o.pawRight = ease;
      o.hop = Math.sin(p * Math.PI * 10) * 3 * scale;
      break;
    case 'sniff':
      o.headY = 22 * ease;
      o.headX = Math.sin(p * Math.PI * 4) * 10 * ease;
      o.eyes = 'flat';
      break;
    case 'headTilt':
      o.rotation = 16 * ease;
      break;
    case 'shake':
      o.rotation = Math.sin(p * Math.PI * 12) * 10 * ease;
      o.ear = Math.sin(p * Math.PI * 12) * 26 * scale;
      break;
    case 'bark':
      o.hop = -14 * ease;
      o.headY = -8 * ease;
      o.mouth = p % 0.4 < 0.2 ? BARK_OPEN : BARK_CLOSED;
      break;
    case 'butterfly': {
      const bf = butterflyPos(p);
      o.rotation = bf.nx * 12 * scale;
      o.headX = bf.nx * 22 * scale;
      o.headY = -6 * ease;
      break;
    }
    case 'sneeze':
      o.headY = (p < 0.4 ? -14 * (p / 0.4) : 16 * (1 - (p - 0.4) / 0.6)) * scale;
      o.eyes = 'flat';
      o.mouth = SNEEZE_MOUTH;
      break;
    case 'tailWag':
      o.tail = Math.sin(p * Math.PI * 8) * 22 * scale;
      o.ear = Math.sin(p * Math.PI * 4) * 6 * scale;
      break;
    case 'zoomies':
      o.hop = -Math.abs(Math.sin(p * Math.PI * 3)) * 26 * scale;
      o.eyes = 'closed';
      o.mouth = ZOOMIES_MOUTH;
      o.tongue = 1;
      break;
  }

  return o;
}

export interface ActEmote {
  icon: string;
  durationMs: number;
  color: string;
}

/** 행동을 시작할 때 함께 띄우는 말풍선. 없으면 null. */
export function actEmote(name: ActName): ActEmote | null {
  switch (name) {
    case 'bark':
      return { icon: '!', durationMs: 1200, color: 'oklch(0.58 0.14 40)' };
    case 'butterfly':
      return { icon: '?', durationMs: 1400, color: 'oklch(0.6 0.06 70)' };
    case 'sneeze':
      return { icon: '풋', durationMs: 900, color: 'oklch(0.62 0.05 66)' };
    case 'yawn':
      return { icon: '..', durationMs: 1200, color: 'oklch(0.68 0.03 66)' };
    default:
      return null;
  }
}
