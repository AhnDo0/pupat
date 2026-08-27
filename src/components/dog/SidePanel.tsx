'use client';

import type { BreedProfile, DogSnapshot } from '@/core/dog';
import { AnalysisCard } from './AnalysisCard';
import { ReactionLog, type LogEntry } from './ReactionLog';
import { TraitCard } from './TraitCard';

interface SidePanelProps {
  breed: BreedProfile;
  snapshot: DogSnapshot;
  log: LogEntry[];
}

/**
 * 데스크톱 오른쪽 패널 — 성격 · 쓰담 분석 · 반응 기록.
 * 좁은 화면에서는 자리를 차지하지 않도록 숨기고, 같은 정보를 강아지 아래 요약으로 보여준다.
 */
export function SidePanel({ breed, snapshot, log }: SidePanelProps) {
  return (
    <aside className="hidden w-[250px] flex-none flex-col justify-center gap-[10px] self-stretch overflow-y-auto py-[6px] lg:flex">
      <TraitCard breed={breed} />
      <AnalysisCard snapshot={snapshot} />
      <ReactionLog entries={log} />
    </aside>
  );
}
