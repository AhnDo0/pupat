'use client';

import Link from 'next/link';

import type { BreedId } from '@/core/dog';
import { BreedPicker } from '@/components/dog/BreedPicker';

interface AppHeaderProps {
  /** 현재 행동(디자인의 mood 라벨) */
  mood: string;
  timerText: string;
  breed: BreedId;
  onSelectBreed: (id: BreedId) => void;
  soundOn: boolean;
  onToggleSound: () => void;
}

/**
 * 상단 바. 하나의 컴포넌트가 breakpoint에 따라 다르게 보인다.
 * - 모바일: 좌측 상태 · 우측 오늘의 쓰담 시간 (품종 선택은 강아지 아래로)
 * - 데스크톱: 좌측 브랜드 + 상태 · 우측 품종 선택 + 사운드 토글
 */
export function AppHeader({
  mood,
  timerText,
  breed,
  onSelectBreed,
  soundOn,
  onToggleSound,
}: AppHeaderProps) {
  return (
    <header className="flex flex-none items-center justify-between gap-4 px-[22px] pt-[calc(env(safe-area-inset-top,0px)+20px)] sm:px-[30px] sm:pt-5">
      <div className="flex items-baseline gap-3">
        <span className="hidden text-[19px] tracking-[-0.01em] sm:inline">쓰담하개</span>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint sm:inline">
          phase 2
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mid sm:text-[11px]">
          {mood}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <BreedPicker value={breed} onChange={onSelectBreed} className="hidden sm:flex" />
        <Link
          href="/record"
          className="font-mono text-[11px] tracking-[0.12em] text-ink-mid hover:text-ink sm:hidden"
          aria-label={`오늘의 쓰담 ${timerText}, 기록 보기`}
        >
          {timerText}
        </Link>
        <button
          type="button"
          onClick={onToggleSound}
          aria-pressed={soundOn}
          className="hidden cursor-pointer whitespace-nowrap rounded-full border border-line bg-white/45 px-3 py-2 font-mono text-[11px] tracking-[0.1em] text-ink-mid transition-colors hover:border-coat-dark/60 hover:bg-white/80 sm:inline-flex"
        >
          {soundOn ? 'sound on' : 'sound off'}
        </button>
      </div>
    </header>
  );
}
