import type { BehaviorProfile } from './dogBehavior';
import type { DogVisual } from './types';

/**
 * 연속 값 보간. 프레임 레이트에 의존하지 않도록 dt 기반 지수 감쇠를 쓴다.
 * (디자인 시안과 동일한 계수: k = 1 - 0.001^dt)
 */

export interface GazeTarget {
  headX: number;
  headY: number;
  headRotation: number;
  eyeX: number;
  eyeY: number;
}

export function createVisual(): DogVisual {
  return {
    headX: 0,
    headY: 0,
    headRotation: 0,
    eyeX: 0,
    eyeY: 0,
    breathe: 0,
    tailAngle: 0,
    earAngle: 0,
    blinking: false,
  };
}

export function createGazeTarget(): GazeTarget {
  return { headX: 0, headY: 0, headRotation: 0, eyeX: 0, eyeY: 0 };
}

export function damping(dt: number): number {
  return 1 - Math.pow(0.001, dt);
}

/**
 * 한 프레임 전진.
 * @param visual 보간 대상(직접 변경)
 * @param target 시선 목표
 * @param profile 현재 행동의 애니메이션 규칙
 * @param dt 초 단위 델타
 * @param elapsed 애니메이션 위상 계산용 누적 시간(ms)
 * @param motionScale 모션 감소 모드에서 진폭을 줄이기 위한 배율(0..1)
 */
export function advanceVisual(
  visual: DogVisual,
  target: GazeTarget,
  profile: BehaviorProfile,
  dt: number,
  elapsed: number,
  motionScale = 1,
): void {
  const k = damping(dt);

  visual.headX += (target.headX - visual.headX) * k;
  visual.headY += (target.headY - visual.headY) * k;
  visual.headRotation += (target.headRotation - visual.headRotation) * k;
  visual.eyeX += (target.eyeX - visual.eyeX) * k;
  visual.eyeY += (target.eyeY - visual.eyeY) * k;

  const phase = (period: number) => (elapsed / period) * Math.PI * 2;

  visual.breathe = Math.sin(phase(profile.breathePeriodMs)) * profile.breatheAmplitude * motionScale;
  visual.tailAngle = Math.sin(phase(profile.tailPeriodMs)) * profile.tailAmplitude * motionScale;
  visual.earAngle += (profile.earTarget - visual.earAngle) * k * 0.5;
}
