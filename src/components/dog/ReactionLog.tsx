'use client';

import type { LogKind } from '@/core/dog';

export interface LogEntry {
  id: number;
  text: string;
  kind: LogKind;
}

const MARKS: Record<LogKind, string> = { good: '+', soft: '·', bad: '!' };
const MARK_CLASS: Record<LogKind, string> = {
  good: 'text-accent-strong',
  soft: 'text-ink-faint',
  bad: 'text-bad',
};

/** 최근 반응 세 줄. 강아지가 방금 무엇에 반응했는지 남는 기록이다. */
export function ReactionLog({ entries }: { entries: LogEntry[] }) {
  return (
    <section className="flex flex-none flex-col gap-[9px] rounded-[20px] border border-line-soft bg-white/55 px-4 py-[14px]">
      <h2 className="m-0 font-mono text-[10px] font-normal tracking-[0.14em] text-ink-faint">
        반응 기록
      </h2>
      <ul aria-live="polite" className="m-0 flex min-h-[54px] list-none flex-col gap-[7px] p-0">
        {entries.map((entry) => (
          <li key={entry.id} className="sd-pop flex items-baseline gap-2">
            <span className={`font-mono text-[11px] ${MARK_CLASS[entry.kind]}`}>
              {MARKS[entry.kind]}
            </span>
            <span className="text-[12.5px] text-ink-mid">{entry.text}</span>
          </li>
        ))}
        {entries.length === 0 ? (
          <li className="text-[12.5px] text-ink-faint">아직 조용해요</li>
        ) : null}
      </ul>
    </section>
  );
}
