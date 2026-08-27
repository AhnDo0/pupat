# 쓰담하개 (PuPat)

> 키울 수는 없어도, 쓰다듬을 수는 있으니까.

마우스와 손가락으로 강아지를 직접 쓰다듬는 인터랙티브 웹 서비스.
**하나의 Next.js + React 코드베이스**로 Desktop Web / Mobile Web / PWA를 지원하고,
같은 UI와 핵심 로직을 향후 Tauri Desktop App에서 그대로 재사용하는 것을 목표로 한다.

## 시작하기

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # 프로덕션 빌드
npm run typecheck  # 타입 검사
npm run icons      # 앱 아이콘 재생성 (public/icons)
```

## 구조

```
src/
├── core/                     ← 브라우저 API를 쓰지 않는 순수 로직
│   ├── dog/
│   │   ├── types.ts          상태·비주얼·입력 타입
│   │   ├── config.ts         인터랙션 튜닝 값 + 입력 프로파일(fine/coarse)
│   │   ├── breeds.ts         품종표 — 생김새·색·성격(부위 호감도/선호 속도/행동)
│   │   ├── dogState.ts       상태 머신 (idle/looking/petting/happy/bliss/annoyed/sleepy)
│   │   ├── dogBehavior.ts    상태별 몸짓 규칙표(호흡·꼬리·귀·표정·문구)
│   │   ├── dogActs.ts        idle/랜덤 행동 12종의 연출
│   │   ├── dogInteraction.ts 쓰다듬기 판정 (누름 + 이동거리 + 속도 + 방향)
│   │   ├── dogAnimation.ts   프레임 보간
│   │   ├── dogRender.ts      숫자 → SVG 속성값
│   │   ├── dogReadout.ts     쓰담 분석 4줄(부위·속도·방향·반응)
│   │   ├── petZones.ts       부위별 쓰다듬기 영역 (품종 몸 치수에서 계산)
│   │   ├── korean.ts         조사(은/는, 을/를) 처리
│   │   └── dogEngine.ts      위를 묶는 엔진 (DOM 의존 0)
│   └── record/petRecord.ts   쓰담 기록 계산(오늘/이번 주/연속 방문)
│
├── platform/                 ← 플랫폼 어댑터 (교체 지점)
│   ├── types.ts              StorageAdapter / SoundAdapter 인터페이스
│   ├── web/webStorage.ts     localStorage (실패 시 메모리 폴백)
│   ├── web/webSound.ts       Web Audio 합성음
│   └── index.ts              getPlatform() / setPlatform()
│
├── hooks/                    ← React ↔ core 연결
│   ├── useDogEngine.ts       Pointer Events → 엔진, 프레임 → DOM
│   ├── useBreed.ts           마지막에 고른 강아지 기억
│   ├── useAnimationFrame.ts
│   ├── useMediaQuery.ts      포인터 종류 / prefers-reduced-motion
│   ├── usePetRecord.ts
│   └── useInstallPrompt.ts
│
├── lib/pointer.ts            DOM PointerEvent → 정규화된 샘플
│
├── components/
│   ├── dog/                  DogSvg, PetStage, PetHint, PetOverlay,
│   │                         BreedPicker, TraitCard, AnalysisCard,
│   │                         ReactionLog, ReadoutStrip, SidePanel
│   ├── layout/               AppHeader, AppFooter
│   ├── record/RecordPanel.tsx
│   └── pwa/                  InstallPrompt, ServiceWorkerRegistrar
│
└── app/                      page(/) · record(/record) · layout · globals.css
```

### 데이터 흐름

```
사용자 입력 (마우스 / 터치 / 펜)
      ↓  Pointer Events
lib/pointer.ts            ← 유일한 DOM 의존 지점
      ↓  PointerSample { stage, normal, local }
DogEngine
  ├─ PetTracker           쓰다듬기 판정 + 속도/방향 측정
  ├─ breeds               이 품종이 이 부위·속도·방향을 좋아하는가 → 만족도
  ├─ dogState             상태 전이
  ├─ dogBehavior          이 상태에서 몸이 어떻게 움직이는가
  ├─ dogActs              가만히 있을 때 하는 행동
  └─ dogAnimation         프레임 보간
      ↓  DogPose (문자열/숫자)
