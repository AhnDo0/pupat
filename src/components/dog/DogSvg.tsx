'use client';

import { forwardRef, useImperativeHandle, useRef, type RefObject } from 'react';

import { createVisual, poseFrom, type DogPose } from '@/core/dog';

export interface DogSvgHandle {
  /** 매 프레임 호출된다. 리렌더 없이 SVG 속성만 갱신한다. */
  applyPose: (pose: DogPose) => void;
}

interface DogSvgProps {
  /** 포인터 좌표를 SVG 좌표로 바꾸기 위해 상위에서 잡아 두는 참조 */
  svgRef?: RefObject<SVGSVGElement | null>;
  className?: string;
}

/**
 * 강아지 일러스트.
 *
 * 상태를 전혀 모른다. 오직 pose(문자열/숫자)를 받아 그린다.
 * 덕분에 같은 일러스트를 웹·PWA·데스크톱 어디서든 재사용할 수 있다.
 */
export const DogSvg = forwardRef<DogSvgHandle, DogSvgProps>(function DogSvg(
  { svgRef, className },
  ref,
) {
  const tail = useRef<SVGGElement>(null);
  const body = useRef<SVGGElement>(null);
  const head = useRef<SVGGElement>(null);
  const earLeft = useRef<SVGGElement>(null);
  const earRight = useRef<SVGGElement>(null);
  const eyeShift = useRef<SVGGElement>(null);
  const eyesOpen = useRef<SVGGElement>(null);
  const eyesClosed = useRef<SVGGElement>(null);
  const eyesFlat = useRef<SVGGElement>(null);
  const blush = useRef<SVGGElement>(null);
  const hearts = useRef<SVGGElement>(null);
  const zzz = useRef<SVGGElement>(null);
  const mouth = useRef<SVGPathElement>(null);

  useImperativeHandle(ref, () => ({
    applyPose(pose) {
      tail.current?.setAttribute('transform', pose.tailTransform);
      body.current?.setAttribute('transform', pose.bodyTransform);
      head.current?.setAttribute('transform', pose.headTransform);
      earLeft.current?.setAttribute('transform', pose.earLeftTransform);
      earRight.current?.setAttribute('transform', pose.earRightTransform);
      eyeShift.current?.setAttribute('transform', pose.eyeShift);
      eyesOpen.current?.setAttribute('opacity', String(pose.eyesOpenOpacity));
      eyesClosed.current?.setAttribute('opacity', String(pose.eyesClosedOpacity));
      eyesFlat.current?.setAttribute('opacity', String(pose.eyesFlatOpacity));
      blush.current?.setAttribute('opacity', String(pose.blushOpacity));
      hearts.current?.setAttribute('opacity', String(pose.heartsOpacity));
      zzz.current?.setAttribute('opacity', String(pose.zzzOpacity));
      mouth.current?.setAttribute('d', pose.mouthPath);
    },
  }));

  // 서버/첫 페인트용 정지 포즈. 이후에는 applyPose가 덮어쓴다.
  const initial = poseFrom(createVisual(), 'idle');

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 600 600"
      className={className}
      style={{ overflow: 'visible' }}
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="300" cy="546" rx="176" ry="20" fill="var(--color-shadow)" opacity="0.18" />

      <g ref={tail} transform={initial.tailTransform} style={{ transition: 'transform 0.12s linear' }}>
        <path
          d="M424 432 C 470 424 498 392 492 352 C 490 338 474 334 466 346 C 452 368 440 388 414 402 Z"
          fill="var(--color-coat-dark)"
        />
        <path
          d="M486 352 C 490 372 480 386 468 394 C 480 380 482 366 480 354 Z"
          fill="var(--color-coat-light)"
        />
      </g>

      <g ref={body} transform={initial.bodyTransform}>
        <ellipse cx="300" cy="436" rx="152" ry="112" fill="var(--color-coat)" />
        <ellipse cx="300" cy="470" rx="96" ry="72" fill="var(--color-coat-light)" />
        <rect x="216" y="500" width="62" height="44" rx="22" fill="var(--color-coat-light)" />
        <rect x="322" y="500" width="62" height="44" rx="22" fill="var(--color-coat-light)" />
      </g>

      <g
        ref={head}
        transform={initial.headTransform}
        style={{ transition: 'transform 0.16s cubic-bezier(0.22,0.61,0.36,1)' }}
      >
        <g
          ref={earLeft}
          transform={initial.earLeftTransform}
          style={{ transition: 'transform 0.24s ease' }}
        >
          <path
            d="M212 214 C 196 168 200 122 216 104 C 232 118 258 152 268 196 Z"
            fill="var(--color-coat-dark)"
          />
          <path
            d="M222 200 C 212 170 214 142 222 128 C 232 146 244 172 250 194 Z"
            fill="var(--color-ear-inner)"
          />
        </g>
        <g
          ref={earRight}
          transform={initial.earRightTransform}
          style={{ transition: 'transform 0.24s ease' }}
        >
          <path
            d="M388 214 C 404 168 400 122 384 104 C 368 118 342 152 332 196 Z"
            fill="var(--color-coat-dark)"
          />
          <path
            d="M378 200 C 388 170 386 142 378 128 C 368 146 356 172 350 194 Z"
            fill="var(--color-ear-inner)"
          />
        </g>

        <ellipse cx="300" cy="268" rx="132" ry="118" fill="var(--color-coat)" />
        <ellipse cx="300" cy="304" rx="78" ry="62" fill="var(--color-coat-light)" />

        <g
          ref={blush}
          opacity={initial.blushOpacity}
          style={{ transition: 'opacity 0.4s ease' }}
        >
          <ellipse cx="196" cy="298" rx="26" ry="15" fill="var(--color-blush)" opacity="0.55" />
          <ellipse cx="404" cy="298" rx="26" ry="15" fill="var(--color-blush)" opacity="0.55" />
        </g>

        <g
          ref={eyesOpen}
          opacity={initial.eyesOpenOpacity}
          style={{ transition: 'opacity 0.12s ease' }}
        >
          <g
            ref={eyeShift}
            transform={initial.eyeShift}
            style={{ transition: 'transform 0.16s ease' }}
          >
            <ellipse cx="248" cy="256" rx="17" ry="19" fill="var(--color-eye)" />
            <ellipse cx="352" cy="256" rx="17" ry="19" fill="var(--color-eye)" />
            <circle cx="254" cy="249" r="5.5" fill="var(--color-highlight)" />
            <circle cx="358" cy="249" r="5.5" fill="var(--color-highlight)" />
          </g>
        </g>
        <g
          ref={eyesClosed}
          opacity={initial.eyesClosedOpacity}
          style={{ transition: 'opacity 0.12s ease' }}
          fill="none"
          stroke="var(--color-eye)"
          strokeWidth="7"
          strokeLinecap="round"
        >
          <path d="M228 260 Q 248 244 268 260" />
          <path d="M332 260 Q 352 244 372 260" />
        </g>
        <g
          ref={eyesFlat}
          opacity={initial.eyesFlatOpacity}
          style={{ transition: 'opacity 0.12s ease' }}
          fill="none"
          stroke="var(--color-eye)"
          strokeWidth="7"
          strokeLinecap="round"
        >
          <path d="M230 258 Q 248 266 266 258" />
          <path d="M334 258 Q 352 266 370 258" />
        </g>

        <ellipse cx="300" cy="292" rx="19" ry="14" fill="var(--color-nose)" />
        <path
          ref={mouth}
          d={initial.mouthPath}
          fill="none"
          stroke="var(--color-nose)"
          strokeWidth="6"
          strokeLinecap="round"
          style={{ transition: 'd 0.2s ease' }}
        />
      </g>

      <g ref={hearts} opacity={initial.heartsOpacity} style={{ transition: 'opacity 0.35s ease' }}>
        <circle cx="452" cy="230" r="9" fill="var(--color-heart-1)" className="sd-float" />
        <circle
          cx="486"
          cy="262"
          r="7"
          fill="var(--color-heart-2)"
          className="sd-float"
          style={{ animationDelay: '0.8s' }}
        />
        <circle
          cx="140"
          cy="248"
          r="8"
          fill="var(--color-heart-3)"
          className="sd-float"
          style={{ animationDelay: '1.6s' }}
        />
      </g>

      <g
        ref={zzz}
        opacity={initial.zzzOpacity}
        style={{ transition: 'opacity 0.5s ease' }}
        fill="var(--color-ink-faint)"
        fontFamily="var(--font-mono)"
        fontSize="26"
      >
        <text x="424" y="196" className="sd-zzz">
          z
        </text>
        <text x="440" y="164" className="sd-zzz" style={{ animationDelay: '1.2s' }}>
          z
        </text>
      </g>
    </svg>
  );
});
