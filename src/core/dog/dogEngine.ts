import { resolveConfig, type DogEngineConfig, type InputProfileId } from './config';
import { advanceVisual, createGazeTarget, createVisual, type GazeTarget } from './dogAnimation';
import { behaviorFor, shouldResetGaze } from './dogBehavior';
import { PetTracker } from './dogInteraction';
import { poseFrom } from './dogRender';
import {
  canTransition,
  clamp,
  createDogState,
  deriveMood,
  isPettingAction,
  markZone,
} from './dogState';
import type {
  DogAction,
  DogEvent,
  DogEventListener,
  DogPose,
  DogState,
  DogVisual,
  PointerSample,
} from './types';

/**
 * 리렌더 트리거용 이산 스냅샷.
 * 매 프레임 바뀌는 연속 값(머리 각도 등)은 여기 넣지 않는다.
 */
export interface DogSnapshot {
  action: DogAction;
  mood: DogState['mood'];
  zone: DogState['lastZone'];
  /** 초 단위로 내림한 누적 쓰담 시간 */
  petSeconds: number;
  petCount: number;
  /** 0..1, 소수 둘째 자리까지 */
  affection: number;
  pressing: boolean;
}

export interface DogEngineOptions {
  config?: Partial<DogEngineConfig>;
  profile?: InputProfileId;
  initialPetSeconds?: number;
}

/**
 * 강아지 인터랙션 엔진.
 *
 * 브라우저 API를 전혀 쓰지 않는다. 시간은 호출자가 넘겨주고(rAF 타임스탬프),
 * 입력은 정규화된 PointerSample로만 받는다.
 * 덕분에 Web / PWA / Tauri WebView / 테스트 환경에서 동일하게 동작한다.
 */
export class DogEngine {
  private config: DogEngineConfig;
  private configOverrides: Partial<DogEngineConfig>;
  private profile: InputProfileId;
  private state: DogState = createDogState();
  private visual: DogVisual = createVisual();
  private target: GazeTarget = createGazeTarget();
  private tracker: PetTracker;

  private listeners = new Set<DogEventListener>();
  private subscribers = new Set<() => void>();

  private elapsed = 0;
  private lastTick: number | null = null;
  private lastInputAt = 0;
  private lastPetMoveAt = 0;
  private petElapsed = 0;
  private nextBlinkAt = 0;
  private blinkUntil = 0;

  private snapshot: DogSnapshot;

  constructor(options: DogEngineOptions = {}) {
    this.profile = options.profile ?? 'fine';
    this.configOverrides = options.config ?? {};
    this.config = resolveConfig(this.configOverrides, this.profile);
    this.tracker = new PetTracker(this.config, this.profile === 'coarse');
    this.state.petSeconds = options.initialPetSeconds ?? 0;
    this.snapshot = this.buildSnapshot();
    this.nextBlinkAt = this.config.blinkIntervalMs;
  }

  // --------------------------------------------------------------- 설정/수명주기

  /** 입력 방식이 바뀌면(마우스 ↔ 터치) 같은 엔진에 프로파일만 갈아 끼운다. */
  setInputProfile(profile: InputProfileId): void {
    if (this.profile === profile) return;
    this.profile = profile;
    this.config = resolveConfig(this.configOverrides, profile);
    this.tracker.setConfig(this.config, profile === 'coarse');
  }

  setConfig(overrides: Partial<DogEngineConfig>): void {
    this.configOverrides = { ...this.configOverrides, ...overrides };
    this.config = resolveConfig(this.configOverrides, this.profile);
    this.tracker.setConfig(this.config, this.profile === 'coarse');
  }

  setReducedMotion(reduced: boolean): void {
    this.setConfig({ reducedMotion: reduced });
  }

  getInputProfile(): InputProfileId {
    return this.profile;
  }

  /** 오늘 기록을 복원할 때 사용 */
  restorePetSeconds(seconds: number): void {
    this.state.petSeconds = seconds;
    this.publish();
  }

