/**
 * 쓰담 기록.
 *
 * 저장소(localStorage / Tauri store / 파일)와 무관한 순수 계산만 담는다.
 * 실제 읽고 쓰는 일은 `platform`의 StorageAdapter가 맡는다.
 */

export interface PetDayRecord {
  /** 그날의 누적 쓰담 시간(초) */
  seconds: number;
  /** 그날의 쓰담 횟수 */
  pets: number;
}

export interface PetRecordStore {
  version: 1;
  /** 'YYYY-MM-DD' → 기록 */
  days: Record<string, PetDayRecord>;
}

export const RECORD_STORAGE_KEY = 'pupat.record.v1';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function createRecordStore(): PetRecordStore {
  return { version: 1, days: {} };
}

/** 로컬 타임존 기준 날짜 키. UTC로 자르면 자정 근처에 날짜가 밀린다. */
export function dateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseRecordStore(raw: string | null): PetRecordStore {
  if (!raw) return createRecordStore();
  try {
    const parsed = JSON.parse(raw) as Partial<PetRecordStore>;
    if (!parsed || typeof parsed !== 'object' || !parsed.days) return createRecordStore();
    const days: Record<string, PetDayRecord> = {};
    for (const [key, value] of Object.entries(parsed.days)) {
      if (!value) continue;
      days[key] = {
        seconds: Number.isFinite(value.seconds) ? Math.max(0, value.seconds) : 0,
        pets: Number.isFinite(value.pets) ? Math.max(0, value.pets) : 0,
      };
    }
    return { version: 1, days };
  } catch {
    return createRecordStore();
  }
}

export function serializeRecordStore(store: PetRecordStore): string {
  return JSON.stringify(store);
}

export function dayRecord(store: PetRecordStore, key: string): PetDayRecord {
  return store.days[key] ?? { seconds: 0, pets: 0 };
}

/** 오늘 기록을 갱신한 새 스토어를 돌려준다(불변). */
export function withDayRecord(
  store: PetRecordStore,
  key: string,
  record: PetDayRecord,
): PetRecordStore {
  return {
    version: 1,
    days: { ...store.days, [key]: { seconds: Math.round(record.seconds), pets: record.pets } },
  };
}

export interface WeekBar {
  key: string;
  label: string;
  seconds: number;
  /** 주간 최댓값 대비 비율 0..1 */
  ratio: number;
  isToday: boolean;
}

/** 월요일 시작 기준 이번 주 7일치. 디자인 시안의 막대 그래프에 그대로 대응한다. */
export function weekSeries(store: PetRecordStore, now: Date = new Date()): WeekBar[] {
  const monday = new Date(now);
  const offset = (now.getDay() + 6) % 7; // 월=0
  monday.setDate(now.getDate() - offset);
  monday.setHours(0, 0, 0, 0);

  const todayKey = dateKey(now);
  const bars = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    const key = dateKey(day);
    return {
      key,
      label: WEEKDAY_LABELS[day.getDay()],
      seconds: dayRecord(store, key).seconds,
      ratio: 0,
      isToday: key === todayKey,
    };
  });

  const max = Math.max(60, ...bars.map((bar) => bar.seconds));
  return bars.map((bar) => ({ ...bar, ratio: bar.seconds / max }));
}

/** 누적 쓰담 횟수 */
export function totalPets(store: PetRecordStore): number {
  return Object.values(store.days).reduce((sum, day) => sum + day.pets, 0);
}

/** 오늘(또는 어제)부터 거슬러 올라가며 세는 연속 방문 일수 */
export function visitStreak(store: PetRecordStore, now: Date = new Date()): number {
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  // 오늘 아직 기록이 없으면 어제부터 센다.
  if (dayRecord(store, dateKey(cursor)).seconds <= 0) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (dayRecord(store, dateKey(cursor)).seconds > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** 초 → 'MM:SS' */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function formatCount(count: number): string {
  return count.toLocaleString('ko-KR');
}
