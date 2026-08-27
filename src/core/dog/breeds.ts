import type { ActName } from './dogActs';
import type { PetZoneId, SpeedBand } from './types';

/**
 * 품종 테이블 (Phase 2).
 *
 * 한 마리의 강아지를 "생김새(shape) + 색(palette) + 성격(personality)"으로 쪼개 두었다.
 * 새 품종은 이 표에 항목 하나를 추가하는 것으로 끝난다. 엔진과 UI는 손대지 않는다.
 */

export type BreedId = 'retriever' | 'corgi' | 'shiba';

/** 부위별 호감도. 음수면 싫어하는 부위다. */
export type ZoneLikes = Record<Exclude<PetZoneId, 'none'>, number>;

export interface BreedPalette {
  coat: string;
  coatLight: string;
  coatDark: string;
  earInner: string;
  /** 이마 blaze 무늬 표시 여부(0/1) */
  blazeOpacity: number;
  /** 볼 흰털 표시 여부(0/1) */
  cheekOpacity: number;
}

/** SVG viewBox(0 0 600 600) 기준 몸의 치수와 파츠 경로 */
export interface BreedShape {
  headRx: number;
  headRy: number;
  muzzleRx: number;
  muzzleRy: number;
  bodyCy: number;
  bodyRx: number;
  bodyRy: number;
  bellyCy: number;
  bellyRx: number;
  bellyRy: number;
  legY: number;
  legH: number;
  legW: number;
  legLX: number;
  legRX: number;
  tailPath: string;
  tailTipPath: string;
  earLeftPath: string;
  earLeftInnerPath: string;
  earRightPath: string;
  earRightInnerPath: string;
}

export interface BreedPersonality {
  /** 한 줄 성격 설명 */
  trait: string;
  /** 성격 태그 */
  tags: readonly string[];
  /** 좋아하는 손길 속도 */
  prefSpeed: SpeedBand;
  /** 취향의 너그러움 0..1 — 1에 가까울수록 속도를 덜 따진다 */
  speedTolerance: number;
  likes: ZoneLikes;
  /** 가만히 있을 때 하는 행동 */
  idleActs: readonly ActName[];
  /** 가끔 튀어나오는 돌발 행동 */
  randomActs: readonly ActName[];
  /** 다음 행동까지의 간격(ms) 범위 */
  actEveryMs: readonly [number, number];
}

export interface BreedProfile {
  id: BreedId;
  label: string;
  palette: BreedPalette;
  shape: BreedShape;
  personality: BreedPersonality;
}

