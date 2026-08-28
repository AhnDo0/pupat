import type { BreedShape } from './breeds';
import { clamp } from './dogState';
import type { Vec2 } from './types';

/**
 * 볼 스쿼시 (Phase 3).
 *
 * "이미지를 확대/축소하는 애니메이션"이 아니라 손끝의 위치가 곧 변형이 되는 물리 모델이다.
 * 누르는 동안에는 거의 지연 없이 포인터를 따라가고(단단한 스프링),
 * 손을 떼면 말랑한 물체처럼 한 번 튕겼다가(약한 감쇠) 제자리로 돌아온다.
 *
 * 이 모듈도 코어 규칙을 지킨다 — DOM도 React도 모르고, 시간은 호출자가 넘겨준다.
 */

export type CheekSide = 'l' | 'r';

/** 머리 타원의 중심(SVG viewBox 기준). 얼굴 파츠 좌표의 기준점이다. */
export const HEAD_CENTER: Vec2 = { x: 300, y: 268 };

/** 볼의 기준 원. 부위 판정과 변형이 같은 값을 공유한다. */
export interface CheekAnchor {
  side: CheekSide;
  cx: number;
  cy: number;
  r: number;
  /** 얼굴 중심 -> 볼 방향의 단위 벡터. 밀기(안쪽)와 당기기(바깥쪽)를 가른다. */
  outX: number;
  outY: number;
}

/** 인터랙션 튜닝값. 모두 SVG viewBox(600) 단위. */
export const SQUISH = {
  /** 누른 지점에서 이만큼 끌면 최대 깊이 */
  maxDrag: 74,
  /** 볼 살이 손끝을 따라가는 최대 거리 */
  maxOffset: 38,
  /** 누르기만 해도 들어가는 기본 깊이 */
  basePress: 0.3,
  /** 안쪽으로 밀 때 최대 압축(약 34%) */
  pushCompress: 0.34,
  /** 바깥으로 당길 때 최대 신장(약 30%) */
  pullStretch: 0.3,
  /** 눌린 축과 직각 방향으로 부풀어 오르는 비율 */
  perpRatio: 0.55,
  /** 볼 살이 손끝을 따라가는 비율 */
  follow: 0.62,
  /** hover 시 살짝 부푸는 정도 */
  hoverScale: 0.03,
  /** 머리 윤곽선이 밀리는 비율 */
  outlineFollow: 0.78,
  /** 압축될 때 윤곽선이 위아래로 부푸는 최대치(px) */
  outlineBulge: 30,
  /** 양쪽을 동시에 잡았을 때 얼굴이 늘어나는 최대 배율 */
  faceStretchMax: 0.09,
  /** 얼굴이 최대로 늘어나는 데 필요한 양쪽 합계 이동량(px) */
  faceStretchSpan: 56,
} as const;

const PRESS_STIFFNESS = 1400;
const PRESS_RATIO = 1;
const RELEASE_STIFFNESS = 210;
const RELEASE_RATIO = 0.32;
/** 모션 감소 모드에서는 튕김 없이 부드럽게만 돌아온다. */
const CALM_RELEASE_RATIO = 0.95;
const DEPTH_PRESS_STIFFNESS = 900;
const DEPTH_RELEASE_STIFFNESS = 260;
const HOVER_STIFFNESS = 320;
const HOVER_RATIO = 0.9;
const FACE_STIFFNESS = 260;
const FACE_RATIO = 0.55;

/** 이보다 작아지면 0으로 스냅해 불필요한 계산을 멈춘다. */
const REST_EPSILON = 0.02;

interface Spring {
  value: number;
  velocity: number;
}

function spring(): Spring {
  return { value: 0, velocity: 0 };
}

/**
 * 스프링 한 스텝. 프레임이 길어져도 발산하지 않도록 잘게 나눠 적분한다.
 * @param ratio 감쇠비 — 1이면 임계 감쇠(튕김 없음), 낮을수록 크게 튕긴다.
 */
