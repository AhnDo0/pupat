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

/** 상태 머신의 현재 행동. PRD 6장의 상태와 1:1로 대응한다. */
export type DogAction = 'idle' | 'looking' | 'petting' | 'happy' | 'sleepy';

/** 행동보다 느리게 변하는 감정 레이블. UI 문구/표정 선택에 쓰인다. */
export type DogMood = 'calm' | 'curious' | 'delighted' | 'drowsy';

/** 쓰다듬기 영역. MVP는 head/body 중심이지만 부위별 반응 확장을 위해 미리 나눠 둔다. */
export type PetZoneId = 'head' | 'earLeft' | 'earRight' | 'body' | 'tail' | 'none';

/**
 * 강아지의 논리 상태. UI가 아니라 로직이 소유한다.
 */
export interface DogState {
  /** 현재 행동(상태 머신 노드) */
  currentAction: DogAction;
  /** 파생된 기분 */
  mood: DogMood;
  /** 애정도 0..1 — 쓰다듬으면 오르고 멈추면 서서히 내려간다 */
  affection: number;
  /** 활력 0..1 — 낮아지면 졸려한다 */
  energy: number;
  /** 주의 집중도 0..1 — 최근 입력이 있을수록 높다 */
  attention: number;
  /** 마지막으로 쓰다듬힌 부위 */
  lastZone: PetZoneId;
  /** 이번 세션에서 쓰다듬은 누적 시간(초) */
  petSeconds: number;
  /** 이번 세션의 쓰담 횟수(쓰다듬기 시작 판정 기준) */
  petCount: number;
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
  tailTransform: string;
  earLeftTransform: string;
  earRightTransform: string;
  eyeShift: string;
  eyesOpenOpacity: number;
  eyesClosedOpacity: number;
  eyesFlatOpacity: number;
  blushOpacity: number;
  heartsOpacity: number;
  zzzOpacity: number;
  mouthPath: string;
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

/** 엔진이 밖으로 내보내는 사건. UI는 이걸 보고 이펙트/사운드를 재생한다. */
export type DogEvent =
  | { type: 'ripple'; at: Vec2; zone: PetZoneId }
  | { type: 'action'; action: DogAction; previous: DogAction }
  | { type: 'petStart'; zone: PetZoneId }
  | { type: 'petEnd'; seconds: number };

export type DogEventListener = (event: DogEvent) => void;
