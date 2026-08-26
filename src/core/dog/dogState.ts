import type { DogAction, DogMood, DogState, PetZoneId } from './types';

/**
 * 강아지 상태와 상태 머신.
 *
 * UI는 이 모듈을 통해서만 상태를 바꾸고, 어떤 컴포넌트에도 의존하지 않는다.
 */

export function createDogState(): DogState {
  return {
    currentAction: 'idle',
    mood: 'calm',
    affection: 0,
    energy: 1,
    attention: 0,
    lastZone: 'none',
    petSeconds: 0,
    petCount: 0,
  };
}

/** PRD 6장의 전이표. 허용되지 않은 전이는 무시한다. */
const TRANSITIONS: Record<DogAction, DogAction[]> = {
  idle: ['looking', 'petting', 'sleepy'],
  looking: ['idle', 'petting', 'sleepy'],
  petting: ['happy', 'looking', 'idle'],
  happy: ['petting', 'looking', 'idle'],
  sleepy: ['looking', 'petting', 'idle'],
};

export function canTransition(from: DogAction, to: DogAction): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

export function isPettingAction(action: DogAction): boolean {
  return action === 'petting' || action === 'happy';
}

/** 행동 + 애정도에서 기분을 파생한다. 기분은 문구/표정 선택에만 쓴다. */
export function deriveMood(state: DogState): DogMood {
  switch (state.currentAction) {
    case 'happy':
      return 'delighted';
    case 'sleepy':
      return 'drowsy';
    case 'looking':
      return 'curious';
    case 'petting':
      return state.affection > 0.6 ? 'delighted' : 'curious';
    default:
      return state.affection > 0.35 ? 'delighted' : 'calm';
  }
}

export function markZone(state: DogState, zone: PetZoneId): void {
  if (zone !== 'none') state.lastZone = zone;
}

export const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;
