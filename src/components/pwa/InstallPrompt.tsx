'use client';

import { useInstallPrompt } from '@/hooks/useInstallPrompt';

/**
 * 디자인 시안 01의 "홈 화면에 추가" 카드.
 * 앱 화면 위에 겹쳐 뜨며, 설치 여부와 상관없이 UI는 동일하게 유지된다.
 */
export function InstallPrompt() {
  const { canInstall, install, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom,0px)+18px)]">
      <div className="sd-rise pointer-events-auto flex w-full max-w-[420px] flex-col gap-[14px] rounded-[26px] border border-white/70 bg-white/72 p-[18px] pb-4 shadow-[0_12px_30px_oklch(0.6_0.05_60/0.18)] backdrop-blur-[18px]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] bg-coat">
            <svg viewBox="0 0 100 100" className="h-7 w-7" aria-hidden="true">
              <path d="M22 44 C 14 26 18 14 26 10 C 34 16 44 30 48 42 Z" fill="var(--color-coat-dark)" />
              <path d="M78 44 C 86 26 82 14 74 10 C 66 16 56 30 52 42 Z" fill="var(--color-coat-dark)" />
              <ellipse cx="50" cy="58" rx="34" ry="30" fill="var(--color-coat-light)" />
              <path
                d="M36 56 Q 43 50 50 56"
                fill="none"
                stroke="oklch(0.32 0.02 60)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M50 56 Q 57 50 64 56"
                fill="none"
                stroke="oklch(0.32 0.02 60)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <ellipse cx="50" cy="70" rx="7" ry="5" fill="oklch(0.32 0.02 60)" />
            </svg>
          </div>
          <div className="flex flex-col gap-[3px]">
            <span className="text-[14px]">홈 화면에 추가</span>
            <span className="text-[11px] text-ink-quiet">앱처럼 전체 화면으로 열려요</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 cursor-pointer rounded-[14px] border-none bg-surface py-3 text-[13px] text-ink-mid"
          >
            나중에
          </button>
          <button
            type="button"
            onClick={install}
            className="flex-[2] cursor-pointer rounded-[14px] border-none bg-accent-strong py-3 text-[13px] text-accent-ink"
          >
            추가하기
          </button>
        </div>
      </div>
    </div>
  );
}
