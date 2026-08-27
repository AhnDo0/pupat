'use client';

import type { BreedProfile } from '@/core/dog';

/**
 * 이 강아지가 어떤 손길을 좋아하는지 알려 주는 카드.
 * 부위·속도·방향 반응이 왜 다른지에 대한 유일한 설명이라 문구를 짧게 유지한다.
 */
export function TraitCard({ breed }: { breed: BreedProfile }) {
  return (
    <section className="flex flex-none flex-col gap-[9px] rounded-[20px] border border-line-soft bg-white/55 px-4 py-[14px]">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-[15px] font-normal">{breed.label}</h2>
        <span className="font-mono text-[10px] tracking-[0.12em] text-ink-faint">성격</span>
      </div>
      <p className="m-0 text-[13px] leading-[1.65] text-pretty text-ink-quiet">
        {breed.personality.trait}
      </p>
      <ul className="m-0 flex list-none flex-wrap gap-[6px] p-0">
        {breed.personality.tags.map((tag) => (
          <li
            key={tag}
            className="rounded-full border border-line-soft bg-white/50 px-[9px] py-[5px] text-[11px] text-ink-soft"
          >
            {tag}
          </li>
        ))}
      </ul>
    </section>
  );
}
