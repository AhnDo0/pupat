'use client';

import { readoutsFrom, type DogSnapshot, type Tone } from '@/core/dog';

const TONE_CLASS: Record<Tone, string> = {
  plain: 'text-ink-stat',
  good: 'text-good',
  bad: 'text-bad',
};

/**
 * 좁은 화면용 쓰담 분석.
 * 데스크톱 사이드 패널과 같은 값을 한 줄로 줄여서 보여준다.
 */
export function ReadoutStrip({ snapshot }: { snapshot: DogSnapshot }) {
  return (
    <dl className="m-0 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
      {readoutsFrom(snapshot).map((row) => (
        <div key={row.key} className="flex items-baseline gap-[5px]">
          <dt className="font-mono text-[10px] tracking-[0.1em] text-ink-faint">{row.label}</dt>
          <dd className={`m-0 text-[12px] ${TONE_CLASS[row.tone]}`}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
