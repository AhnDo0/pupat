'use client';

import { readoutsFrom, type DogSnapshot, type Tone } from '@/core/dog';

const TONE_CLASS: Record<Tone, string> = {
  plain: 'text-ink-stat',
  good: 'text-good',
  bad: 'text-bad',
};

/**
 * 쓰담 분석 — 지금 어디를, 얼마나 빠르게, 어느 방향으로 만지고 있는지.
 * 반응이 왜 그런지 사용자가 바로 알 수 있게 하는 장치다.
 */
export function AnalysisCard({ snapshot }: { snapshot: DogSnapshot }) {
  const rows = readoutsFrom(snapshot);

  return (
    <section className="flex flex-none flex-col gap-[10px] rounded-[20px] border border-line-soft bg-white/55 px-4 py-[14px]">
      <h2 className="m-0 font-mono text-[10px] font-normal tracking-[0.14em] text-ink-faint">
        쓰담 분석
      </h2>
      <dl className="m-0 flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.key} className="flex items-baseline justify-between gap-[10px]">
            <dt className="text-[12px] text-ink-label">{row.label}</dt>
            <dd className={`m-0 text-[13px] ${TONE_CLASS[row.tone]}`}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
