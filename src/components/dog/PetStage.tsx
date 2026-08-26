'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { hintFor } from '@/core/dog';
import { formatDuration } from '@/core/record/petRecord';
import { useCoarsePointer } from '@/hooks/useMediaQuery';
import { useDogEngine } from '@/hooks/useDogEngine';
import { usePetRecord } from '@/hooks/usePetRecord';
import { getPlatform, type SoundAdapter } from '@/platform';
import { AppFooter } from '@/components/layout/AppFooter';
import { AppHeader } from '@/components/layout/AppHeader';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { DogSvg, type DogSvgHandle } from './DogSvg';
import { PetHint, type PetHintHandle } from './PetHint';
import { PetOverlay, type PetOverlayHandle, type Ripple } from './PetOverlay';

const RIPPLE_LIFETIME_MS = 780;

/**
 * 강아지와 노는 화면 전체.
 *
 * 여기서 하는 일은 "연결"뿐이다.
 * 상태 머신도, 쓰다듬기 판정도, 애니메이션 수식도 모두 `@/core/dog`에 있다.
 */
export function PetStage() {
  const dogRef = useRef<DogSvgHandle>(null);
  const hintRef = useRef<PetHintHandle>(null);
  const overlayRef = useRef<PetOverlayHandle>(null);
  const soundRef = useRef<SoundAdapter | null>(null);
  const rippleId = useRef(0);

  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [soundOn, setSoundOn] = useState(false);
  const [hovering, setHovering] = useState(false);

  const coarsePointer = useCoarsePointer();
  const record = usePetRecord();

  const spawnRipple = useCallback((x: number, y: number) => {
    const id = (rippleId.current += 1);
    setRipples((current) => [...current, { id, x, y }]);
    window.setTimeout(() => {
      setRipples((current) => current.filter((ripple) => ripple.id !== id));
    }, RIPPLE_LIFETIME_MS);
  }, []);

  const { engineRef, stageRef, svgRef, snapshot, handlers } = useDogEngine({
    onFrame: (pose, engine) => {
      dogRef.current?.applyPose(pose);
      hintRef.current?.setProgress(engine.getAffection());
      const state = engine.getState();
      record.saveToday(state.petSeconds, state.petCount);
    },
    onEvent: (event) => {
      if (event.type === 'ripple') spawnRipple(event.at.x, event.at.y);
      if (event.type === 'action' && event.action === 'happy') soundRef.current?.play('happy');
    },
    onSample: (sample) => overlayRef.current?.setPoint(sample.stage.x, sample.stage.y),
  });

  // 저장된 오늘 기록을 엔진에 복원한다.
  useEffect(() => {
    if (record.ready) engineRef.current.restorePetSeconds(record.baselineSeconds);
  }, [record.ready, record.baselineSeconds, engineRef]);

  useEffect(() => {
    return () => {
      soundRef.current?.dispose();
      soundRef.current = null;
    };
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      const next = !on;
      if (next) {
        // 사용자 제스처 안에서 만들어야 오디오가 재생된다.
        soundRef.current ??= getPlatform().createSound();
        soundRef.current.play('pet');
      } else {
        soundRef.current?.dispose();
        soundRef.current = null;
      }
      return next;
    });
  }, []);

  const timerText = formatDuration(snapshot.petSeconds);
  const cursorOpacity = snapshot.pressing ? 1 : !coarsePointer && hovering ? 0.5 : 0;

  return (
    <div
      ref={stageRef}
      className="pupat-stage relative flex h-[100dvh] min-h-[480px] touch-none select-none flex-col overflow-hidden"
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onPointerCancel={handlers.onPointerCancel}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={(event) => {
        setHovering(false);
        handlers.onPointerLeave(event);
      }}
    >
      <AppHeader
        mood={snapshot.action}
        timerText={timerText}
        soundOn={soundOn}
        onToggleSound={toggleSound}
      />

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-[calc(env(safe-area-inset-bottom,0px)+26px)] pt-1 sm:px-6 sm:pb-0">
        <DogSvg
          ref={dogRef}
          svgRef={svgRef}
          className="pupat-dog max-h-[min(52vh,460px)] w-auto min-h-0 max-w-full flex-1 sm:max-h-[min(56vh,560px)]"
        />
        <div className="mt-3 sm:mt-1">
          <PetHint ref={hintRef} text={hintFor(snapshot.action, coarsePointer ? 'coarse' : 'fine')} />
        </div>
      </main>

      <AppFooter timerText={timerText} />

      <PetOverlay
        ref={overlayRef}
        opacity={cursorOpacity}
        showPaw={!coarsePointer}
        ripples={ripples}
      />

      <InstallPrompt />

      {/* 스크린 리더/키보드 사용자를 위한 텍스트 대체 */}
      <p className="sr-only">
        화면 가운데 강아지가 있습니다. 마우스나 손가락으로 강아지를 누른 채 움직이면 쓰다듬을 수
        있습니다. 지금 강아지는 {snapshot.action} 상태입니다.
      </p>
    </div>
  );
}
