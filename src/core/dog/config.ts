/**
 * 인터랙션 튜닝 값. 디자인 시안의 수치를 그대로 옮겨 두고,
 * 입력 방식(마우스/터치)에 따른 차이만 프로파일로 분리한다.
 */

export const DOG_VIEWBOX = 600;

export interface DogEngineConfig {
  /** 무입력 후 SLEEPY로 전환되기까지(ms) */
  sleepAfterMs: number;
  /** LOOKING에서 무입력 시 IDLE로 돌아가기까지(ms) */
  lookingIdleMs: number;
  /** 쓰다듬기 도중 손이 멈췄다고 판정하기까지(ms) */
  petReleaseMs: number;
  /** PETTING이 HAPPY로 승격되기까지(s) */
  happyAfterSec: number;
  /** HAPPY가 BLISS로 녹아내리기까지(s) */
  blissAfterSec: number;
  /** BLISS로 가기 위한 최소 애정도(0..1)와 손길 만족도 */
  blissAffection: number;
  blissQuality: number;
  /** 애정도 감쇠 속도(초당, 0..1 기준) */
  affectionDecayPerSec: number;
  /** 만족도 1의 손길을 1초 유지했을 때 오르는 애정도(0..1 기준) */
  affectionGainPerSec: number;
  /** 쓰다듬기로 인정할 최소 이동 거리(px) */
  petMoveThreshold: number;
  /** 리플 하나를 만들 이동 거리(px) */
  rippleDistance: number;
  /** 속도 구간 경계(SVG 단위/초) */
  speedSlowMax: number;
  speedFastMin: number;
  /** 이보다 빠르면 어떤 강아지도 좋아하지 않는다 */
  speedPanicMin: number;
  /** 눈 깜빡임 주기(ms) / 지속(ms) */
  blinkIntervalMs: number;
  blinkDurationMs: number;
  /** 고개·시선 이동 한계 */
  headRotationMax: number;
  headRotationGain: number;
  headOffsetXMax: number;
  headOffsetXGain: number;
  headOffsetYMax: number;
  headOffsetYGain: number;
  eyeOffsetXMax: number;
  eyeOffsetXGain: number;
  eyeOffsetYMax: number;
  eyeOffsetYGain: number;
  /** idle/랜덤 행동 사용 여부와 돌발 행동이 뽑힐 확률 */
  actsEnabled: boolean;
  randomActChance: number;
  /** 모션 감소 모드 */
  reducedMotion: boolean;
}

export const DEFAULT_DOG_CONFIG: DogEngineConfig = {
  sleepAfterMs: 12000,
  lookingIdleMs: 2600,
  petReleaseMs: 620,
  happyAfterSec: 1.2,
  blissAfterSec: 3.2,
  blissAffection: 0.7,
  blissQuality: 0.85,
  affectionDecayPerSec: 0.02,
  affectionGainPerSec: 0.07,
  petMoveThreshold: 1,
  rippleDistance: 40,
  speedSlowMax: 340,
  speedFastMin: 1250,
  speedPanicMin: 2600,
  blinkIntervalMs: 3600,
  blinkDurationMs: 130,
  headRotationMax: 11,
  headRotationGain: 13,
  headOffsetXMax: 22,
  headOffsetXGain: 26,
  headOffsetYMax: 14,
  headOffsetYGain: 18,
  eyeOffsetXMax: 8,
  eyeOffsetXGain: 12,
  eyeOffsetYMax: 6,
  eyeOffsetYGain: 9,
  actsEnabled: true,
  randomActChance: 0.35,
  reducedMotion: false,
};

/**
 * 입력 방식별 보정.
 * 별도의 인터랙션 시스템으로 분리하지 않고, 같은 엔진에 프로파일만 갈아 끼운다.
 * - 마우스: 세밀한 이동이 많으므로 판정을 더 촘촘하게
 * - 터치: 한 번의 스와이프 이동량이 크므로 반응을 조금 더 후하게
 */
export type InputProfileId = 'fine' | 'coarse';

export const INPUT_PROFILES: Record<InputProfileId, Partial<DogEngineConfig>> = {
  // 마우스/트랙패드 등 정밀 포인터
  fine: {
    rippleDistance: 40,
    petMoveThreshold: 1,
  },
  // 손가락 등 거친 포인터 — 손이 크게 움직이므로 속도 기준도 넉넉하게 잡는다
  coarse: {
    rippleDistance: 32,
    petMoveThreshold: 2,
    speedSlowMax: 420,
    speedFastMin: 1500,
    speedPanicMin: 3000,
  },
};

export function resolveConfig(
  overrides?: Partial<DogEngineConfig>,
  profile: InputProfileId = 'fine',
): DogEngineConfig {
  return { ...DEFAULT_DOG_CONFIG, ...INPUT_PROFILES[profile], ...overrides };
}