function stepSpring(
  s: Spring,
  target: number,
  stiffness: number,
  ratio: number,
  dt: number,
): void {
  const damping = 2 * Math.sqrt(stiffness) * ratio;
  const steps = Math.min(10, Math.max(1, Math.ceil(dt / 0.005)));
  const h = dt / steps;
  for (let i = 0; i < steps; i += 1) {
    const accel = -stiffness * (s.value - target) - damping * s.velocity;
    s.velocity += accel * h;
    s.value += s.velocity * h;
  }
  if (target === 0 && Math.abs(s.value) < REST_EPSILON && Math.abs(s.velocity) < REST_EPSILON) {
    s.value = 0;
    s.velocity = 0;
  }
}

/** 볼 하나에 적용될 최종 변형값 */
export interface CheekDeform {
  /** 볼 살(흰 털·홍조) 그룹에 그대로 넣는 transform */
  transform: string;
  /** 머리 윤곽선을 밀어내는 양 */
  pushX: number;
  pushY: number;
  /** 눌린 쪽 윤곽선이 위아래로 부푸는 양 */
  bulge: number;
  /** 눌린 깊이 0..1 */
  depth: number;
  /** 얼굴 바깥쪽으로 당겨진 정도(px). 음수면 안쪽으로 밀린 것. */
  outward: number;
}

export const NEUTRAL_DEFORM: CheekDeform = {
  transform: 'translate(0 0)',
  pushX: 0,
  pushY: 0,
  bulge: 0,
  depth: 0,
  outward: 0,
};

/** 한 프레임의 스쿼시 결과 전체 */
export interface SquishFrame {
  left: CheekDeform;
  right: CheekDeform;
  /** 양쪽을 동시에 잡았을 때의 얼굴 늘이기 */
  faceScaleX: number;
  faceScaleY: number;
  /** 얼굴의 미세 반응 */
  squint: number;
  ear: number;
  headX: number;
  headRotation: number;
  /** 지금 볼을 만지고 있는지 */
  pressing: boolean;
}

export const NEUTRAL_SQUISH: SquishFrame = {
  left: NEUTRAL_DEFORM,
  right: NEUTRAL_DEFORM,
  faceScaleX: 1,
  faceScaleY: 1,
  squint: 0,
  ear: 0,
  headX: 0,
  headRotation: 0,
  pressing: false,
};

export function cheekAnchor(shape: BreedShape, side: CheekSide): CheekAnchor {
  // 주둥이를 피해 머리 옆면에 앉힌다. 머리 폭이 다른 품종에서도 같은 자리에 온다.
  const cx = HEAD_CENTER.x + (side === 'l' ? -1 : 1) * shape.headRx * 0.72;
  const cy = 296;
  const dx = cx - HEAD_CENTER.x;
  const dy = cy - HEAD_CENTER.y;
  const length = Math.hypot(dx, dy) || 1;
  return { side, cx, cy, r: 52, outX: dx / length, outY: dy / length };
}

/**
 * 볼 한쪽.
 *
 * 손끝이 누른 지점(origin)에서 얼마나 끌려갔는지를 목표값으로 삼고,
 * 위치(x, y)와 깊이(depth)를 각각 스프링으로 따라가게 한다.
 */
class Cheek {
  private x = spring();
  private y = spring();
  private depth = spring();
  private hover = spring();

  private targetX = 0;
  private targetY = 0;
  private targetDepth = 0;
  private origin: Vec2 | null = null;

  /** 이 볼을 잡고 있는 포인터. 두 손가락을 구분하는 유일한 수단이다. */
  pointerId: number | null = null;
  hovering = false;

  constructor(readonly side: CheekSide) {}

  get pressing(): boolean {
    return this.pointerId !== null;
  }

  /** 변형이 남아 있는지 — 아무것도 없으면 프레임 계산을 건너뛴다. */
  get idle(): boolean {
    return (
      !this.pressing &&
      this.x.value === 0 &&
      this.y.value === 0 &&
      this.depth.value === 0 &&
      this.hover.value === 0
    );
  }

  get depthValue(): number {
    return this.depth.value;
  }

  /** 볼이 얼굴 바깥쪽으로 끌려 나간 정도(px). 음수면 안쪽으로 밀린 것. */
  outwardOffset(anchor: CheekAnchor): number {
    return this.x.value * anchor.outX + this.y.value * anchor.outY;
  }

  grab(pointerId: number, local: Vec2): void {
    this.pointerId = pointerId;
    this.origin = { ...local };
    this.targetX = 0;
    this.targetY = 0;
    this.targetDepth = SQUISH.basePress;
  }

