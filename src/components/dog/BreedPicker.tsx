'use client';

import { BREED_IDS, BREEDS, type BreedId } from '@/core/dog';

interface BreedPickerProps {
  value: BreedId;
  onChange: (id: BreedId) => void;
  className?: string;
}

/**
 * 품종 선택 칩.
 * 데스크톱에서는 헤더 오른쪽에, 모바일에서는 강아지 아래에 놓인다.
 */
export function BreedPicker({ value, onChange, className }: BreedPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="강아지 고르기"
      className={`flex items-center gap-2 ${className ?? ''}`}
    >
      {BREED_IDS.map((id) => {
        const selected = id === value;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(id)}
            className={`cursor-pointer whitespace-nowrap rounded-full border px-[14px] py-2 text-[12px] transition-colors ${
              selected
                ? 'border-accent-strong bg-accent-strong text-accent-ink'
                : 'border-line bg-white/45 text-ink-mid hover:border-coat-dark/60 hover:bg-white/80'
            }`}
          >
            {BREEDS[id].label}
          </button>
        );
      })}
    </div>
  );
}