DogSvg.applyPose()        ← 리렌더 없이 SVG 속성만 갱신
```

리렌더는 **이산 상태가 바뀔 때만** 일어난다(행동 변화, 초 단위 타이머).
고개 각도·꼬리·호흡 같은 연속 값은 `requestAnimationFrame` 안에서 DOM에 직접 반영한다.

## 강아지 반응 (Phase 2)

쓰다듬기의 결과는 **부위 호감도 × 속도 궁합 × 털 방향** 세 값의 곱(만족도)으로 정해진다.
만족도가 음수면 강아지가 싫어하고(`annoyed`), 높은 만족도를 이어 가면 `happy` → `bliss`로 녹는다.

| 품종 | 좋아하는 속도 | 특징 |
|---|---|---|
| 리트리버 | 보통 | 어디를 만져도 좋아함, 배 쓰담 최고 |
| 웰시코기 | 빠름 | 꼬리 민감, 자주 짖음 |
| 시바견 | 느림 | 배·발 금지, 고개 갸웃 |

- 부위 7곳: 정수리 · 귀 · 턱 · 등 · 배 · 꼬리 · 발 (`petZones.ts`, 품종 몸 치수에서 계산)
- 속도: 느긋 / 알맞음 / 빠름 — 품종의 취향과 어긋날수록 만족도가 깎인다
- 방향: 털 방향 / 가로 / 역방향 — 털을 거스르면 깎인다
- idle·랜덤 행동 12종: 하품·기지개·귀 털기·긁기·냄새 맡기·고개 갸웃·털기·짖기·나비 쫓기·재채기·주머니 폭주
- 반응 기록: 강아지가 방금 무엇에 반응했는지 최근 3줄

새 품종은 `breeds.ts`에 항목 하나를 더하는 것으로 끝난다. 엔진과 UI는 손대지 않는다.

## 반응형

별도의 모바일 페이지나 PWA 전용 화면을 만들지 않는다.
같은 컴포넌트가 breakpoint(`sm` = 640px)에 따라 다르게 보인다.

| | Mobile | Desktop |
|---|---|---|
| 상단 | 상태 · 오늘의 쓰담 시간 | 브랜드 + 상태 · 품종 선택 · 사운드 토글 |
| 강아지 | `max-h: min(44vh, 420px)` | `max-h: min(56vh, 560px)` |
| 안내 문구 | 15px | 17px |
| 애정 바 | 140px | 200px |
| 품종 선택 | 강아지 아래 | 상단 바 |
| 성격 · 분석 · 기록 | 한 줄 요약(`ReadoutStrip`) | 오른쪽 사이드 패널(`lg` 이상) |
| 하단 | (상단 타이머로 대체) | 오늘의 쓰담 |
| 커서 | 손끝 글로우 | 발바닥 커서 + 글로우 + 부위 이름 |
| 판정 | 영역을 넓혀 큰 터치 타깃 | 촘촘한 판정 |

입력 방식 차이는 **애플리케이션을 나누지 않고** `INPUT_PROFILES`(`core/dog/config.ts`)의
`fine` / `coarse` 프로파일로 같은 엔진 안에서 처리한다.

## PWA

기존 웹 앱에 얹기만 한다. 지워도 앱은 그대로 동작한다.

- `public/manifest.webmanifest` — standalone, 아이콘, 바로가기
- `public/sw.js` — 앱 셸 프리캐시, 네비게이션 network-first, 정적 자원 cache-first
- `components/pwa/ServiceWorkerRegistrar.tsx` — 프로덕션에서만 등록
- `components/pwa/InstallPrompt.tsx` — `beforeinstallprompt`가 올 때만 뜨는 설치 카드
- 아이콘: `npm run icons` (`scripts/generate-icons.mjs`가 oklch → sRGB 변환 후 PNG 생성)

모바일 웹과 PWA는 **같은 React 컴포넌트**를 쓴다. 설치 여부로 UI가 갈리지 않는다.

## Desktop App(Tauri) 확장 지점

현재는 Tauri/Rust를 도입하지 않았지만 다음이 이미 준비되어 있다.

1. `src/core/**` 는 DOM·React·Next.js를 import 하지 않는다. 시간은 인자로 받고 입력은 숫자로 받는다.
2. 저장소와 사운드는 `src/platform` 어댑터 뒤에 있다. Tauri에서는
   `setPlatform({ kind: 'desktop', storage: tauriStore, createSound })` 한 줄로 교체한다.
3. `detectPlatformKind()`가 Tauri WebView를 인식한다.
4. `PUPAT_TARGET=static npm run build` 로 정적 내보내기가 가능하다(Tauri가 로드할 번들).

## 접근성

- `prefers-reduced-motion`: 반복 애니메이션 정지 + 엔진 진폭 축소
- 사운드 기본 꺼짐, 사용자가 직접 켠다
- 강아지 상태를 설명하는 스크린 리더용 텍스트 제공

## 기록

기록은 `localStorage`에만 저장된다. 서버·로그인·DB가 없다.