  drag(local: Vec2): void {
    if (!this.origin) return;
    const dx = local.x - this.origin.x;
    const dy = local.y - this.origin.y;
    const distance = Math.hypot(dx, dy);

    // 변형량은 0..1로 제한한다 — 얼굴이 비정상적으로 찌그러지지 않도록.
    const pull = clamp(distance / SQUISH.maxDrag, 0, 1);
    const reach = distance > 0 ? Math.min(distance, SQUISH.maxOffset) / distance : 0;
    this.targetX = dx * reach;
    this.targetY = dy * reach;
    this.targetDepth = clamp(SQUISH.basePress + (1 - SQUISH.basePress) * pull, 0, 1);
  }

  /** @returns 손을 뗀 순간의 깊이 — 랜덤 반응을 고를지 판단하는 데 쓴다. */
  release(): number {
    const depth = this.depth.value;
    this.pointerId = null;
    this.origin = null;
    this.targetX = 0;
    this.targetY = 0;
    this.targetDepth = 0;
    return depth;
  }

  step(dt: number, calm: boolean): void {
    const pressing = this.pressing;
    const stiffness = pressing ? PRESS_STIFFNESS : RELEASE_STIFFNESS;
    const ratio = pressing ? PRESS_RATIO : calm ? CALM_RELEASE_RATIO : RELEASE_RATIO;

    stepSpring(this.x, this.targetX, stiffness, ratio, dt);
    stepSpring(this.y, this.targetY, stiffness, ratio, dt);
    stepSpring(
      this.depth,
      this.targetDepth,
      pressing ? DEPTH_PRESS_STIFFNESS : DEPTH_RELEASE_STIFFNESS,
      ratio,
      dt,
    );
    stepSpring(this.hover, this.hovering && !pressing ? 1 : 0, HOVER_STIFFNESS, HOVER_RATIO, dt);
  }

  /** 스프링 값 -> 실제 변형. 누르는 방향에 따라 눌리거나 늘어난다. */
  deform(anchor: CheekAnchor): CheekDeform {
    const x = this.x.value;
    const y = this.y.value;
    const hover = this.hover.value;
    const depth = clamp(this.depth.value, 0, 1);
    const magnitude = Math.hypot(x, y);

    if (magnitude < 0.01 && depth < 0.001 && hover < 0.001) return NEUTRAL_DEFORM;

    // 방향이 없으면(누르기만 함) 얼굴 안쪽으로 눌린 것으로 본다.
    const ux = magnitude > 0.01 ? x / magnitude : -anchor.outX;
    const uy = magnitude > 0.01 ? y / magnitude : -anchor.outY;
    const outward = ux * anchor.outX + uy * anchor.outY;

    const axial =
      1 +
      depth * outward * (outward > 0 ? SQUISH.pullStretch : SQUISH.pushCompress) +
      hover * SQUISH.hoverScale;
    const perp = 1 - (axial - 1) * SQUISH.perpRatio + hover * SQUISH.hoverScale;

    // 볼은 얼굴에 붙어 있다. 안쪽 끝을 고정점으로 두어야 바깥쪽으로 늘어난다.
    const pivotX = anchor.cx - anchor.outX * anchor.r * 0.45;
    const pivotY = anchor.cy - anchor.outY * anchor.r * 0.45;
    const angle = (Math.atan2(uy, ux) * 180) / Math.PI;

    const tx = x * SQUISH.follow;
    const ty = y * SQUISH.follow;

    return {
      transform:
        `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) ` +
        `translate(${pivotX.toFixed(1)} ${pivotY.toFixed(1)}) rotate(${angle.toFixed(2)}) ` +
        `scale(${axial.toFixed(4)} ${perp.toFixed(4)}) ` +
        `rotate(${(-angle).toFixed(2)}) translate(${(-pivotX).toFixed(1)} ${(-pivotY).toFixed(1)})`,
      pushX: x * SQUISH.outlineFollow,
      pushY: y * SQUISH.outlineFollow * 0.7,
      bulge: depth * Math.max(0, -outward) * SQUISH.outlineBulge,
      depth,
      outward: outward * magnitude,
    };
  }
}

/** 손을 뗀 볼 하나의 결과 */
export interface CheekRelease {
  side: CheekSide;
  depth: number;
}

