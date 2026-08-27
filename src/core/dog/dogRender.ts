import { actOffsets, butterflyPos, type ActState } from './dogActs';
import { behaviorFor, mouthPathFor } from './dogBehavior';
import { createVisual } from './dogAnimation';
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
  /** 위상 계산용 누적 시간(ms) */
  elapsed: number;
  /** 모션 감소 배율 */
  motionScale: number;
}

const DEFAULT_EMOTE_COLOR = 'oklch(0.55 0.12 38)';

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
  return profileEyes;
}

export function poseFrom(visual: DogVisual, ctx: RenderContext): DogPose {
  const profile = behaviorFor(ctx.action);
  const act = actOffsets(ctx.act, ctx.motionScale);
  const blinking = visual.blinking && profile.allowBlink;

  const rotation = visual.headRotation + act.rotation;
  const headX = visual.headX + act.headX;
  const headY = visual.headY + act.headY + visual.lean * -6;
  const ear = visual.earAngle + act.ear;
  const hop = visual.hop + act.hop;

  const scaleX = (1 + visual.breathe * 0.5 + act.bodyScaleX).toFixed(4);
  const scaleY = (1 - visual.breathe).toFixed(4);

  const chasing = ctx.act?.name === 'butterfly';
  const butterfly = chasing
    ? butterflyPos(Math.min(1, ctx.act?.progress ?? 0))
    : { x: 300, y: 160, nx: 0 };
  const flap = 1 + Math.sin(ctx.elapsed / 60) * 0.35;

  const eyes = eyeVariant(ctx, profile.eyes, blinking, act.eyes);
  const zone = ctx.zone;

  return {
    headTransform: `rotate(${rotation.toFixed(2)} 300 372) translate(${headX.toFixed(1)} ${headY.toFixed(1)})`,
    bodyTransform: `translate(300 548) scale(${scaleX} ${scaleY}) translate(-300 -548)`,
    hopTransform: `translate(0 ${hop.toFixed(1)})`,
    tailTransform: `rotate(${visual.tailAngle.toFixed(2)} 420 412)`,
    earLeftTransform: `rotate(${ear.toFixed(2)} 224 214)`,
    earRightTransform: `rotate(${(-ear).toFixed(2)} 376 214)`,
    pawLeftTransform: `translate(0 ${(-(visual.pawLift + act.pawLeft) * 12).toFixed(1)})`,
    pawRightTransform: `translate(0 ${(-(visual.pawLift + act.pawRight) * 12).toFixed(1)})`,
    eyeShift: `translate(${(visual.eyeX + (chasing ? butterfly.nx * 7 : 0)).toFixed(1)} ${visual.eyeY.toFixed(1)})`,
    eyeRy: ctx.action === 'bliss' ? 22 : 19,
    eyesOpenOpacity: eyes === 'open' ? 1 : 0,
    eyesClosedOpacity: eyes === 'closed' ? 1 : 0,
    eyesFlatOpacity: eyes === 'flat' ? 1 : 0,
    blushOpacity: profile.blush ? 1 : 0,
    heartsOpacity: ctx.action === 'bliss' ? 1 : profile.hearts ? 0.7 : 0,
    zzzOpacity: profile.sleeping ? 1 : 0,
    mouthPath: act.mouth ?? mouthPathFor(profile),
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
export function restingPose(): DogPose {
  return poseFrom(createVisual(), {
    action: 'idle',
    act: null,
    emote: null,
    zone: null,
    zoneVisible: false,
    pressing: false,
    activeZone: 'none',
    elapsed: 0,
    motionScale: 1,
  });
}
