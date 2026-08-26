import type { DogEngineConfig } from './config';
import { hitTestZone, isPettableZone } from './petZones';
import type { PetZoneId, PointerSample, Vec2 } from './types';

/**
 * 쓰다듬기 판정기.
 *
 * "누른 상태 + 일정 거리 이상 이동"이라는 MVP 규칙을 담당하며,
 * 마우스인지 터치인지는 알지 못한다(Pointer Events로 이미 정규화된 샘플만 받는다).
 */
export interface PetGesture {
  /** 이번 샘플에서 쓰다듬기로 인정되었는지 */
  petted: boolean;
  /** 직전 샘플과의 이동 거리(px) */
  distance: number;
  /** 접촉한 부위 */
  zone: PetZoneId;
  /** 리플을 터뜨릴 위치(없으면 null) */
  ripple: Vec2 | null;
}

const NO_GESTURE: PetGesture = { petted: false, distance: 0, zone: 'none', ripple: null };

export class PetTracker {
  private pressing = false;
  private lastPoint: Vec2 | null = null;
  private travelSinceRipple = 0;
  private zone: PetZoneId = 'none';

  constructor(
    private config: DogEngineConfig,
    private coarsePointer = false,
  ) {}

  setConfig(config: DogEngineConfig, coarsePointer: boolean): void {
    this.config = config;
    this.coarsePointer = coarsePointer;
  }

  get isPressing(): boolean {
    return this.pressing;
  }

  get currentZone(): PetZoneId {
    return this.zone;
  }

  /**
   * 포인터를 눌렀을 때. 쓰다듬을 수 있는 영역이 아니면 누름으로 치지 않는다.
   * @returns 눌림이 시작되었는지
   */
  down(sample: PointerSample): boolean {
    const zone = hitTestZone(sample.local, this.coarsePointer);
    this.zone = zone;
    if (!isPettableZone(zone)) {
      this.pressing = false;
      this.lastPoint = null;
      return false;
    }
    this.pressing = true;
    this.lastPoint = { ...sample.stage };
    this.travelSinceRipple = 0;
    return true;
  }

  move(sample: PointerSample): PetGesture {
    const zone = hitTestZone(sample.local, this.coarsePointer);
    if (!this.pressing) {
      this.zone = zone;
      return { ...NO_GESTURE, zone };
    }

    const previous = this.lastPoint;
    const distance = previous
      ? Math.hypot(sample.stage.x - previous.x, sample.stage.y - previous.y)
      : 0;
    this.lastPoint = { ...sample.stage };

    if (distance <= this.config.petMoveThreshold) {
      return { petted: false, distance, zone, ripple: null };
    }

    // 손이 강아지 밖으로 나가면 쓰다듬는 중이 아니라 그냥 드래그다.
    if (!isPettableZone(zone)) {
      return { petted: false, distance, zone, ripple: null };
    }

    this.zone = zone;
    this.travelSinceRipple += distance;

    let ripple: Vec2 | null = null;
    if (this.travelSinceRipple > this.config.rippleDistance) {
      this.travelSinceRipple = 0;
      ripple = { ...sample.stage };
    }

    return { petted: true, distance, zone, ripple };
  }

  release(): void {
    this.pressing = false;
    this.lastPoint = null;
    this.travelSinceRipple = 0;
  }
}
