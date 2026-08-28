import { DOG_VIEWBOX } from '@/core/dog';
import type { PointerSample, Vec2 } from '@/core/dog';

/**
 * DOM 어댑터: 브라우저 PointerEvent → 코어가 이해하는 정규화된 샘플.
 *
 * 마우스인지 터치인지 펜인지는 여기서 이미 사라진다.
 * 코어는 숫자만 받는다.
 */
export interface PointerLike {
  pointerId: number;
  clientX: number;
  clientY: number;
}

function localFromSvg(svg: SVGSVGElement, clientX: number, clientY: number): Vec2 {
  const matrix = svg.getScreenCTM();
  if (matrix) {
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const mapped = point.matrixTransform(matrix.inverse());
    return { x: mapped.x, y: mapped.y };
  }

  // getScreenCTM을 못 쓰는 환경을 위한 수동 매핑(preserveAspectRatio="xMidYMid meet" 기준)
  const rect = svg.getBoundingClientRect();
  const scale = Math.min(rect.width, rect.height) / DOG_VIEWBOX;
  const offsetX = (rect.width - DOG_VIEWBOX * scale) / 2;
  const offsetY = (rect.height - DOG_VIEWBOX * scale) / 2;
  return {
    x: (clientX - rect.left - offsetX) / scale,
    y: (clientY - rect.top - offsetY) / scale,
  };
}

export function toPointerSample(
  event: PointerLike,
  stage: HTMLElement,
  svg: SVGSVGElement | null,
  time: number,
): PointerSample {
  const rect = stage.getBoundingClientRect();
  const stageX = event.clientX - rect.left;
  const stageY = event.clientY - rect.top;

  return {
    id: event.pointerId,
    stage: { x: stageX, y: stageY },
    normal: {
      x: rect.width > 0 ? (stageX / rect.width - 0.5) * 2 : 0,
      y: rect.height > 0 ? (stageY / rect.height - 0.5) * 2 : 0,
    },
    local: svg
      ? localFromSvg(svg, event.clientX, event.clientY)
      : { x: DOG_VIEWBOX / 2, y: DOG_VIEWBOX / 2 },
    time,
  };
}

export const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();