  // -------------------------------------------------------------------- 이벤트

  on(listener: DogEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** React useSyncExternalStore용 */
  subscribe = (onStoreChange: () => void): (() => void) => {
    this.subscribers.add(onStoreChange);
    return () => {
      this.subscribers.delete(onStoreChange);
    };
  };

  getSnapshot = (): DogSnapshot => this.snapshot;

  private emit(event: DogEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  private buildSnapshot(): DogSnapshot {
    return {
      action: this.state.currentAction,
      mood: this.state.mood,
      zone: this.state.lastZone,
      petSeconds: Math.floor(this.state.petSeconds),
      petCount: this.state.petCount,
      affection: Math.round(clamp(this.state.affection, 0, 1) * 100) / 100,
      pressing: this.tracker.isPressing,
    };
  }

  /** 이산 값이 실제로 바뀌었을 때만 새 스냅샷을 만들어 구독자를 깨운다. */
  private publish(): void {
    const next = this.buildSnapshot();
    const prev = this.snapshot;
    if (
      prev.action === next.action &&
      prev.mood === next.mood &&
      prev.zone === next.zone &&
      prev.petSeconds === next.petSeconds &&
      prev.petCount === next.petCount &&
      prev.affection === next.affection &&
      prev.pressing === next.pressing
    ) {
      return;
    }
    this.snapshot = next;
    for (const subscriber of this.subscribers) subscriber();
  }

  // ---------------------------------------------------------------- 상태 전이

  private transition(action: DogAction): void {
    const previous = this.state.currentAction;
    if (previous === action) return;
    if (!canTransition(previous, action)) return;

    if (shouldResetGaze(action)) {
      this.target.headX = 0;
      this.target.headY = 0;
      this.target.headRotation = 0;
      this.target.eyeX = 0;
      this.target.eyeY = 0;
    }

    this.state.currentAction = action;
    this.state.mood = deriveMood(this.state);
    this.emit({ type: 'action', action, previous });
  }

  // ---------------------------------------------------------------- 포인터 입력

  pointerDown(sample: PointerSample): void {
    this.lastInputAt = sample.time;
    const started = this.tracker.down(sample);
    markZone(this.state, this.tracker.currentZone);
    if (!started && this.state.currentAction === 'sleepy') this.transition('looking');
    this.publish();
  }

  pointerMove(sample: PointerSample): void {
    this.lastInputAt = sample.time;
    this.aimGaze(sample);

    const gesture = this.tracker.move(sample);
    markZone(this.state, gesture.zone);

    if (gesture.petted) {
      this.state.affection = clamp(
        this.state.affection + gesture.distance / this.config.affectionDivisor,
        0,
        1,
      );
      this.lastPetMoveAt = sample.time;

      if (!isPettingAction(this.state.currentAction)) {
        this.petElapsed = 0;
        this.state.petCount += 1;
        this.transition('petting');
        this.emit({ type: 'petStart', zone: gesture.zone });
      }

      if (gesture.ripple) {
        this.emit({ type: 'ripple', at: gesture.ripple, zone: gesture.zone });
      }
    } else if (!isPettingAction(this.state.currentAction)) {
      this.transition('looking');
    }

    this.publish();
  }

  pointerUp(): void {
    this.tracker.release();
    this.petElapsed = 0;
    if (isPettingAction(this.state.currentAction)) {
      this.emit({ type: 'petEnd', seconds: this.state.petSeconds });
    }
    this.transition('looking');
    this.publish();
  }

  pointerLeave(): void {
    this.tracker.release();
    this.petElapsed = 0;
    if (isPettingAction(this.state.currentAction)) {
      this.emit({ type: 'petEnd', seconds: this.state.petSeconds });
    }
    this.transition('idle');
    this.publish();
  }

  /** 마우스/손가락 위치를 고개·시선 목표로 변환한다. */
  private aimGaze(sample: PointerSample): void {
    const c = this.config;
    const nx = sample.normal.x;
    const ny = sample.normal.y;
    this.target.headRotation = clamp(nx * c.headRotationGain, -c.headRotationMax, c.headRotationMax);
    this.target.headX = clamp(nx * c.headOffsetXGain, -c.headOffsetXMax, c.headOffsetXMax);
    this.target.headY = clamp(ny * c.headOffsetYGain, -c.headOffsetYMax, c.headOffsetYMax);
    this.target.eyeX = clamp(nx * c.eyeOffsetXGain, -c.eyeOffsetXMax, c.eyeOffsetXMax);
    this.target.eyeY = clamp(ny * c.eyeOffsetYGain, -c.eyeOffsetYMax, c.eyeOffsetYMax);
  }

  // ------------------------------------------------------------------ 프레임

  /**
   * 한 프레임 전진.
   * @param now 단조 증가 시간(ms). rAF 타임스탬프를 그대로 넘기면 된다.
   */
  update(now: number): void {
    const previous = this.lastTick ?? now;
    const dt = Math.min(48, now - previous) / 1000;
    this.lastTick = now;
    this.elapsed = now;

    // 첫 프레임에서 곧바로 졸거나 깜빡이지 않도록 기준 시각을 맞춰 준다.
    if (this.lastInputAt === 0) {
      this.lastInputAt = now;
      this.nextBlinkAt = now + this.config.blinkIntervalMs;
    }

    this.stepState(now, dt);
    this.stepBlink(now);

    advanceVisual(
      this.visual,
      this.target,
      behaviorFor(this.state.currentAction),
      dt,
      this.elapsed,
      this.config.reducedMotion ? 0.25 : 1,
    );

    this.publish();
  }

  private stepState(now: number, dt: number): void {
    const c = this.config;
    const sinceInput = now - this.lastInputAt;

    if (isPettingAction(this.state.currentAction)) {
      if (now - this.lastPetMoveAt > c.petReleaseMs) {
        this.petElapsed = 0;
        this.emit({ type: 'petEnd', seconds: this.state.petSeconds });
        this.transition('looking');
      } else {
        this.petElapsed += dt;
        this.state.petSeconds += dt;
        if (this.state.currentAction === 'petting' && this.petElapsed > c.happyAfterSec) {
          this.transition('happy');
        }
      }
    } else {
      this.state.affection = Math.max(0, this.state.affection - dt * c.affectionDecayPerSec);
      if (this.state.currentAction !== 'sleepy' && sinceInput > c.sleepAfterMs) {
        this.transition('sleepy');
      } else if (this.state.currentAction === 'looking' && sinceInput > c.lookingIdleMs) {
        this.transition('idle');
      }
    }

    this.state.attention = clamp(1 - sinceInput / c.lookingIdleMs, 0, 1);
    this.state.energy = clamp(1 - sinceInput / c.sleepAfterMs, 0, 1);
    this.state.mood = deriveMood(this.state);
  }

  private stepBlink(now: number): void {
    if (!behaviorFor(this.state.currentAction).allowBlink) {
      this.visual.blinking = false;
      return;
    }
    if (this.visual.blinking) {
      if (now >= this.blinkUntil) {
        this.visual.blinking = false;
        // 주기에 약간의 흔들림을 줘서 기계적으로 보이지 않게 한다.
        this.nextBlinkAt = now + this.config.blinkIntervalMs * (0.7 + Math.random() * 0.6);
      }
      return;
    }
    if (now >= this.nextBlinkAt) {
      this.visual.blinking = true;
      this.blinkUntil = now + this.config.blinkDurationMs;
    }
  }

  // ---------------------------------------------------------------------- 조회

  getState(): Readonly<DogState> {
    return this.state;
  }

  getVisual(): Readonly<DogVisual> {
    return this.visual;
  }

  getPose(): DogPose {
    return poseFrom(this.visual, this.state.currentAction);
  }

  /** 진행 바에 쓰는 애정도(0..1) */
  getAffection(): number {
    return clamp(this.state.affection, 0, 1);
  }
}
