/**
 * 강아지 도메인 타입.
 *
 * 이 폴더(`src/core`)의 코드는 DOM / React / Next.js에 의존하지 않는다.
 * Web, PWA, 향후 Tauri WebView 어디에서든 그대로 재사용할 수 있어야 한다.
 */

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * 상태 머신의 현재 행동.
 * Phase 2에서 `bliss`(완전히 녹음)와 `annoyed`(싫어하는 손길)가 추가됐다.
 */
export type DogAction =
  | 'idle'
  | 'looking'
  | 'petting'
  | 'happy'
  | 'bliss'
  | 'annoyed'
  | 'sleepy';

/** 행동보다 느리게 변하는 감정 레이블. UI 문구/표정 선택에 쓰인다. */
export type DogMood = 'calm' | 'curious' | 'delighted' | 'blissful' | 'grumpy' | 'drowsy';

/** 쓰다듬기 부위. 품종마다 부위별 호감도가 다르다(Phase 2). */
export type PetZoneId = 'head' | 'ear' | 'chin' | 'back' | 'belly' | 'tail' | 'paw' | 'none';

/** 쓰다듬는 속도 구간 */
export type SpeedBand = 'slow' | 'mid' | 'fast';

/** 쓰다듬는 방향(털의 결 기준) */
export type GrainBand = 'with' | 'across' | 'against';

/**
 * 강아지의 논리 상태. UI가 아니라 로직이 소유한다.
 */
export interface DogState {
  /** 현재 행동(상태 머신 노드) */
  currentAction: DogAction;
  /** 파생된 기분 */
  mood: DogMood;
  /** 애정도 0..1 — 좋아하는 손길이면 오르고, 싫어하는 손길이면 오르지 않는다 */
  affection: number;
  /** 활력 0..1 — 낮아지면 졸려한다 */
  energy: number;
  /** 주의 집중도 0..1 — 최근 입력이 있을수록 높다 */
  attention: number;
  /** 마지막으로 쓰다듬힌 부위 */
  lastZone: PetZoneId;
  /** 지금 쓰다듬고 있는 부위(손을 떼면 none) */
  activeZone: PetZoneId;
  /** 커서가 올라가 있는 부위 */
  hoverZone: PetZoneId;
  /** 이번 세션에서 쓰다듬은 누적 시간(초) */
  petSeconds: number;
  /** 이번 세션의 쓰담 횟수(쓰다듬기 시작 판정 기준) */
  petCount: number;
  /** 현재 손길의 만족도 -1..1 — 부위 호감도 × 속도 × 방향 */
  quality: number;
  /** 최근 쓰다듬기 속도(SVG 단위/초) */
  speed: number;
  /** 쓰다듬는 방향 -1(역방향) .. 1(털 방향) */
  grain: number;
}

/**
 * 애니메이션이 매 프레임 보간하는 연속 값.
 * 숫자만 담고, SVG 문자열 같은 표현 형식은 `dogRender.ts`가 만든다.
 */
export interface DogVisual {
  /** 머리 좌우 이동(px, SVG 좌표계) */
  headX: number;
  /** 머리 상하 이동 */
  headY: number;
  /** 머리 회전(deg) */
  headRotation: number;
  /** 눈동자 이동 */
  eyeX: number;
  eyeY: number;
  /** 호흡 (-1..1 스케일 계수의 재료) */
  breathe: number;
  /** 꼬리 회전(deg) */
  tailAngle: number;
  /** 귀 회전(deg, 좌측 기준. 우측은 반대 부호) */
  earAngle: number;
  /** 몸 전체 상하 튀어오름(px) */
  hop: number;
  /** 앞발 들기 0..1 */
  pawLift: number;
  /** 몸을 기대는 정도 -1(뒷걸음) .. 1(기댐) */
  lean: number;
  /** 눈 깜빡임 여부 */
  blinking: boolean;
}

/** 눈 표현 방식 */
export type EyeVariant = 'open' | 'closed' | 'flat';

/**
 * 렌더러가 그대로 DOM 속성에 꽂아 넣을 수 있는 최종 표현값.
 * 문자열 조립까지 코어에서 담당해 UI 레이어를 얇게 유지한다.
 */
export interface DogPose {
  headTransform: string;
  bodyTransform: string;
  hopTransform: string;
  tailTransform: string;
  earLeftTransform: string;
  earRightTransform: string;
  pawLeftTransform: string;
  pawRightTransform: string;
  eyeShift: string;
  eyeRy: number;
  eyesOpenOpacity: number;
  eyesClosedOpacity: number;
  eyesFlatOpacity: number;
  blushOpacity: number;
  heartsOpacity: number;
  zzzOpacity: number;
  mouthPath: string;
  tongueOpacity: number;
  /** 부위 하이라이트 원 */
  zoneCx: number;
  zoneCy: number;
  zoneR: number;
  zoneOpacity: number;
  /** 말풍선 이모트 */
  emoteOpacity: number;
  emoteIcon: string;
  emoteColor: string;
  emoteTransform: string;
  /** 나비(랜덤 행동) */
  butterflyOpacity: number;
  butterflyTransform: string;
  wingLeftPath: string;
  wingRightPath: string;
}

/** 포인터 입력 1샘플. DOM 이벤트가 아니라 정규화된 숫자만 넘긴다. */
export interface PointerSample {
  /** 스테이지 기준 좌표(px) — 리플/커서 이펙트 위치 */
  stage: Vec2;
  /** 스테이지 정규화 좌표(-1..1) — 시선/고개 방향 */
  normal: Vec2;
  /** 강아지 로컬 좌표(SVG viewBox 기준) — 쓰다듬기 영역 판정 */
  local: Vec2;
  /** 입력 시각(ms) */
  time: number;
}

/** 반응 기록 한 줄의 성격 */
export type LogKind = 'good' | 'soft' | 'bad';

/** 엔진이 밖으로 내보내는 사건. UI는 이걸 보고 이펙트/사운드/기록을 갱신한다. */
export type DogEvent =
  | { type: 'ripple'; at: Vec2; zone: PetZoneId; good: boolean }
  | { type: 'action'; action: DogAction; previous: DogAction }
  | { type: 'petStart'; zone: PetZoneId }
  | { type: 'petEnd'; seconds: number }
  | { type: 'log'; text: string; kind: LogKind }
  | { type: 'act'; name: string };

export type DogEventListener = (event: DogEvent) => void;
