'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';

export interface PetHintHandle {
  /** 애정도(0..1)를 진행 바에 반영한다. 매 프레임 호출되므로 리렌더하지 않는다. */
  setProgress: (ratio: number) => void;
}

interface PetHintProps {
  text: string;
}

/**
 * 안내 문구 + 애정도 바.
 * 문구는 상태가 바뀔 때만, 바는 매 프레임 갱신된다(리렌더 없이).
 */
export const PetHint = forwardRef<PetHintHandle, PetHintProps>(function PetHint({ text }, ref) {
  const fill = useRef<HTMLDivElement>(null);
  const value = useRef<HTMLSpanElement>(null);
  const last = useRef(-1);

  useImperativeHandle(ref, () => ({
    setProgress(ratio) {
      const percent = Math.round(ratio * 100);
      if (percent === last.current) return;
      last.current = percent;
      if (fill.current) fill.current.style.width = `${percent}%`;
      if (value.current) value.current.textContent = `${percent} / 100`;
    },
  }));

  return (
    <div className="flex flex-none flex-col items-center gap-[10px]">
      <p
        aria-live="polite"
        className="m-0 text-center text-[15px] tracking-[-0.005em] text-ink-soft sm:text-[17px]"
      >
        {text}
      </p>
      <div className="flex items-center gap-[10px]">
        <span className="font-mono text-[10px] tracking-[0.14em] text-ink-faint">애정</span>
        <div className="h-1 w-[140px] overflow-hidden rounded-sm bg-track sm:w-[200px]">
          <div
            ref={fill}
            className="h-full w-0 rounded-sm bg-accent-strong transition-[width] duration-200 ease-linear"
          />
        </div>
        <span ref={value} className="font-mono text-[11px] text-ink-mid">
          0 / 100
        </span>
      </div>
    </div>
  );
});
