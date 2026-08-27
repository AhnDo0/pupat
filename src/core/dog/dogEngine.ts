import {
  BREEDS,
  DEFAULT_BREED_ID,
  likeOf,
  type BreedId,
  type BreedProfile,
} from './breeds';
import { resolveConfig, type DogEngineConfig, type InputProfileId } from './config';
import {
  actEmote,
  advanceAct,
  isCalmAct,
  startAct,
  type ActName,
  type ActState,
} from './dogActs';
import { advanceVisual, createTargets, createVisual, type VisualTargets } from './dogAnimation';
import { behaviorFor, shouldResetGaze } from './dogBehavior';
import {
  grainBandOf,
  grainFactorOf,
  PetTracker,
  speedBandOf,
  speedFactorOf,
} from './dogInteraction';
import { poseFrom } from './dogRender';
import {
  canTransition,
  clamp,
  createDogState,
  deriveMood,
  isPettingAction,
  isPleasedAction,
  markZone,
} from './dogState';
import { topic } from './korean';
import { zoneName, type PetZone } from './petZones';
import type {
  DogAction,
  DogEvent,
  DogEventListener,
  DogPose,
  DogState,
  DogVisual,
  GrainBand,
  PetZoneId,
  PointerSample,
  SpeedBand,
} from './types';

/** 분석 패널에서 값을 칠하는 색조 */
export type Tone = 'plain' | 'good' | 'bad';

/** 손길 만족도를 사람 말로 옮긴 등급 */
export type QualityBand = 'none' | 'reject' | 'plain' | 'good' | 'best';

/**
 * 리렌더 트리거용 이산 스냅샷.
 * 매 프레임 바뀌는 연속 값(머리 각도 등)은 여기 넣지 않는다.
 */
export interface DogSnapshot {
  action: DogAction;
  mood: DogState['mood'];
  breed: BreedId;
  /** 커서가 올라가 있는 부위 */
  zone: PetZoneId;
  /** 지금 쓰다듬고 있는 부위 */
  activeZone: PetZoneId;
  /** 커서가 올라간 부위를 이 강아지가 싫어하는지 */
  zoneDisliked: boolean;
  /** 초 단위로 내림한 누적 쓰담 시간 */
  petSeconds: number;
  petCount: number;
  /** 0..1, 소수 둘째 자리까지 */
  affection: number;
  pressing: boolean;
  /** 쓰다듬는 중일 때만 채워지는 분석 값 */
  speedBand: SpeedBand | null;
  speedTone: Tone;
  grainBand: GrainBand | null;
  grainTone: Tone;
  quality: QualityBand;
  /** 진행 중인 idle/랜덤 행동 */
  act: ActName | null;
}

export interface DogEngineOptions {
  config?: Partial<DogEngineConfig>;
  profile?: InputProfileId;
  initialPetSeconds?: number;
  breed?: BreedId;
}

interface EmoteState {
  icon: string;
  color: string;
  until: number;
}

