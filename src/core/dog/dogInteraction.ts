import type { BreedProfile } from './breeds';
import type { DogEngineConfig } from './config';
import { hitTestZone, type PetZone } from './petZones';
import type { GrainBand, PointerSample, SpeedBand, Vec2 } from './types';

/**
 * 쓰다듬기 판정기.
 *
 * "누른 상태 + 일정 거리 이상 이동"이라는 MVP 규칙에 더해,
 * Phase 2에서는 손길의 속도와 방향(털의 결)까지 함께 측정한다.
 * 마우스인지 터치인지는 알지 못한다(Pointer Events로 이미 정규화된 샘플만 받는다).
 */
export interface PetGesture {
  /** 이번 샘플에서 쓰다듬기로 인정되었는지 */
  petted: boolean;
  /** 직전 샘플과의 이동 거리(px) */
  distance: number;
  /** 직전 샘플과의 시간 간격(초) */
  dtSec: number;
  /** 접촉한 부위(없으면 null) */
  zone: PetZone | null;
  /** 리플을 터뜨릴 위치(없으면 null) */
  ripple: Vec2 | null;
}

const NO_GESTURE: Omit<PetGesture, 'zone'> = {
  petted: false,
  distance: 0,
  dtSec: 0,
  ripple: null,
};

export class PetTracker {
  private pressing = false;
  private lastPoint: Vec2 | null = null;
  private lastLocal: Vec2 | null = null;
  private lastTime = 0;
  private travelSinceRipple = 0;
  private zone: PetZone | null = null;
  /** 최근 손길 속도(SVG 단위/초) */
  private speedValue = 0;
  /** -1(역방향) .. 1(털 방향) */
  private grainValue = 0;

  constructor(
    private config: DogEngineConfig,
    private breed: BreedProfile,
    private coarsePointer = false,
  ) {}

  setConfig(config: DogEngineConfig, coarsePointer: boolean): void {
    this.config = config;
    this.coarsePointer = coarsePointer;
  }

  setBreed(breed: BreedProfile): void {
    this.breed = breed;
    this.zone = null;
  }

  get isPressing(): boolean {
    return this.pressing;
  }

  get currentZone(): PetZone | null {
    return this.zone;
  }

  get speed(): number {
    return this.speedValue;
  }

  get grain(): number {
    return this.grainValue;
  }

  /** 손을 뗀 뒤 속도/방향이 서서히 0으로 돌아가게 한다. */
  decay(dt: number): void {
    const k = Math.min(1, dt * 3);
    this.speedValue += (0 - this.speedValue) * k;
    this.grainValue += (0 - this.grainValue) * k;
  }

  /**
   * 포인터를 눌렀을 때. 쓰다듬을 수 있는 부위가 아니면 누름으로 치지 않는다.
   * @returns 눌림이 시작되었는지
   */
  down(sample: PointerSample): boolean {
    const zone = hitTestZone(sample.local, this.breed, this.coarsePointer);
    this.zone = zone;
    this.lastTime = sample.time;
    if (!zone) {
      this.pressing = false;
      this.lastPoint = null;
      this.lastLocal = null;
      return false;
    }
    this.pressing = true;
    this.lastPoint = { ...sample.stage };
    this.lastLocal = { ...sample.local };
    this.travelSinceRipple = 0;
    return true;
  }

  move(sample: PointerSample): PetGesture {
    const zone = hitTestZone(sample.local, this.breed, this.coarsePointer);
    if (!this.pressing) {
      this.zone = zone;
      this.lastTime = sample.time;
      return { ...NO_GESTURE, zone };
    }

    const previous = this.lastPoint;
    const previousLocal = this.lastLocal;
    const distance = previous
      ? Math.hypot(sample.stage.x - previous.x, sample.stage.y - previous.y)
      : 0;
    const dtSec = Math.max(0.008, (sample.time - this.lastTime) / 1000);

    this.lastPoint = { ...sample.stage };
    this.lastTime = sample.time;

    if (distance <= this.config.petMoveThreshold) {
      return { petted: false, distance, dtSec, zone, ripple: null };
    }

    // SVG 좌표로 재면 화면 크기와 무관하게 같은 속도가 나온다.
    if (previousLocal) {
      const dx = sample.local.x - previousLocal.x;
      const dy = sample.local.y - previousLocal.y;
      const localDistance = Math.hypot(dx, dy);
      if (localDistance > 0) {
        const instant = localDistance / dtSec;
        this.speedValue += (instant - this.speedValue) * 0.25;
        // 위에서 아래로 쓸어내리는 것이 털의 결 방향이다.
        this.grainValue += (dy / localDistance - this.grainValue) * 0.25;
      }
    }
    this.lastLocal = { ...sample.local };

    // 손이 강아지 밖으로 나가면 쓰다듬는 중이 아니라 그냥 드래그다.
    if (!zone) {
      return { petted: false, distance, dtSec, zone, ripple: null };
    }

    this.zone = zone;
    this.travelSinceRipple += distance;

    let ripple: Vec2 | null = null;
    if (this.travelSinceRipple > this.config.rippleDistance) {
      this.travelSinceRipple = 0;
      ripple = { ...sample.stage };
    }

    return { petted: true, distance, dtSec, zone, ripple };
  }

  release(): void {
    this.pressing = false;
    this.lastPoint = null;
    this.lastLocal = null;
    this.travelSinceRipple = 0;
  }

  clearHover(): void {
    this.zone = null;
  }
}

/** 속도 구간 */
export function speedBandOf(speed: number, config: DogEngineConfig): SpeedBand {
  if (speed < config.speedSlowMax) return 'slow';
  if (speed > config.speedFastMin) return 'fast';
  return 'mid';
}

const SPEED_ORDER: SpeedBand[] = ['slow', 'mid', 'fast'];

/**
 * 품종이 좋아하는 속도와 얼마나 맞는지 0..1.
 * 취향이 까다로운(speedTolerance가 낮은) 강아지일수록 어긋났을 때 크게 깎인다.
 */
export function speedFactorOf(
  breed: BreedProfile,
  speed: number,
  config: DogEngineConfig,
): number {
  const gap = Math.abs(
    SPEED_ORDER.indexOf(speedBandOf(speed, config)) -
      SPEED_ORDER.indexOf(breed.personality.prefSpeed),
  );
  const base = gap === 0 ? 1 : gap === 1 ? 0.72 : 0.42;
  let factor = 1 - (1 - base) * (2 - breed.personality.speedTolerance);
  if (speed > config.speedPanicMin) factor = Math.min(factor, 0.3);
  return Math.max(0.15, factor);
}

export function grainBandOf(grain: number): GrainBand {
  if (grain > 0.4) return 'with';
  if (grain < -0.4) return 'against';
  return 'across';
}

/** 털을 거슬러 올리면 만족도가 깎인다. */
export function grainFactorOf(grain: number): number {
  return 1 - 0.6 * Math.max(0, -grain);
}
