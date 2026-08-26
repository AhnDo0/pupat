'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  dateKey,
  dayRecord,
  formatCount,
  formatDuration,
  totalPets,
  visitStreak,
  weekSeries,
} from '@/core/record/petRecord';
import { usePetRecord } from '@/hooks/usePetRecord';

/**
 * 디자인 시안 03 — 기기 안에만 남는 쓰담 기록.
 * 모바일에서는 전체 폭, 데스크톱에서는 같은 카드를 가운데 정렬해 그대로 보여준다.
 */
export function RecordPanel() {
  const { store, ready } = usePetRecord();
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');

  const summary = useMemo(() => {
    const today = dayRecord(store, dateKey());
    return {
      todaySeconds: today.seconds,
      week: weekSeries(store),
      pets: totalPets(store),
      streak: visitStreak(store),
    };
  }, [store]);

  const share = async () => {
    const text = `오늘 쓰담하개에서 ${formatDuration(summary.todaySeconds)} 동안 강아지를 쓰다듬었어요.`;
    const url = typeof window !== 'undefined' ? window.location.origin : '';
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: '쓰담하개', text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`.trim());
      setShareState('copied');
      window.setTimeout(() => setShareState('idle'), 2000);
    } catch {
      /* 사용자가 공유를 취소한 경우 등 — 아무 일도 하지 않는다. */
    }
  };

  return (
    <div className="pupat-panel flex min-h-[100dvh] justify-center">
      <div className="flex w-full max-w-[420px] flex-col gap-[22px] px-[22px] pb-[calc(env(safe-area-inset-bottom,0px)+44px)] pt-[calc(env(safe-area-inset-top,0px)+40px)] sm:pt-14">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            오늘의 쓰담
          </span>
          <Link
            href="/"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint hover:text-ink"
          >
            back to pet
          </Link>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[46px] tracking-[-0.02em] text-ink-strong">
            {formatDuration(summary.todaySeconds)}
          </span>
          <span className="text-[13px] text-ink-quiet">분 · 초</span>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[13px] text-ink-quiet">이번 주</span>
          <div className="flex h-24 items-end gap-[10px]">
            {summary.week.map((bar) => (
              <div
                key={bar.key}
                className="flex-1 rounded-t-md rounded-b-[3px] transition-[height] duration-500"
                style={{
                  height: `${Math.max(4, Math.round(bar.ratio * 100))}%`,
                  background:
                    bar.ratio > 0.7 ? 'var(--color-accent)' : 'var(--color-bar-quiet)',
                }}
                aria-label={`${bar.label}요일 ${formatDuration(bar.seconds)}`}
              />
            ))}
          </div>
          <div className="flex gap-[10px]">
            {summary.week.map((bar) => (
              <span
                key={bar.key}
                className="flex-1 text-center font-mono text-[9px] tracking-[0.08em] text-ink-label"
              >
                {bar.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[10px]">
          <div className="flex flex-col gap-[6px] rounded-[18px] border border-line-soft bg-white/60 p-[14px]">
            <span className="text-[11px] text-ink-label">누적 쓰담</span>
            <span className="font-mono text-[20px] text-ink-stat">
              {ready ? formatCount(summary.pets) : '—'}
            </span>
          </div>
          <div className="flex flex-col gap-[6px] rounded-[18px] border border-line-soft bg-white/60 p-[14px]">
            <span className="text-[11px] text-ink-label">연속 방문</span>
            <span className="font-mono text-[20px] text-ink-stat">
              {ready ? `${summary.streak}일` : '—'}
            </span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex flex-col gap-[10px]">
          <button
            type="button"
            onClick={share}
            className="cursor-pointer rounded-2xl border-none bg-accent-strong py-[15px] text-[14px] text-accent-ink"
          >
            {shareState === 'copied' ? '링크를 복사했어요' : '오늘의 쓰담 공유하기'}
          </button>
          <span className="text-center text-[11px] text-ink-label">
            기록은 이 기기에만 저장돼요
          </span>
        </div>
      </div>
    </div>
  );
}
