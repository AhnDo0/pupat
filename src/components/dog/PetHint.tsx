'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';

export interface PetHintHandle {
  /** 애정도(0..1)를 진행 바에 반영한다. */
  setProgress: (ratio: number) => void;
}

interface PetHintProps {
  text: string;
}

/**
 * 안내 문구 + 쓰담 진행 바.
 * 문구는 상태가 바뀔 때만, 진행 바는 매 프레임 갱신된다(리렌더 없이).
 */
export const PetHint = forwardRef<PetHintHandle, PetHintProps>(function PetHint({ text }, ref) {
  const fill = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    setProgress(ratio) {
      if (fill.current) fill.current.style.width = `${Math.round(ratio * 100)}%`;
    },
  }));

  return (
    <div className="flex flex-none flex-col items-center gap-3">
      <p
        aria-live="polite"
        className="m-0 text-[15px] tracking-[-0.005em] text-ink-soft sm:text-[17px]"
      >
        {text}
      </p>
      <div className="h-[3px] w-[140px] overflow-hidden rounded-sm bg-track sm:w-[168px]">
        <div
          ref={fill}
          className="h-full w-0 rounded-sm bg-accent transition-[width] duration-200 ease-linear"
        />
      </div>
    </div>
  );
});
