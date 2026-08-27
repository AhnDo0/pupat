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
    affection: 0.2,
    energy: 1,
    attention: 0,
    lastZone: 'none',
    activeZone: 'none',
    hoverZone: 'none',
    petSeconds: 0,
    petCount: 0,
    quality: 0,
    speed: 0,
    grain: 0,
  };
}

/**
 * PRD 6장의 전이표에 Phase 2의 bliss(완전히 녹음)와 annoyed(불편함)를 더한 것.
 * 허용되지 않은 전이는 무시한다.
 */
const TRANSITIONS: Record<DogAction, DogAction[]> = {
  idle: ['looking', 'petting', 'annoyed', 'sleepy'],
  looking: ['idle', 'petting', 'annoyed', 'sleepy'],
  petting: ['happy', 'bliss', 'annoyed', 'looking', 'idle'],
  happy: ['bliss', 'petting', 'annoyed', 'looking', 'idle'],
  bliss: ['happy', 'petting', 'annoyed', 'looking', 'idle'],
  annoyed: ['petting', 'looking', 'idle', 'sleepy'],
  sleepy: ['looking', 'petting', 'annoyed', 'idle'],
};

export function canTransition(from: DogAction, to: DogAction): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

/** 손이 몸에 닿아 있는 상태인지(불편해하는 중도 포함) */
export function isPettingAction(action: DogAction): boolean {
  return (
    action === 'petting' || action === 'happy' || action === 'bliss' || action === 'annoyed'
  );
}

/** 기분 좋게 쓰다듬기는 중인지 */
export function isPleasedAction(action: DogAction): boolean {
  return action === 'petting' || action === 'happy' || action === 'bliss';
}

/** 행동 + 애정도에서 기분을 파생한다. 기분은 문구/표정 선택에만 쓴다. */
export function deriveMood(state: DogState): DogMood {
  switch (state.currentAction) {
    case 'bliss':
      return 'blissful';
    case 'happy':
      return 'delighted';
    case 'annoyed':
      return 'grumpy';
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
