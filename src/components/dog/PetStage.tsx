'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { breedFor, hintFor, zoneName } from '@/core/dog';
import { formatDuration } from '@/core/record/petRecord';
import { useBreed } from '@/hooks/useBreed';
import { useCoarsePointer } from '@/hooks/useMediaQuery';
import { useDogEngine } from '@/hooks/useDogEngine';
import { usePetRecord } from '@/hooks/usePetRecord';
import { getPlatform, type SoundAdapter } from '@/platform';
import { AppFooter } from '@/components/layout/AppFooter';
import { AppHeader } from '@/components/layout/AppHeader';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { BreedPicker } from './BreedPicker';
import { DogSvg, type DogSvgHandle } from './DogSvg';
import { PetHint, type PetHintHandle } from './PetHint';
import { PetOverlay, type PetOverlayHandle, type Ripple } from './PetOverlay';
import { ReadoutStrip } from './ReadoutStrip';
import type { LogEntry } from './ReactionLog';
import { SidePanel } from './SidePanel';

const RIPPLE_LIFETIME_MS = 780;
const LOG_LIMIT = 3;

/**
 * 강아지와 노는 화면 전체.
 *
 * 여기서 하는 일은 "연결"뿐이다.
 * 상태 머신도, 쓰다듬기 판정도, 부위·속도·방향 반응도 모두 `@/core/dog`에 있다.
 */
export function PetStage() {
  const dogRef = useRef<DogSvgHandle>(null);
  const hintRef = useRef<PetHintHandle>(null);
  const overlayRef = useRef<PetOverlayHandle>(null);
  const soundRef = useRef<SoundAdapter | null>(null);
  const rippleId = useRef(0);
  const logId = useRef(0);

  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [soundOn, setSoundOn] = useState(false);
  const [hovering, setHovering] = useState(false);

  const coarsePointer = useCoarsePointer();
  const record = usePetRecord();
  const [breedId, selectBreed] = useBreed();
  const breed = breedFor(breedId);

  const spawnRipple = useCallback((x: number, y: number, good: boolean) => {
    const id = (rippleId.current += 1);
    setRipples((current) => [...current, { id, x, y, good }]);
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
      switch (event.type) {
        case 'ripple':
          spawnRipple(event.at.x, event.at.y, event.good);
          break;
        case 'action':
          if (event.action === 'happy') soundRef.current?.play('happy');
          if (event.action === 'bliss') soundRef.current?.play('bliss');
          break;
        case 'act':
          if (event.name === 'bark') soundRef.current?.play('bark');
          break;
        case 'log':
          setLog((current) => {
            // 같은 말이 연달아 쌓이면 기록이 아니라 소음이 된다.
            if (current[0]?.text === event.text) return current;
            const entry = { id: (logId.current += 1), text: event.text, kind: event.kind };
            return [entry, ...current].slice(0, LOG_LIMIT);
          });
          break;
        default:
          break;
      }
    },
    onSample: (sample) => overlayRef.current?.setPoint(sample.stage.x, sample.stage.y),
  });

  // 저장된 오늘 기록을 엔진에 복원한다.
  useEffect(() => {
    if (record.ready) engineRef.current.restorePetSeconds(record.baselineSeconds);
  }, [record.ready, record.baselineSeconds, engineRef]);

  // 다른 강아지를 데려오면 반응 기록도 새로 시작한다.
  useEffect(() => {
    engineRef.current.setBreed(breedId);
    setLog([]);
  }, [breedId, engineRef]);

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
  const touchedZone = snapshot.activeZone !== 'none' ? snapshot.activeZone : snapshot.zone;
  const hoverName = zoneName(snapshot.zone);
  const zoneLabel =
    !coarsePointer && hovering && hoverName
      ? snapshot.zoneDisliked
        ? `${hoverName} · 싫어함`
        : hoverName
      : null;

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
        breed={breedId}
        onSelectBreed={selectBreed}
        soundOn={soundOn}
        onToggleSound={toggleSound}
      />

      <main className="flex min-h-0 flex-1 items-stretch gap-2 px-6 pb-[calc(env(safe-area-inset-bottom,0px)+18px)] pt-1 sm:px-[30px] sm:pb-0">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center">
          <DogSvg
            ref={dogRef}
            breed={breed}
            svgRef={svgRef}
            className="pupat-dog max-h-[min(44vh,420px)] w-auto min-h-0 max-w-full flex-1 sm:max-h-[min(56vh,560px)]"
          />

          <div className="mt-3 flex flex-none flex-col items-center gap-3 sm:mt-1">
            <PetHint ref={hintRef} text={hintFor(snapshot.action, touchedZone, coarsePointer ? 'coarse' : 'fine')} />

            {/* 좁은 화면에서는 사이드 패널 대신 요약을 강아지 아래에 둔다 */}
            <div className="flex flex-col items-center gap-2 lg:hidden">
              <BreedPicker value={breedId} onChange={selectBreed} className="sm:hidden" />
              <ReadoutStrip snapshot={snapshot} />
              {log[0] ? (
                <p key={log[0].id} className="sd-pop m-0 text-[12.5px] text-ink-mid">
                  {log[0].text}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <SidePanel breed={breed} snapshot={snapshot} log={log} />
      </main>

      <AppFooter timerText={timerText} />

      <PetOverlay
        ref={overlayRef}
        opacity={cursorOpacity}
        showPaw={!coarsePointer}
        ripples={ripples}
        zoneLabel={zoneLabel}
      />

      <InstallPrompt />

      {/* 스크린 리더/키보드 사용자를 위한 텍스트 대체 */}
      <p className="sr-only">
        화면 가운데 {breed.label} 강아지가 있습니다. 마우스나 손가락으로 강아지를 누른 채 움직이면
        쓰다듬을 수 있습니다. 부위마다 반응이 다릅니다. 지금 강아지는 {snapshot.action} 상태입니다.
      </p>
    </div>
  );
}