/**
 * 양쪽 볼을 함께 관리한다.
 * 포인터 ID로 구분하므로 두 손가락으로 동시에 잡을 수 있다.
 */
export class SquishField {
  private cheeks: Record<CheekSide, Cheek> = { l: new Cheek('l'), r: new Cheek('r') };
  private faceStretch = spring();
  private calm = false;

  setReducedMotion(reduced: boolean): void {
    this.calm = reduced;
  }

  get pressing(): boolean {
    return this.cheeks.l.pressing || this.cheeks.r.pressing;
  }

  /** 두 볼을 동시에 잡고 있는지 */
  get bothPressing(): boolean {
    return this.cheeks.l.pressing && this.cheeks.r.pressing;
  }

  /** 변형도 입력도 없는 상태 — 프레임 계산을 건너뛸 수 있다. */
  get idle(): boolean {
    return this.cheeks.l.idle && this.cheeks.r.idle && this.faceStretch.value === 0;
  }

  /** 가장 깊게 눌린 볼의 깊이 */
  get depth(): number {
    return Math.max(this.cheeks.l.depthValue, this.cheeks.r.depthValue);
  }

  isPressedBy(pointerId: number): boolean {
    return this.cheeks.l.pointerId === pointerId || this.cheeks.r.pointerId === pointerId;
  }

  setHover(side: CheekSide | null): void {
    this.cheeks.l.hovering = side === 'l';
    this.cheeks.r.hovering = side === 'r';
  }

  grab(side: CheekSide, pointerId: number, local: Vec2): void {
    this.cheeks[side].grab(pointerId, local);
  }

  drag(pointerId: number, local: Vec2): void {
    if (this.cheeks.l.pointerId === pointerId) this.cheeks.l.drag(local);
    if (this.cheeks.r.pointerId === pointerId) this.cheeks.r.drag(local);
  }

  /** @param pointerId 없으면(취소 등) 양쪽 모두 놓는다. */
  release(pointerId?: number): CheekRelease[] {
    const released: CheekRelease[] = [];
    for (const side of ['l', 'r'] as const) {
      const cheek = this.cheeks[side];
      if (!cheek.pressing) continue;
      if (pointerId !== undefined && cheek.pointerId !== pointerId) continue;
      released.push({ side, depth: cheek.release() });
    }
    return released;
  }

  step(dt: number, shape: BreedShape): void {
    this.cheeks.l.step(dt, this.calm);
    this.cheeks.r.step(dt, this.calm);
    stepSpring(this.faceStretch, this.stretchTarget(shape), FACE_STIFFNESS, FACE_RATIO, dt);
  }

  /** 스프링 상태 -> 이번 프레임에 그릴 값. */
  read(shape: BreedShape): SquishFrame {
    if (this.idle) return NEUTRAL_SQUISH;

    const left = this.cheeks.l.deform(cheekAnchor(shape, 'l'));
    const right = this.cheeks.r.deform(cheekAnchor(shape, 'r'));
    const stretch = this.faceStretch.value;
    const depth = Math.max(left.depth, right.depth);
    const pushSum = left.pushX + right.pushX;

    return {
      left,
      right,
      faceScaleX: 1 + stretch,
      faceScaleY: 1 - stretch * 0.6,
      // 볼을 누르면 눈을 살짝 감고 귀가 조금 움직인다. 볼보다 눈에 띄면 안 된다.
      squint: depth,
      ear: depth * 7,
      headX: clamp(pushSum * 0.12, -5, 5),
      headRotation: clamp(pushSum * 0.05, -3, 3),
      pressing: this.pressing,
    };
  }

  /**
   * 두 볼을 동시에 잡고 서로 반대로 벌린 만큼 얼굴 전체가 늘어난다.
   * 최대치를 두어 일러스트가 깨지지 않게 한다.
   */
  private stretchTarget(shape: BreedShape): number {
    if (!this.bothPressing) return 0;
    const spread =
      this.cheeks.l.outwardOffset(cheekAnchor(shape, 'l')) +
      this.cheeks.r.outwardOffset(cheekAnchor(shape, 'r'));
    return clamp(spread / SQUISH.faceStretchSpan, -1, 1) * SQUISH.faceStretchMax;
  }
}
