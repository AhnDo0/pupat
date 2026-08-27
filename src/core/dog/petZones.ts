import type { BreedProfile } from './breeds';
import { DOG_VIEWBOX } from './config';
import type { PetZoneId, Vec2 } from './types';

/**
 * 쓰다듬기 부위 (Phase 2).
 *
 * 좌표는 강아지 SVG의 viewBox(0 0 600 600) 기준이며, 몸 치수가 품종마다 다르므로
 * 배·발처럼 몸에 붙는 부위는 품종의 shape에서 계산한다.
 * 위에서부터 순서대로 검사하므로 작은 부위(턱·귀)가 큰 부위(머리·등)를 이긴다.
 */
export interface PetZone {
  id: Exclude<PetZoneId, 'none'>;
  cx: number;
  cy: number;
  r: number;
  /** 좌/우가 나뉘는 부위 구분용 */
  side?: 'l' | 'r';
}

/** 터치일 때 각 부위를 넉넉하게 잡아 주는 여유(px, SVG 단위) */
const TOUCH_PADDING = 14;

export const ZONE_NAMES: Record<Exclude<PetZoneId, 'none'>, string> = {
  head: '정수리',
  ear: '귀',
  chin: '턱',
  back: '등',
  belly: '배',
  tail: '꼬리',
  paw: '발',
};

export function zoneName(zone: PetZoneId): string | null {
  return zone === 'none' ? null : ZONE_NAMES[zone];
}

export function zonesFor(breed: BreedProfile): PetZone[] {
  const s = breed.shape;
  return [
    { id: 'chin', cx: 300, cy: 314, r: 62 },
    { id: 'ear', cx: 224, cy: 152, r: 58, side: 'l' },
    { id: 'ear', cx: 376, cy: 152, r: 58, side: 'r' },
    { id: 'head', cx: 300, cy: 240, r: 116 },
    { id: 'tail', cx: 468, cy: 396, r: 66 },
    { id: 'paw', cx: s.legLX + s.legW / 2, cy: s.legY + 22, r: 42, side: 'l' },
    { id: 'paw', cx: s.legRX + s.legW / 2, cy: s.legY + 22, r: 42, side: 'r' },
    { id: 'belly', cx: 300, cy: s.bellyCy, r: 84 },
    { id: 'back', cx: 300, cy: s.bodyCy - 56, r: 132 },
  ];
}

/**
 * 로컬(SVG) 좌표가 어느 부위에 속하는지 판정한다.
 * coarsePointer가 true면(터치) 각 부위를 조금씩 넓혀 큰 터치 타깃을 만든다.
 */
export function hitTestZone(
  local: Vec2,
  breed: BreedProfile,
  coarsePointer = false,
): PetZone | null {
  const pad = coarsePointer ? TOUCH_PADDING : 0;
  for (const zone of zonesFor(breed)) {
    if (Math.hypot(local.x - zone.cx, local.y - zone.cy) <= zone.r + pad) return zone;
  }
  return null;
}

export function isPettableZone(zone: PetZoneId): boolean {
  return zone !== 'none';
}

/** 화면 밖으로 벗어난 입력을 걸러 내기 위한 여유 범위 */
export function isInsideStage(local: Vec2, margin = 80): boolean {
  return (
    local.x >= -margin &&
    local.y >= -margin &&
    local.x <= DOG_VIEWBOX + margin &&
    local.y <= DOG_VIEWBOX + margin
  );
}
