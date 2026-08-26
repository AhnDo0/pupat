import type { DogAction, EyeVariant } from './types';

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
  /** 눈 표현 */
  eyes: EyeVariant;
  /** 깜빡임 허용 여부 */
  allowBlink: boolean;
  /** 볼 홍조 / 하트 / zzz 표시 */
  blush: boolean;
  hearts: boolean;
  sleeping: boolean;
  /** 입 모양 */
  mouth: 'smile' | 'grin' | 'rest';
}

const BEHAVIORS: Record<DogAction, BehaviorProfile> = {
  idle: {
    breathePeriodMs: 1800,
    breatheAmplitude: 0.022,
    tailPeriodMs: 1400,
    tailAmplitude: 6,
    earTarget: 0,
    eyes: 'open',
    allowBlink: true,
    blush: false,
    hearts: false,
    sleeping: false,
    mouth: 'smile',
  },
  looking: {
    breathePeriodMs: 1800,
    breatheAmplitude: 0.022,
    tailPeriodMs: 1400,
    tailAmplitude: 6,
    earTarget: 0,
    eyes: 'open',
    allowBlink: true,
    blush: false,
    hearts: false,
    sleeping: false,
    mouth: 'smile',
  },
  petting: {
    breathePeriodMs: 1800,
    breatheAmplitude: 0.022,
    tailPeriodMs: 320,
    tailAmplitude: 15,
    earTarget: 16,
    eyes: 'closed',
    allowBlink: false,
    blush: false,
    hearts: false,
    sleeping: false,
    mouth: 'grin',
  },
  happy: {
    breathePeriodMs: 900,
    breatheAmplitude: 0.022,
    tailPeriodMs: 180,
    tailAmplitude: 28,
    earTarget: 16,
    eyes: 'closed',
    allowBlink: false,
    blush: true,
    hearts: true,
    sleeping: false,
    mouth: 'grin',
  },
  sleepy: {
    breathePeriodMs: 2600,
    breatheAmplitude: 0.035,
    tailPeriodMs: 2200,
    tailAmplitude: 3,
    earTarget: 22,
    eyes: 'flat',
    allowBlink: false,
    blush: false,
    hearts: false,
    sleeping: true,
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
  rest: 'M286 312 Q 300 322 314 312',
  smile: 'M276 310 Q 288 324 300 310 Q 312 324 324 310',
} as const;

export function mouthPathFor(profile: BehaviorProfile): string {
  return MOUTH_PATHS[profile.mouth];
}

/** 상태별 안내 문구. 입력 방식에 따라 "마우스/손가락"만 달라진다. */
export function hintFor(action: DogAction, pointer: 'fine' | 'coarse'): string {
  const verb = pointer === 'coarse' ? '손가락으로' : '마우스로';
  switch (action) {
    case 'looking':
      return `${verb} 쓰다듬어 주세요`;
    case 'petting':
      return '계속 쓰다듬어 주세요';
    case 'happy':
      return '기분이 아주 좋아요';
    case 'sleepy':
      return '살짝 졸고 있어요';
    default:
      return '강아지를 눌러서 쓰다듬어 보세요';
  }
}
