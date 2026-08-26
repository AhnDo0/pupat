'use client';

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { DogEngine, type DogEvent, type DogPose, type DogSnapshot, type PointerSample } from '@/core/dog';
import { now, toPointerSample } from '@/lib/pointer';
import { useCoarsePointer, usePrefersReducedMotion } from './useMediaQuery';
import { useAnimationFrame } from './useAnimationFrame';

export interface DogStageHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: ReactPointerEvent<HTMLElement>) => void;
}

export interface UseDogEngineOptions {
  /** 매 프레임 호출. 여기서 DOM에 직접 값을 꽂아 리렌더 없이 애니메이션한다. */
  onFrame?: (pose: DogPose, engine: DogEngine) => void;
  /** 리플/사운드 같은 일회성 사건 */
  onEvent?: (event: DogEvent) => void;
  /** 포인터 샘플이 만들어질 때마다 호출 — 커서 이펙트 위치 갱신용 */
  onSample?: (sample: PointerSample) => void;
}

export interface UseDogEngineResult {
  engineRef: React.RefObject<DogEngine>;
  /** 인터랙션을 받는 바깥 컨테이너 */
  stageRef: React.RefObject<HTMLDivElement | null>;
  /** 좌표 변환 기준이 되는 강아지 SVG */
  svgRef: React.RefObject<SVGSVGElement | null>;
  snapshot: DogSnapshot;
  handlers: DogStageHandlers;
}

/**
 * 강아지 엔진과 React를 잇는 유일한 지점.
 *
 * - 입력: Pointer Events → 정규화된 샘플 → 엔진
 * - 출력: 매 프레임 pose → onFrame(DOM 직접 반영), 이산 상태만 리렌더
 */
export function useDogEngine(options: UseDogEngineOptions = {}): UseDogEngineResult {
  const { onFrame, onEvent, onSample } = options;

  const stageRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const engineRef = useRef<DogEngine | null>(null);
  if (engineRef.current === null) engineRef.current = new DogEngine();
  const engine = engineRef.current;

  const coarsePointer = useCoarsePointer();
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    engine.setInputProfile(coarsePointer ? 'coarse' : 'fine');
  }, [engine, coarsePointer]);

  useEffect(() => {
    engine.setReducedMotion(reducedMotion);
  }, [engine, reducedMotion]);

  const eventRef = useRef(onEvent);
  eventRef.current = onEvent;

  useEffect(() => {
    return engine.on((event) => eventRef.current?.(event));
  }, [engine]);

  const frameRef = useRef(onFrame);
  frameRef.current = onFrame;

  useAnimationFrame(
    useCallback(
      (time: number) => {
        engine.update(time);
        frameRef.current?.(engine.getPose(), engine);
      },
      [engine],
    ),
  );

  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);

  const sampleRef = useRef(onSample);
  sampleRef.current = onSample;

  const sampleFrom = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const stage = stageRef.current;
    if (!stage) return null;
    const sample = toPointerSample(event, stage, svgRef.current, now());
    sampleRef.current?.(sample);
    return sample;
  }, []);

  const handlers = useMemo<DogStageHandlers>(
    () => ({
      onPointerDown: (event) => {
        const sample = sampleFrom(event);
        if (!sample) return;
        // 손가락이 강아지 밖으로 나가도 쓰다듬기가 끊기지 않도록 캡처한다.
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* 캡처를 지원하지 않는 환경에서는 그냥 진행한다. */
        }
        engine.pointerDown(sample);
      },
      onPointerMove: (event) => {
        const sample = sampleFrom(event);
        if (!sample) return;
        engine.pointerMove(sample);
      },
      onPointerUp: (event) => {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          /* noop */
        }
        engine.pointerUp();
      },
      onPointerCancel: () => engine.pointerUp(),
      onPointerLeave: () => engine.pointerLeave(),
    }),
    [engine, sampleFrom],
  );

  return { engineRef: engineRef as React.RefObject<DogEngine>, stageRef, svgRef, snapshot, handlers };
}