export const BREEDS: Record<BreedId, BreedProfile> = {
  retriever: {
    id: 'retriever',
    label: '리트리버',
    palette: {
      coat: 'oklch(0.85 0.075 68)',
      coatLight: 'oklch(0.965 0.018 84)',
      coatDark: 'oklch(0.74 0.095 58)',
      earInner: 'oklch(0.82 0.05 40)',
      blazeOpacity: 0,
      cheekOpacity: 0,
    },
    shape: {
      headRx: 132,
      headRy: 118,
      muzzleRx: 78,
      muzzleRy: 62,
      bodyCy: 436,
      bodyRx: 152,
      bodyRy: 112,
      bellyCy: 470,
      bellyRx: 96,
      bellyRy: 72,
      legY: 500,
      legH: 44,
      legW: 62,
      legLX: 216,
      legRX: 322,
      tailPath: 'M424 432 C 470 424 498 392 492 352 C 490 338 474 334 466 346 C 452 368 440 388 414 402 Z',
      tailTipPath: 'M486 352 C 490 372 480 386 468 394 C 480 380 482 366 480 354 Z',
      earLeftPath: 'M212 214 C 196 168 200 122 216 104 C 232 118 258 152 268 196 Z',
      earLeftInnerPath: 'M222 200 C 212 170 214 142 222 128 C 232 146 244 172 250 194 Z',
      earRightPath: 'M388 214 C 404 168 400 122 384 104 C 368 118 342 152 332 196 Z',
      earRightInnerPath: 'M378 200 C 388 170 386 142 378 128 C 368 146 356 172 350 194 Z',
    },
    personality: {
      trait: '느긋한 낙천가. 어디를 만져도 기분이 좋고, 배를 내밀며 벌러덩 눕습니다.',
      tags: ['관대함', '배 쓰담 최고', '속도 상관없음'],
      prefSpeed: 'mid',
      speedTolerance: 1,
      likes: { head: 1, ear: 0.9, chin: 1, back: 1, belly: 1.2, tail: 0.4, paw: 0.5 },
      idleActs: ['yawn', 'stretch', 'lookAround', 'sniff', 'earFlick', 'shake'],
      randomActs: ['bark', 'butterfly', 'scratch'],
      actEveryMs: [4200, 7000],
    },
  },

  corgi: {
    id: 'corgi',
    label: '웰시코기',
    palette: {
      coat: 'oklch(0.73 0.125 52)',
      coatLight: 'oklch(0.975 0.012 86)',
      coatDark: 'oklch(0.63 0.13 46)',
      earInner: 'oklch(0.8 0.07 34)',
      blazeOpacity: 1,
      cheekOpacity: 0,
    },
    shape: {
      headRx: 138,
      headRy: 112,
      muzzleRx: 72,
      muzzleRy: 58,
      bodyCy: 452,
      bodyRx: 174,
      bodyRy: 94,
      bellyCy: 478,
      bellyRx: 112,
      bellyRy: 62,
      legY: 512,
      legH: 32,
      legW: 68,
      legLX: 206,
      legRX: 326,
      tailPath: 'M446 402 C 486 394 506 416 498 442 C 484 464 452 454 440 432 Z',
      tailTipPath: 'M490 418 C 500 430 496 446 484 452 C 494 440 494 428 488 420 Z',
      earLeftPath: 'M204 218 C 178 168 172 112 186 70 C 222 100 256 156 268 202 Z',
      earLeftInnerPath: 'M216 204 C 198 166 196 126 204 96 C 226 122 246 168 254 198 Z',
      earRightPath: 'M396 218 C 422 168 428 112 414 70 C 378 100 344 156 332 202 Z',
      earRightInnerPath: 'M384 204 C 402 166 404 126 396 96 C 374 122 354 168 346 198 Z',
    },
    personality: {
      trait: '활발한 수다쟁이. 빠른 손길을 제일 좋아하고, 짧은 꼬리를 건드리면 바로 돌아봅니다.',
      tags: ['빠른 손길 선호', '꼬리 민감', '자주 짖음'],
      prefSpeed: 'fast',
      speedTolerance: 0.85,
      likes: { head: 1, ear: 1.1, chin: 0.9, back: 1.1, belly: 0.8, tail: -0.9, paw: 0.2 },
      idleActs: ['lookAround', 'earFlick', 'shake', 'headTilt', 'sniff'],
      randomActs: ['bark', 'zoomies', 'bark', 'butterfly'],
      actEveryMs: [2800, 5200],
    },
  },

  shiba: {
    id: 'shiba',
    label: '시바견',
    palette: {
      coat: 'oklch(0.76 0.115 62)',
      coatLight: 'oklch(0.975 0.014 88)',
      coatDark: 'oklch(0.66 0.12 54)',
      earInner: 'oklch(0.82 0.06 38)',
      blazeOpacity: 0,
      cheekOpacity: 1,
    },
    shape: {
      headRx: 130,
      headRy: 114,
      muzzleRx: 66,
      muzzleRy: 52,
      bodyCy: 444,
      bodyRx: 146,
      bodyRy: 104,
      bellyCy: 472,
      bellyRx: 92,
      bellyRy: 66,
      legY: 504,
      legH: 40,
      legW: 58,
      legLX: 218,
      legRX: 324,
      tailPath:
        'M428 404 C 478 400 508 358 486 322 C 468 298 434 306 430 332 C 448 320 468 332 462 352 C 454 376 440 388 418 390 Z',
      tailTipPath: 'M478 330 C 488 344 484 360 472 368 C 482 356 482 342 476 332 Z',
      earLeftPath: 'M208 216 C 188 172 186 126 198 92 C 228 118 258 158 268 200 Z',
      earLeftInnerPath: 'M218 202 C 204 170 202 138 210 114 C 228 138 246 172 252 196 Z',
      earRightPath: 'M392 216 C 412 172 414 126 402 92 C 372 118 342 158 332 200 Z',
      earRightInnerPath: 'M382 202 C 396 170 398 138 390 114 C 372 138 354 172 348 196 Z',
    },
    personality: {
      trait: '도도한 관찰자. 느리고 정중한 손길만 받아주고, 배와 발은 절대 사양합니다.',
      tags: ['느린 손길 선호', '배 금지', '고개 갸웃'],
      prefSpeed: 'slow',
      speedTolerance: 0.7,
      likes: { head: 0.8, ear: 0.5, chin: 1.1, back: 0.9, belly: -1, tail: -0.6, paw: -0.7 },
      idleActs: ['headTilt', 'lookAround', 'sniff', 'yawn', 'stretch'],
      randomActs: ['sneeze', 'butterfly', 'scratch'],
      actEveryMs: [4600, 8200],
    },
  },
};

export const BREED_IDS = Object.keys(BREEDS) as BreedId[];

export const DEFAULT_BREED_ID: BreedId = 'retriever';

export function isBreedId(value: unknown): value is BreedId {
  return typeof value === 'string' && value in BREEDS;
}

export function breedFor(id: BreedId): BreedProfile {
  return BREEDS[id];
}

/** 부위 호감도. 표에 없는 부위는 무난한 기본값으로 본다. */
export function likeOf(breed: BreedProfile, zone: PetZoneId): number {
  if (zone === 'none') return 0.8;
  return breed.personality.likes[zone] ?? 0.8;
}
