import { actOffsets, butterflyPos, type ActState } from './dogActs';
import { behaviorFor, mouthPathFor } from './dogBehavior';
import { createVisual } from './dogAnimation';
import {
  NEUTRAL_DEFORM,
  NEUTRAL_SQUISH,
  type CheekDeform,
  type SquishFrame,
} from './dogSquish';
import { isPleasedAction } from './dogState';
import type { PetZone } from './petZones';
import type { DogAction, DogPose, DogVisual, EyeVariant, PetZoneId } from './types';

/**
 * 보간된 숫자 -> SVG 속성 값.
 * DOM을 만지지 않으므로 어떤 렌더러(React, Tauri WebView, 캔버스)에서도 재사용 가능하다.
 */
export interface RenderContext {
  action: DogAction;
  /** 진행 중인 idle/랜덤 행동 */
  act: ActState | null;
  /** 말풍선 */
  emote: { icon: string; color: string } | null;
  /** 커서가 올라가 있는 부위 */
  zone: PetZone | null;
  /** 부위 하이라이트를 보여줄지(커서가 무대 안에 있을 때만) */
  zoneVisible: boolean;
  pressing: boolean;
  /** 지금 쓰다듬고 있는 부위 */
  activeZone: PetZoneId;
  /** 볼 스쿼시 상태 */
  squish: SquishFrame;
  /** 머리 타원의 반지름 — 윤곽선을 다시 그릴 때 필요하다 */
  headRx: number;
  headRy: number;
  /** 위상 계산용 누적 시간(ms) */
  elapsed: number;
  /** 모션 감소 배율 */
  motionScale: number;
}

const DEFAULT_EMOTE_COLOR = 'oklch(0.55 0.12 38)';

/** 머리 타원의 중심(SVG viewBox 기준) */
const HEAD_CX = 300;
const HEAD_CY = 268;

/** 타원을 4개의 3차 베지어로 그릴 때의 제어점 비율 */
const KAPPA = 0.5523;

/** 볼을 눌렀을 때 입이 살짝 오므라든다 */
const SQUISH_MOUTH = 'M284 314 Q 300 330 316 314';
const SQUISH_MOUTH_FROM = 0.45;
/** 이보다 깊게 눌리면 눈을 가늘게 뜬다 */
const SQUINT_FLAT_FROM = 0.55;

/**
 * 머리 윤곽선.
 *
 * 평소에는 원래의 타원과 완전히 같은 경로를 만들고,
 * 볼이 눌리면 그 옆면의 정점과 제어점만 밀어 낸다.
 * 덕분에 일러스트를 바꾸지 않고도 얼굴 자체가 말랑하게 눌린다.
 */
/** 볼을 만지지 않는 대부분의 프레임에서 같은 문자열을 다시 만들지 않도록. */
const restingOutlines = new Map<string, string>();

export function headOutlinePath(
  rx: number,
  ry: number,
  left: CheekDeform,
  right: CheekDeform,
): string {
  const resting = left === NEUTRAL_DEFORM && right === NEUTRAL_DEFORM;
  if (resting) {
    const cached = restingOutlines.get(`${rx}:${ry}`);
    if (cached) return cached;
  }

  const hx = rx * KAPPA;
  const hy = ry * KAPPA;

  // 옆면 정점: 손끝을 따라 밀린다.
  const rX = HEAD_CX + rx + right.pushX;
  const rY = HEAD_CY + right.pushY;
  const lX = HEAD_CX - rx + left.pushX;
  const lY = HEAD_CY + left.pushY;

  // 위/아래로 이어지는 제어점: 눌린 만큼 바깥으로 부풀어(bulge) 부피를 지킨다.
  const rTopY = HEAD_CY - hy - right.bulge + right.pushY * 0.7;
  const rBottomY = HEAD_CY + hy + right.bulge + right.pushY * 0.7;
  const lTopY = HEAD_CY - hy - left.bulge + left.pushY * 0.7;
  const lBottomY = HEAD_CY + hy + left.bulge + left.pushY * 0.7;

  // 정수리/턱 쪽 제어점은 아주 조금만 따라간다.
  const rTopX = HEAD_CX + hx + right.pushX * 0.3;
  const lTopX = HEAD_CX - hx + left.pushX * 0.3;

  const n = (value: number) => value.toFixed(1);

  const path =
    `M${HEAD_CX} ${n(HEAD_CY - ry)} ` +
    `C${n(rTopX)} ${n(HEAD_CY - ry)} ${n(rX)} ${n(rTopY)} ${n(rX)} ${n(rY)} ` +
    `C${n(rX)} ${n(rBottomY)} ${n(rTopX)} ${n(HEAD_CY + ry)} ${HEAD_CX} ${n(HEAD_CY + ry)} ` +
    `C${n(lTopX)} ${n(HEAD_CY + ry)} ${n(lX)} ${n(lBottomY)} ${n(lX)} ${n(lY)} ` +
    `C${n(lX)} ${n(lTopY)} ${n(lTopX)} ${n(HEAD_CY - ry)} ${HEAD_CX} ${n(HEAD_CY - ry)} Z`;

  if (resting) restingOutlines.set(`${rx}:${ry}`, path);
  return path;
}

