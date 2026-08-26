import { behaviorFor, mouthPathFor } from './dogBehavior';
import type { DogAction, DogPose, DogVisual } from './types';

/**
 * 보간된 숫자 → SVG 속성 값.
 * DOM을 만지지 않으므로 어떤 렌더러(React, Tauri WebView, 캔버스)에서도 재사용 가능하다.
 */
export function poseFrom(visual: DogVisual, action: DogAction): DogPose {
  const profile = behaviorFor(action);
  const blinking = visual.blinking && profile.allowBlink;

  const scaleX = (1 + visual.breathe * 0.5).toFixed(4);
  const scaleY = (1 - visual.breathe).toFixed(4);

  return {
    headTransform: `rotate(${visual.headRotation.toFixed(2)} 300 372) translate(${visual.headX.toFixed(1)} ${visual.headY.toFixed(1)})`,
    bodyTransform: `translate(300 548) scale(${scaleX} ${scaleY}) translate(-300 -548)`,
    tailTransform: `rotate(${visual.tailAngle.toFixed(2)} 420 412)`,
    earLeftTransform: `rotate(${visual.earAngle.toFixed(2)} 224 214)`,
    earRightTransform: `rotate(${(-visual.earAngle).toFixed(2)} 376 214)`,
    eyeShift: `translate(${visual.eyeX.toFixed(1)} ${visual.eyeY.toFixed(1)})`,
    eyesOpenOpacity: !blinking && profile.eyes === 'open' ? 1 : 0,
    eyesClosedOpacity: profile.eyes === 'closed' ? 1 : 0,
    eyesFlatOpacity: blinking || profile.eyes === 'flat' ? 1 : 0,
    blushOpacity: profile.blush ? 1 : 0,
    heartsOpacity: profile.hearts ? 1 : 0,
    zzzOpacity: profile.sleeping ? 1 : 0,
    mouthPath: mouthPathFor(profile),
  };
}
