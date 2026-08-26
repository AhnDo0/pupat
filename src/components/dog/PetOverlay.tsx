'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';

export interface Ripple {
  id: number;
  x: number;
  y: number;
}

export interface PetOverlayHandle {
  /** 포인터 위치를 리렌더 없이 반영한다. */
  setPoint: (x: number, y: number) => void;
}

interface PetOverlayProps {
  /** 0(숨김) ~ 1(누르는 중) */
  opacity: number;
  /** 정밀 포인터(마우스)일 때만 발바닥 커서를 그린다. */
  showPaw: boolean;
  ripples: Ripple[];
}

/**
 * 쓰다듬기 시각 효과 레이어 — 발바닥 커서, 손끝 글로우, 물결.
 * 입력을 가로채지 않도록 pointer-events: none.
 */
export const PetOverlay = forwardRef<PetOverlayHandle, PetOverlayProps>(function PetOverlay(
  { opacity, showPaw, ripples },
  ref,
) {
  const glow = useRef<HTMLDivElement>(null);
  const paw = useRef<SVGSVGElement>(null);

  useImperativeHandle(ref, () => ({
    setPoint(x, y) {
      const position = `${x}px`;
      const top = `${y}px`;
      if (glow.current) {
        glow.current.style.left = position;
        glow.current.style.top = top;
      }
      if (paw.current) {
        paw.current.style.left = position;
        paw.current.style.top = top;
      }
    },
  }));

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="sd-ripple absolute h-[72px] w-[72px] rounded-full border-2 sm:h-24 sm:w-24"
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
            borderColor: 'var(--color-accent)',
          }}
        />
      ))}

      <div
        ref={glow}
        className="absolute h-[66px] w-[66px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-200 sm:h-[74px] sm:w-[74px]"
        style={{
          opacity,
          background:
            'radial-gradient(circle, oklch(0.98 0.05 60 / 0.55) 0%, oklch(0.85 0.09 52 / 0.16) 55%, transparent 72%)',
        }}
      />

      {showPaw ? (
        <svg
          ref={paw}
          viewBox="0 0 40 40"
          className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200"
          style={{ opacity }}
          aria-hidden="true"
        >
          <circle cx="20" cy="24" r="8.5" fill="var(--color-paw)" />
          <circle cx="11" cy="14.5" r="3.6" fill="var(--color-paw)" />
          <circle cx="17" cy="11" r="3.6" fill="var(--color-paw)" />
          <circle cx="23" cy="11" r="3.6" fill="var(--color-paw)" />
          <circle cx="29" cy="14.5" r="3.6" fill="var(--color-paw)" />
        </svg>
      ) : null}
    </div>
  );
});