function eyeVariant(
  ctx: RenderContext,
  profileEyes: EyeVariant,
  blinking: boolean,
  actEyes: EyeVariant | null,
): EyeVariant {
  if (actEyes) return actEyes;
  // 꼬리를 만지면 눈을 감지 않고 뒤를 돌아본다.
  if (isPleasedAction(ctx.action) && ctx.activeZone === 'tail') return blinking ? 'flat' : 'open';
  if (profileEyes === 'open' && blinking) return 'flat';
  // 볼을 꾹 누르면 눈이 가늘어진다.
  if (profileEyes === 'open' && ctx.squish.squint > SQUINT_FLAT_FROM) return 'flat';
  return profileEyes;
}

export function poseFrom(visual: DogVisual, ctx: RenderContext): DogPose {
  const profile = behaviorFor(ctx.action);
  const act = actOffsets(ctx.act, ctx.motionScale);
  const squish = ctx.squish;
  const blinking = visual.blinking && profile.allowBlink;

  const rotation = visual.headRotation + act.rotation + squish.headRotation;
  const headX = visual.headX + act.headX + squish.headX;
  const headY = visual.headY + act.headY + visual.lean * -6;
  const ear = visual.earAngle + act.ear + squish.ear;
  const hop = visual.hop + act.hop;

  const scaleX = (1 + visual.breathe * 0.5 + act.bodyScaleX).toFixed(4);
  const scaleY = (1 - visual.breathe).toFixed(4);

  const chasing = ctx.act?.name === 'butterfly';
  const butterfly = chasing
    ? butterflyPos(Math.min(1, ctx.act?.progress ?? 0))
    : { x: 300, y: 160, nx: 0 };
  const flap = 1 + Math.sin(ctx.elapsed / 60) * 0.35;

  const eyes = eyeVariant(ctx, profile.eyes, blinking, act.eyes);
  const eyeRy = (ctx.action === 'bliss' ? 22 : 19) * (1 - squish.squint * 0.5);
  const zone = ctx.zone;

  const mouth =
    act.mouth ??
    (squish.squint > SQUISH_MOUTH_FROM ? SQUISH_MOUTH : mouthPathFor(profile));

  return {
    headTransform: `rotate(${rotation.toFixed(2)} 300 372) translate(${headX.toFixed(1)} ${headY.toFixed(1)})`,
    headPath: headOutlinePath(ctx.headRx, ctx.headRy, squish.left, squish.right),
    faceTransform: `translate(300 268) scale(${squish.faceScaleX.toFixed(4)} ${squish.faceScaleY.toFixed(4)}) translate(-300 -268)`,
    cheekLeftTransform: squish.left.transform,
    cheekRightTransform: squish.right.transform,
    bodyTransform: `translate(300 548) scale(${scaleX} ${scaleY}) translate(-300 -548)`,
    hopTransform: `translate(0 ${hop.toFixed(1)})`,
    tailTransform: `rotate(${(visual.tailAngle + act.tail).toFixed(2)} 420 412)`,
    earLeftTransform: `rotate(${ear.toFixed(2)} 224 214)`,
    earRightTransform: `rotate(${(-ear).toFixed(2)} 376 214)`,
    pawLeftTransform: `translate(0 ${(-(visual.pawLift + act.pawLeft) * 12).toFixed(1)})`,
    pawRightTransform: `translate(0 ${(-(visual.pawLift + act.pawRight) * 12).toFixed(1)})`,
    eyeShift: `translate(${(visual.eyeX + (chasing ? butterfly.nx * 7 : 0)).toFixed(1)} ${visual.eyeY.toFixed(1)})`,
    eyeRy: Math.round(eyeRy * 100) / 100,
    eyesOpenOpacity: eyes === 'open' ? 1 : 0,
    eyesClosedOpacity: eyes === 'closed' ? 1 : 0,
    eyesFlatOpacity: eyes === 'flat' ? 1 : 0,
    blushOpacity: profile.blush ? 1 : 0,
    heartsOpacity: ctx.action === 'bliss' ? 1 : profile.hearts ? 0.7 : 0,
    zzzOpacity: profile.sleeping ? 1 : 0,
    mouthPath: mouth,
    tongueOpacity: act.tongue || (profile.tongue ? 1 : 0),
    zoneCx: zone ? zone.cx : 300,
    zoneCy: zone ? zone.cy : 300,
    zoneR: zone ? zone.r * 0.86 : 60,
    zoneOpacity: zone && ctx.zoneVisible ? (ctx.pressing ? 0.2 : 0.1) : 0,
    emoteOpacity: ctx.emote ? 1 : 0,
    emoteIcon: ctx.emote?.icon ?? '',
    emoteColor: ctx.emote?.color ?? DEFAULT_EMOTE_COLOR,
    emoteTransform: `translate(${(452 + headX * 0.3).toFixed(1)} ${(168 + headY * 0.3).toFixed(1)})`,
    butterflyOpacity: chasing ? 1 : 0,
    butterflyTransform: `translate(${butterfly.x.toFixed(1)} ${butterfly.y.toFixed(1)})`,
    wingLeftPath: `M0 0 C -${(26 * flap).toFixed(1)} -18 -${(30 * flap).toFixed(1)} 6 -4 10 Z`,
    wingRightPath: `M0 0 C ${(26 * flap).toFixed(1)} -18 ${(30 * flap).toFixed(1)} 6 4 10 Z`,
  };
}

/** 서버 렌더/첫 페인트에 쓰는 정지 포즈 */
export function restingPose(headRx = 132, headRy = 118): DogPose {
  return poseFrom(createVisual(), {
    action: 'idle',
    act: null,
    emote: null,
    zone: null,
    zoneVisible: false,
    pressing: false,
    activeZone: 'none',
    squish: NEUTRAL_SQUISH,
    headRx,
    headRy,
    elapsed: 0,
    motionScale: 1,
  });
}
