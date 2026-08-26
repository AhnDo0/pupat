import { DOG_VIEWBOX } from './config';
import type { PetZoneId, Vec2 } from './types';

/**
 * 쓰다듬기 영역. 좌표는 강아지 SVG의 viewBox(0 0 600 600) 기준이며
 * 일러스트의 실제 파츠 위치와 맞춰 두었다.
 *
 * 부위별 반응(Phase 2)을 추가할 때 이 표에 항목과 반응만 덧붙이면 된다.
 */
interface ZoneEllipse {
  id: PetZoneId;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** 터치 환경에서 넉넉하게 잡아 주는 여유(px) */
  touchPadding: number;
}

const ZONES: ZoneEllipse[] = [
  { id: 'earLeft', cx: 240, cy: 156, rx: 46, ry: 62, touchPadding: 16 },
  { id: 'earRight', cx: 360, cy: 156, rx: 46, ry: 62, touchPadding: 16 },
  { id: 'head', cx: 300, cy: 268, rx: 132, ry: 118, touchPadding: 12 },
  { id: 'tail', cx: 456, cy: 386, rx: 52, ry: 56, touchPadding: 18 },
  { id: 'body', cx: 300, cy: 448, rx: 152, ry: 112, touchPadding: 12 },
];

function insideEllipse(p: Vec2, z: ZoneEllipse, pad: number): boolean {
  const rx = z.rx + pad;
  const ry = z.ry + pad;
  const dx = (p.x - z.cx) / rx;
  const dy = (p.y - z.cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/**
 * 로컬(SVG) 좌표가 어느 쓰다듬기 영역에 속하는지 판정한다.
 * `coarsePointer`가 true면(터치) 각 영역을 조금씩 넓혀 큰 터치 타깃을 만든다.
 */
export function hitTestZone(local: Vec2, coarsePointer = false): PetZoneId {
  for (const zone of ZONES) {
    if (insideEllipse(local, zone, coarsePointer ? zone.touchPadding : 0)) return zone.id;
  }
  return 'none';
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
