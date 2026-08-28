'use client';

import Link from 'next/link';

interface AppFooterProps {
  timerText: string;
}

/**
 * 데스크톱 하단의 "오늘의 쓰담".
 * 모바일에서는 같은 정보를 상단 바가 보여주므로 숨긴다.
 */
export function AppFooter({ timerText }: AppFooterProps) {
  return (
    <footer className="hidden flex-none items-center justify-center gap-[10px] px-[34px] pb-[22px] pt-4 font-mono text-[12px] tracking-[0.16em] text-ink-faint sm:flex">
      <Link
        href="/record"
        aria-label={`오늘의 쓰담 ${timerText}, 기록 보기`}
        className="flex items-center gap-[10px] text-ink-faint underline-offset-[6px] hover:text-ink hover:underline"
      >
        <span>오늘의 쓰담</span>
        <span className="text-ink-mono">{timerText}</span>
      </Link>
    </footer>
  );
}