const EMOTE_HAPPY = { icon: '♥', color: 'oklch(0.55 0.12 38)', ms: 1400 };
const EMOTE_BLISS = { icon: '♪', color: 'oklch(0.56 0.12 300)', ms: 2000 };
const EMOTE_ANNOYED = { icon: '!', color: 'oklch(0.58 0.16 28)', ms: 1500 };
const EMOTE_CURIOUS = { icon: '?', color: 'oklch(0.6 0.06 70)', ms: 1000 };

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
  private breedId: BreedId;
  private state: DogState = createDogState();
  private visual: DogVisual = createVisual();
  private target: VisualTargets = createTargets();
  private tracker: PetTracker;

  private listeners = new Set<DogEventListener>();
  private subscribers = new Set<() => void>();

  private elapsed = 0;
  private lastTick: number | null = null;
  private lastInputAt = 0;
  private lastPetMoveAt = 0;
  private strokeStartedAt = 0;
  private petElapsed = 0;
  private nextBlinkAt = 0;
  private blinkUntil = 0;
  private cursorOn = false;

  private act: ActState | null = null;
  private nextActAt = 0;
  private emote: EmoteState | null = null;

  private snapshot: DogSnapshot;

  constructor(options: DogEngineOptions = {}) {
    this.profile = options.profile ?? 'fine';
    this.configOverrides = options.config ?? {};
    this.config = resolveConfig(this.configOverrides, this.profile);
    this.breedId = options.breed ?? DEFAULT_BREED_ID;
    this.tracker = new PetTracker(this.config, this.breed(), this.profile === 'coarse');
    this.state.petSeconds = options.initialPetSeconds ?? 0;
    this.snapshot = this.buildSnapshot();
    this.nextBlinkAt = this.config.blinkIntervalMs;
  }

  // --------------------------------------------------------------- 설정/수명주기

  /** 입력 방식이 바뀌면(마우스 <-> 터치) 같은 엔진에 프로파일만 갈아 끼운다. */
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

  // ------------------------------------------------------------------------ 품종

  breed(): BreedProfile {
    return BREEDS[this.breedId];
  }

  getBreedId(): BreedId {
    return this.breedId;
  }

  /** 다른 강아지를 데려온다. 친밀도는 처음부터 다시 쌓아야 한다. */
  setBreed(id: BreedId): void {
    if (this.breedId === id) return;
    this.breedId = id;
    this.tracker.setBreed(this.breed());
    this.act = null;
    this.state.activeZone = 'none';
    this.state.hoverZone = 'none';
    this.state.quality = 0;
    this.state.affection = Math.min(this.state.affection, 0.45);
    this.setEmote(EMOTE_CURIOUS.icon, EMOTE_CURIOUS.ms, EMOTE_CURIOUS.color);
    this.transition('looking');
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

  private log(text: string, kind: 'good' | 'soft' | 'bad'): void {
    this.emit({ type: 'log', text, kind });
  }

  private qualityBand(): QualityBand {
    const q = this.state.quality;
    if (q < -0.05) return 'reject';
    if (q > 0.85) return 'best';
    if (q > 0.45) return 'good';
    if (q > 0) return 'plain';
    return 'none';
  }

  private buildSnapshot(): DogSnapshot {
    const pressing = this.tracker.isPressing;
    const speedFactor = speedFactorOf(this.breed(), this.state.speed, this.config);
    const grainFactor = grainFactorOf(this.state.grain);

    return {
      action: this.state.currentAction,
      mood: this.state.mood,
      breed: this.breedId,
      zone: this.state.hoverZone,
      activeZone: this.state.activeZone,
      zoneDisliked:
        this.state.hoverZone !== 'none' && likeOf(this.breed(), this.state.hoverZone) < 0,
      petSeconds: Math.floor(this.state.petSeconds),
      petCount: this.state.petCount,
      affection: Math.round(clamp(this.state.affection, 0, 1) * 100) / 100,
      pressing,
      speedBand: pressing ? speedBandOf(this.state.speed, this.config) : null,
      speedTone: speedFactor > 0.85 ? 'good' : speedFactor < 0.55 ? 'bad' : 'plain',
      grainBand: pressing ? grainBandOf(this.state.grain) : null,
      grainTone: grainFactor < 0.8 ? 'bad' : 'plain',
      quality: this.qualityBand(),
      act: this.act?.name ?? null,
    };
  }

  /** 이산 값이 실제로 바뀌었을 때만 새 스냅샷을 만들어 구독자를 깨운다. */
  private publish(): void {
    const next = this.buildSnapshot();
    const prev = this.snapshot;
    if (
      prev.action === next.action &&
      prev.mood === next.mood &&
      prev.breed === next.breed &&
      prev.zone === next.zone &&
      prev.activeZone === next.activeZone &&
      prev.zoneDisliked === next.zoneDisliked &&
      prev.petSeconds === next.petSeconds &&
      prev.petCount === next.petCount &&
      prev.affection === next.affection &&
      prev.pressing === next.pressing &&
      prev.speedBand === next.speedBand &&
      prev.speedTone === next.speedTone &&
      prev.grainBand === next.grainBand &&
      prev.grainTone === next.grainTone &&
      prev.quality === next.quality &&
      prev.act === next.act
    ) {
      return;
    }
    this.snapshot = next;
    for (const subscriber of this.subscribers) subscriber();
  }

  // ---------------------------------------------------------------- 상태 전이

  private setEmote(icon: string | null, ms: number, color: string): void {
    this.emote = icon ? { icon, color, until: this.elapsed + ms } : null;
  }

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
    this.onEnter(action);
    this.emit({ type: 'action', action, previous });
  }

  /** 상태에 들어설 때의 연출 — 말풍선과 반응 기록. */
  private onEnter(action: DogAction): void {
    const name = zoneName(this.state.activeZone) ?? '몸';

    switch (action) {
      case 'happy':
        this.setEmote(EMOTE_HAPPY.icon, EMOTE_HAPPY.ms, EMOTE_HAPPY.color);
        this.log(`${name} 쓰담이 마음에 들어요`, 'good');
        break;
      case 'bliss':
        this.setEmote(EMOTE_BLISS.icon, EMOTE_BLISS.ms, EMOTE_BLISS.color);
        this.log('완전히 녹았어요', 'good');
        break;
      case 'annoyed': {
        this.setEmote(EMOTE_ANNOYED.icon, EMOTE_ANNOYED.ms, EMOTE_ANNOYED.color);
        this.act = null;
        const reason =
          grainFactorOf(this.state.grain) < 0.7
            ? '털 반대 방향은 싫어요'
            : speedFactorOf(this.breed(), this.state.speed, this.config) < 0.5
              ? '손이 너무 빨라요'
              : `${topic(name)} 만지지 말아 주세요`;
        this.log(reason, 'bad');
        break;
      }
      case 'sleepy':
        this.emote = null;
        this.act = null;
        break;
      default:
        break;
    }
  }

  // ---------------------------------------------------------------- 포인터 입력

  pointerDown(sample: PointerSample): void {
    this.lastInputAt = sample.time;
    this.cursorOn = true;
    const started = this.tracker.down(sample);
    this.syncZones();
    if (!started && this.state.currentAction === 'sleepy') this.transition('looking');
    this.publish();
  }

  pointerMove(sample: PointerSample): void {
    this.lastInputAt = sample.time;
    this.cursorOn = true;
    this.aimGaze(sample);

    const gesture = this.tracker.move(sample);
    this.state.speed = this.tracker.speed;
    this.state.grain = this.tracker.grain;
    this.syncZones();

    if (gesture.petted && gesture.zone) {
      this.applyStroke(gesture.zone, gesture.dtSec, sample.time);
      if (gesture.ripple) {
        this.emit({
          type: 'ripple',
          at: gesture.ripple,
          zone: gesture.zone.id,
          good: this.state.quality >= 0,
        });
      }
    } else if (!isPettingAction(this.state.currentAction)) {
      this.transition('looking');
    }

    this.publish();
  }

  pointerUp(): void {
    this.tracker.release();
    this.endStroke();
    this.transition('looking');
    this.publish();
  }

  pointerLeave(): void {
    this.tracker.release();
    this.tracker.clearHover();
    this.cursorOn = false;
    this.endStroke();
    this.syncZones();
    this.transition('idle');
    this.publish();
  }

  private endStroke(): void {
    if (isPleasedAction(this.state.currentAction)) {
      this.emit({ type: 'petEnd', seconds: this.state.petSeconds });
    }
    this.petElapsed = 0;
    this.strokeStartedAt = 0;
    this.state.activeZone = 'none';
  }

  private syncZones(): void {
    const zone = this.tracker.currentZone;
    this.state.hoverZone = zone ? zone.id : 'none';
    markZone(this.state, this.state.hoverZone);
  }

  /**
   * 쓰다듬기 1샘플.
   * 부위 호감도 x 속도 x 방향으로 만족도를 구하고, 그 값이 기분을 끌어올린다.
   * 프레임이 아니라 입력에서 곧바로 판정하므로 반응이 프레임 레이트에 흔들리지 않는다.
   */
  private applyStroke(zone: PetZone, dtSec: number, time: number): void {
    const c = this.config;
    const breed = this.breed();

    // 손을 잠깐 멈췄다가 다시 움직이면 새 쓰담으로 친다.
    if (!this.strokeStartedAt || time - this.lastPetMoveAt > c.petReleaseMs) {
      this.strokeStartedAt = time;
      this.state.quality = 0;
    }
    this.lastPetMoveAt = time;
    this.state.activeZone = zone.id;

    const quality =
      likeOf(breed, zone.id) *
      speedFactorOf(breed, this.state.speed, c) *
      grainFactorOf(this.state.grain);

    this.state.quality += (quality - this.state.quality) * Math.min(1, dtSec * 6 + 0.12);

    // 쓰담 시간도 프레임이 아니라 입력에서 누적한다.
    // (탭이 백그라운드라 rAF가 느려져도 실제로 만진 시간은 그대로 쌓인다)
    const step = Math.min(0.12, dtSec);
    this.state.petSeconds += step;
    this.state.affection = clamp(
      this.state.affection + quality * step * c.affectionGainPerSec,
      0,
      1,
    );
    this.petElapsed = (time - this.strokeStartedAt) / 1000;

    // 싫어하는 손길이면 기분이 오르지 않는다.
    if (quality < 0) {
      this.transition('annoyed');
      return;
    }

    const action = this.state.currentAction;
    if (action === 'annoyed' || action === 'idle' || action === 'looking' || action === 'sleepy') {
      this.act = null;
      this.state.petCount += 1;
      this.transition('petting');
      this.emit({ type: 'petStart', zone: zone.id });
      return;
    }

    if (action === 'petting' && this.petElapsed > c.happyAfterSec) {
      const melting = this.state.affection > c.blissAffection && quality > c.blissQuality;
      this.transition(melting ? 'bliss' : 'happy');
    } else if (
      action === 'happy' &&
      this.state.affection > 0.76 &&
      quality > 0.9 &&
      this.petElapsed > c.blissAfterSec
    ) {
      this.transition('bliss');
    }
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

  // -------------------------------------------------------------- idle/랜덤 행동

  private scheduleAct(now: number): void {
    const p = this.breed().personality;
    const pool = Math.random() < this.config.randomActChance ? p.randomActs : p.idleActs;
    const allowed = this.config.reducedMotion ? pool.filter(isCalmAct) : pool;
    if (allowed.length === 0) {
      this.nextActAt = now + p.actEveryMs[1];
      return;
    }

    const name = allowed[Math.floor(Math.random() * allowed.length)];
    this.act = startAct(name);
    const emote = actEmote(name);
    if (emote) this.setEmote(emote.icon, emote.durationMs, emote.color);
    this.emit({ type: 'act', name });

    const [min, max] = p.actEveryMs;
    this.nextActAt = now + min + Math.random() * (max - min) + this.act.duration * 1000;
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
      this.nextActAt = now + 4000;
    }

    this.act = advanceAct(this.act, dt);
    if (this.emote && now > this.emote.until) this.emote = null;

    this.stepState(now, dt);
    this.stepBlink(now);
    this.aimBody();

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
        // 손이 멈췄다 -> 쓰다듬기가 끝난 것으로 본다.
        this.endStroke();
        this.transition('looking');
      } else {
        this.petElapsed = (now - (this.strokeStartedAt || now)) / 1000;
      }
    } else {
      this.tracker.decay(dt);
      this.state.speed = this.tracker.speed;
      this.state.grain = this.tracker.grain;
      this.state.quality += (0 - this.state.quality) * Math.min(1, dt * 2);
      this.state.affection = Math.max(0, this.state.affection - dt * c.affectionDecayPerSec);

      if (this.state.currentAction !== 'sleepy' && sinceInput > c.sleepAfterMs) {
        this.transition('sleepy');
      } else if (this.state.currentAction === 'looking' && sinceInput > c.lookingIdleMs) {
        this.transition('idle');
      }

      const resting = this.state.currentAction === 'idle' || this.state.currentAction === 'looking';
      if (c.actsEnabled && resting && !this.act && !this.tracker.isPressing && now > this.nextActAt) {
        this.scheduleAct(now);
      }
    }

    this.state.attention = clamp(1 - sinceInput / c.lookingIdleMs, 0, 1);
    this.state.energy = clamp(1 - sinceInput / c.sleepAfterMs, 0, 1);
    this.state.mood = deriveMood(this.state);
  }

  /** 상태와 만지는 부위에서 귀·앞발·기울임의 목표값을 정한다. */
  private aimBody(): void {
    const profile = behaviorFor(this.state.currentAction);
    this.target.ear = this.state.activeZone === 'ear' ? 26 : profile.earTarget;
    this.target.pawLift = this.state.activeZone === 'belly' && this.state.quality > 0.3 ? 1 : 0;
    this.target.lean = profile.lean;
  }

  private stepBlink(now: number): void {
    if (!behaviorFor(this.state.currentAction).allowBlink || this.act) {
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
    return poseFrom(this.visual, {
      action: this.state.currentAction,
      act: this.act,
      emote: this.emote,
      zone: this.tracker.currentZone,
      zoneVisible: this.cursorOn,
      pressing: this.tracker.isPressing,
      activeZone: this.state.activeZone,
      elapsed: this.elapsed,
      motionScale: this.config.reducedMotion ? 0.25 : 1,
    });
  }

  /** 진행 바에 쓰는 애정도(0..1) */
  getAffection(): number {
    return clamp(this.state.affection, 0, 1);
  }
}
