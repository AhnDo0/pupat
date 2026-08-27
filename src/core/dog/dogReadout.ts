import type { DogSnapshot, Tone } from './dogEngine';
import { zoneName } from './petZones';
import type { GrainBand, SpeedBand } from './types';

/**
 * "쓰담 분석" 패널에 뿌릴 네 줄.
 * 스냅샷만 있으면 만들 수 있는 순수 함수라 UI에서 계산할 필요가 없다.
 */
export interface DogReadout {
  key: string;
  label: string;
  value: string;
  tone: Tone;
}

const EMPTY = '—';

const SPEED_LABELS: Record<SpeedBand, string> = {
  slow: '느긋',
  mid: '알맞음',
  fast: '빠름',
};

const GRAIN_LABELS: Record<GrainBand, string> = {
  with: '털 방향',
  across: '가로 방향',
  against: '역방향',
};

const QUALITY_LABELS: Record<DogSnapshot['quality'], string> = {
  best: '최고',
  good: '좋음',
  plain: '보통',
  reject: '거부',
  none: EMPTY,
};

export function readoutsFrom(snapshot: DogSnapshot): DogReadout[] {
  const zone = snapshot.activeZone !== 'none' ? snapshot.activeZone : snapshot.zone;

  return [
    {
      key: 'zone',
      label: '부위',
      value: zoneName(zone) ?? EMPTY,
      tone: snapshot.zoneDisliked ? 'bad' : 'plain',
    },
    {
      key: 'speed',
      label: '속도',
      value: snapshot.speedBand ? SPEED_LABELS[snapshot.speedBand] : EMPTY,
      tone: snapshot.speedBand ? snapshot.speedTone : 'plain',
    },
    {
      key: 'grain',
      label: '방향',
      value: snapshot.grainBand ? GRAIN_LABELS[snapshot.grainBand] : EMPTY,
      tone: snapshot.grainBand ? snapshot.grainTone : 'plain',
    },
    {
      key: 'quality',
      label: '반응',
      value: QUALITY_LABELS[snapshot.quality],
      tone: snapshot.quality === 'reject' ? 'bad' : snapshot.quality === 'best' ? 'good' : 'plain',
    },
  ];
}
