import { object } from './korean';
import { zoneName } from './petZones';
import type { DogAction, EyeVariant, PetZoneId } from './types';

/**
 * 행동(behavior) = "이 상태일 때 몸이 어떻게 움직여야 하는가"에 대한 규칙표.
 * 애니메이션 수치와 표정 선택을 한곳에 모아 두어 반응을 추가하기 쉽게 한다.
 */
export interface BehaviorProfile {
  /** 호흡 한 주기(ms) */
  breathePeriodMs: number;
  /** 호흡 진폭 */
  breatheAmplitude: number;
  /** 꼬리 흔들기 한 주기(ms) */
  tailPeriodMs: number;
  /** 꼬리 진폭(deg) */
  tailAmplitude: number;
  /** 귀 목표 각도(deg) */
  earTarget: number;
  /** 몸을 기대는 정도 -1..1 */
  lean: number;
  /** 눈 표현 */
  eyes: EyeVariant;
  /** 깜빡임 허용 여부 */
  allowBlink: boolean;
  /** 볼 홍조 / 하트 / zzz 표시 */
  blush: boolean;
  hearts: boolean;
  sleeping: boolean;
  /** 혀를 내밀고 있는지 */
  tongue: boolean;
  /** 입 모양 */
  mouth: 'smile' | 'grin' | 'melt' | 'rest' | 'pout';
}

const BEHAVIORS: Record<DogAction, BehaviorProfile> = {
  idle: {
    breathePeriodMs: 1800,
    breatheAmplitude: 0.022,
    tailPeriodMs: 1400,
    tailAmplitude: 6,
    earTarget: 0,
    lean: 0,
    eyes: 'open',
    allowBlink: true,
    blush: false,
    hearts: false,
    sleeping: false,
    tongue: false,
    mouth: 'smile',
  },
  looking: {
    breathePeriodMs: 1800,
    breatheAmplitude: 0.022,
    tailPeriodMs: 1400,
    tailAmplitude: 6,
    earTarget: 0,
    lean: 0,
    eyes: 'open',
    allowBlink: true,
    blush: false,
    hearts: false,
    sleeping: false,
    tongue: false,
    mouth: 'smile',
  },
  petting: {
    breathePeriodMs: 1800,
    breatheAmplitude: 0.022,
    tailPeriodMs: 320,
    tailAmplitude: 15,
    earTarget: 16,
    lean: 0,
    eyes: 'closed',
    allowBlink: false,
    blush: false,
    hearts: false,
    sleeping: false,
    tongue: false,
    mouth: 'grin',
  },
  happy: {
    breathePeriodMs: 900,
    breatheAmplitude: 0.022,
    tailPeriodMs: 180,
    tailAmplitude: 28,
    earTarget: 16,
    lean: 0.5,
    eyes: 'closed',
    allowBlink: false,
    blush: true,
    hearts: true,
    sleeping: false,
    tongue: false,
    mouth: 'grin',
  },
  bliss: {
    breathePeriodMs: 1100,
    breatheAmplitude: 0.022,
    tailPeriodMs: 130,
    tailAmplitude: 34,
    earTarget: 16,
    lean: 0.5,
    eyes: 'closed',
    allowBlink: false,
    blush: true,
    hearts: true,
    sleeping: false,
    tongue: true,
    mouth: 'melt',
  },
  annoyed: {
    breathePeriodMs: 1800,
    breatheAmplitude: 0.022,
    tailPeriodMs: 1600,
    tailAmplitude: 3,
    earTarget: -8,
    lean: -1,
    eyes: 'flat',
    allowBlink: false,
    blush: false,
    hearts: false,
    sleeping: false,
    tongue: false,
    mouth: 'pout',
  },
  sleepy: {
    breathePeriodMs: 2600,
    breatheAmplitude: 0.035,
    tailPeriodMs: 2200,
    tailAmplitude: 3,
    earTarget: 22,
    lean: 0,
    eyes: 'flat',
    allowBlink: false,
    blush: false,
    hearts: false,
    sleeping: true,
    tongue: false,
    mouth: 'rest',
  },
};

export function behaviorFor(action: DogAction): BehaviorProfile {
  return BEHAVIORS[action];
}

/** 상태 머신이 시선을 원점으로 되돌려야 하는 행동인지 */
export function shouldResetGaze(action: DogAction): boolean {
  return action === 'idle' || action === 'sleepy';
}

const MOUTH_PATHS = {
  grin: 'M272 316 Q 300 344 328 316',
  melt: 'M266 314 Q 300 350 334 314',
  pout: 'M276 320 Q 300 306 324 320',
  rest: 'M286 312 Q 300 322 314 312',
  smile: 'M276 310 Q 288 324 300 310 Q 312 324 324 310',
} as const;

export function mouthPathFor(profile: BehaviorProfile): string {
  return MOUTH_PATHS[profile.mouth];
}

/**
 * 상태별 안내 문구.
 * Phase 2에서는 지금 만지고 있는 부위까지 문구에 반영한다.
 */
export function hintFor(
  action: DogAction,
  zone: PetZoneId,
  pointer: 'fine' | 'coarse',
): string {
  const name = zoneName(zone);
  const verb = pointer === 'coarse' ? '손가락으로' : '마우스로';

  switch (action) {
    case 'annoyed':
      return '지금은 그 손길이 불편해요';
    case 'bliss':
      return '완전히 녹아버렸어요';
    case 'happy':
      return name ? `${name} 쓰담이 딱 좋아요` : '기분이 아주 좋아요';
    case 'petting':
      return zone === 'cheek' ? '볼이 말랑말랑해요' : '계속 쓰다듬어 주세요';
    case 'sleepy':
      return '살짝 졸고 있어요';
    case 'looking':
      if (zone === 'cheek') return '볼을 눌러 보세요 — 말랑말랑합니다';
      return name ? `${object(name)} 쓰다듬어 볼까요` : `${verb} 쓰다듬어 주세요`;
    default:
      return '부위별로 쓰다듬어 보세요 — 반응이 모두 달라요';
  }
}
