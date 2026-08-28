'use client';

import { forwardRef, useId, useImperativeHandle, useRef, type RefObject } from 'react';

import {
  headOutlinePath,
  NEUTRAL_DEFORM,
  restingPose,
  type BreedProfile,
  type DogPose,
} from '@/core/dog';

export interface DogSvgHandle {
  /** 매 프레임 호출된다. 리렌더 없이 SVG 속성만 갱신한다. */
  applyPose: (pose: DogPose) => void;
}

interface DogSvgProps {
  /** 그릴 품종 — 파츠 경로와 색이 여기서 나온다. */
  breed: BreedProfile;
  /** 포인터 좌표를 SVG 좌표로 바꾸기 위해 상위에서 잡아 두는 참조 */
  svgRef?: RefObject<SVGSVGElement | null>;
  className?: string;
}

const TONGUE_PATH = 'M285 328 C 285 320 315 320 315 328 C 322 352 316 366 300 366 C 284 366 278 352 285 328 Z';
const TONGUE_CREASE = 'M300 336 L 300 356';
const BLAZE_PATH = 'M300 148 C 282 190 278 244 288 300 L 312 300 C 322 244 318 190 300 148 Z';

/**
 * 강아지 일러스트.
 *
 * 상태를 전혀 모른다. 품종(생김새)과 pose(문자열/숫자)를 받아 그릴 뿐이다.
 * 덕분에 같은 일러스트를 웹·PWA·데스크톱 어디서든 재사용할 수 있다.
 */
export const DogSvg = forwardRef<DogSvgHandle, DogSvgProps>(function DogSvg(
  { breed, svgRef, className },
  ref,
) {
  const zone = useRef<SVGCircleElement>(null);
  const hop = useRef<SVGGElement>(null);
  const tail = useRef<SVGGElement>(null);
  const body = useRef<SVGGElement>(null);
  const pawLeft = useRef<SVGGElement>(null);
  const pawRight = useRef<SVGGElement>(null);
  const head = useRef<SVGGElement>(null);
  const headShape = useRef<SVGPathElement>(null);
  const headClip = useRef<SVGPathElement>(null);
  const face = useRef<SVGGElement>(null);
  const cheekLeft = useRef<SVGGElement>(null);
  const cheekRight = useRef<SVGGElement>(null);
  const blushLeft = useRef<SVGGElement>(null);
  const blushRight = useRef<SVGGElement>(null);
  const earLeft = useRef<SVGGElement>(null);
  const earRight = useRef<SVGGElement>(null);
  const eyeShift = useRef<SVGGElement>(null);
  const eyeLeft = useRef<SVGEllipseElement>(null);
  const eyeRight = useRef<SVGEllipseElement>(null);
  const eyesOpen = useRef<SVGGElement>(null);
  const eyesClosed = useRef<SVGGElement>(null);
  const eyesFlat = useRef<SVGGElement>(null);
  const blush = useRef<SVGGElement>(null);
  const hearts = useRef<SVGGElement>(null);
  const zzz = useRef<SVGGElement>(null);
  const mouth = useRef<SVGPathElement>(null);
  const tongue = useRef<SVGGElement>(null);
  const emote = useRef<SVGGElement>(null);
  const emoteText = useRef<SVGTextElement>(null);
  const butterfly = useRef<SVGGElement>(null);
  const wingLeft = useRef<SVGPathElement>(null);
  const wingRight = useRef<SVGPathElement>(null);
  const lastIcon = useRef('');

  useImperativeHandle(ref, () => ({
    applyPose(pose) {
      hop.current?.setAttribute('transform', pose.hopTransform);
      tail.current?.setAttribute('transform', pose.tailTransform);
      body.current?.setAttribute('transform', pose.bodyTransform);
      pawLeft.current?.setAttribute('transform', pose.pawLeftTransform);
      pawRight.current?.setAttribute('transform', pose.pawRightTransform);
      head.current?.setAttribute('transform', pose.headTransform);
      // 볼 스쿼시 — 얼굴 윤곽선과 볼 살을 매 프레임 직접 갱신한다.
      headShape.current?.setAttribute('d', pose.headPath);
      headClip.current?.setAttribute('d', pose.headPath);
      face.current?.setAttribute('transform', pose.faceTransform);
      cheekLeft.current?.setAttribute('transform', pose.cheekLeftTransform);
      cheekRight.current?.setAttribute('transform', pose.cheekRightTransform);
      blushLeft.current?.setAttribute('transform', pose.cheekLeftTransform);
      blushRight.current?.setAttribute('transform', pose.cheekRightTransform);
      earLeft.current?.setAttribute('transform', pose.earLeftTransform);
      earRight.current?.setAttribute('transform', pose.earRightTransform);
      eyeShift.current?.setAttribute('transform', pose.eyeShift);
      eyeLeft.current?.setAttribute('ry', String(pose.eyeRy));
      eyeRight.current?.setAttribute('ry', String(pose.eyeRy));
      eyesOpen.current?.setAttribute('opacity', String(pose.eyesOpenOpacity));
      eyesClosed.current?.setAttribute('opacity', String(pose.eyesClosedOpacity));
      eyesFlat.current?.setAttribute('opacity', String(pose.eyesFlatOpacity));
      blush.current?.setAttribute('opacity', String(pose.blushOpacity));
      hearts.current?.setAttribute('opacity', String(pose.heartsOpacity));
      zzz.current?.setAttribute('opacity', String(pose.zzzOpacity));
      mouth.current?.setAttribute('d', pose.mouthPath);
      tongue.current?.setAttribute('opacity', String(pose.tongueOpacity));

      zone.current?.setAttribute('cx', String(pose.zoneCx));
      zone.current?.setAttribute('cy', String(pose.zoneCy));
      zone.current?.setAttribute('r', String(pose.zoneR));
      zone.current?.setAttribute('opacity', String(pose.zoneOpacity));

      emote.current?.setAttribute('transform', pose.emoteTransform);
      emote.current?.setAttribute('opacity', String(pose.emoteOpacity));
      if (emoteText.current) {
        emoteText.current.setAttribute('fill', pose.emoteColor);
        if (lastIcon.current !== pose.emoteIcon) {
          lastIcon.current = pose.emoteIcon;
          emoteText.current.textContent = pose.emoteIcon;
        }
      }

      butterfly.current?.setAttribute('transform', pose.butterflyTransform);
      butterfly.current?.setAttribute('opacity', String(pose.butterflyOpacity));
      wingLeft.current?.setAttribute('d', pose.wingLeftPath);
      wingRight.current?.setAttribute('d', pose.wingRightPath);
    },
  }));

  // 한 화면에 강아지가 여러 마리 있어도 클립 경로가 겹치지 않도록.
  const faceClipId = `pupat-face-${useId().replace(/:/g, '')}`;
  const shape = breed.shape;
  const color = breed.palette;
  // 서버/첫 페인트용 정지 포즈. 이후에는 applyPose가 덮어쓴다.
  const initial = restingPose(shape.headRx, shape.headRy);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 600 600"
      className={className}
      style={{ overflow: 'visible' }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={faceClipId}>
          <path
            ref={headClip}
            d={headOutlinePath(shape.headRx, shape.headRy, NEUTRAL_DEFORM, NEUTRAL_DEFORM)}
          />
        </clipPath>
      </defs>

      <ellipse cx="300" cy="546" rx="176" ry="20" fill="var(--color-shadow)" opacity="0.18" />

      {/* 커서가 올라간 부위를 은은하게 밝혀 준다 */}
      <circle
        ref={zone}
        cx={initial.zoneCx}
        cy={initial.zoneCy}
        r={initial.zoneR}
        opacity={initial.zoneOpacity}
        fill="var(--color-zone)"
        style={{ transition: 'opacity 0.25s ease' }}
      />

      <g ref={hop} transform={initial.hopTransform}>
        <g
          ref={tail}
          transform={initial.tailTransform}
          style={{ transition: 'transform 0.1s linear' }}
        >
          <path d={shape.tailPath} fill={color.coatDark} />
          <path d={shape.tailTipPath} fill={color.coatLight} />
        </g>

        <g ref={body} transform={initial.bodyTransform}>
          <ellipse cx="300" cy={shape.bodyCy} rx={shape.bodyRx} ry={shape.bodyRy} fill={color.coat} />
          <ellipse
            cx="300"
            cy={shape.bellyCy}
            rx={shape.bellyRx}
            ry={shape.bellyRy}
            fill={color.coatLight}
          />
          <g ref={pawLeft} transform={initial.pawLeftTransform}>
            <rect
              x={shape.legLX}
              y={shape.legY}
              width={shape.legW}
              height={shape.legH}
              rx="20"
              fill={color.coatLight}
            />
          </g>
          <g ref={pawRight} transform={initial.pawRightTransform}>
            <rect
              x={shape.legRX}
              y={shape.legY}
              width={shape.legW}
              height={shape.legH}
              rx="20"
              fill={color.coatLight}
            />
          </g>
        </g>

        <g
          ref={head}
          transform={initial.headTransform}
          style={{ transition: 'transform 0.14s cubic-bezier(0.22,0.61,0.36,1)' }}
        >
          <g
            ref={earLeft}
            transform={initial.earLeftTransform}
            style={{ transition: 'transform 0.2s ease' }}
          >
            <path d={shape.earLeftPath} fill={color.coatDark} />
            <path d={shape.earLeftInnerPath} fill={color.earInner} />
          </g>
          <g
            ref={earRight}
            transform={initial.earRightTransform}
            style={{ transition: 'transform 0.2s ease' }}
          >
            <path d={shape.earRightPath} fill={color.coatDark} />
            <path d={shape.earRightInnerPath} fill={color.earInner} />
          </g>

          {/* 얼굴 — 양쪽 볼을 동시에 잡아 벌리면 이 그룹이 좌우로 늘어난다 */}
          <g ref={face} transform={initial.faceTransform}>
            {/* 머리 윤곽선. 타원이 아니라 경로여야 볼이 눌린 자리를 표현할 수 있다. */}
            <path
              ref={headShape}
              d={headOutlinePath(shape.headRx, shape.headRy, NEUTRAL_DEFORM, NEUTRAL_DEFORM)}
              fill={color.coat}
            />
            <path d={BLAZE_PATH} fill={color.coatLight} opacity={color.blazeOpacity} />
            {/* 볼 살은 얼굴 밖으로 밀려 나가면 안 된다 — 윤곽선으로 잘라 낸다 */}
            <g clipPath={`url(#${faceClipId})`}>
              <g ref={cheekLeft} transform={initial.cheekLeftTransform}>
                <ellipse
                  cx="228"
                  cy="300"
                  rx="42"
                  ry="34"
                  fill={color.coatLight}
                  opacity={color.cheekOpacity}
                />
              </g>
              <g ref={cheekRight} transform={initial.cheekRightTransform}>
                <ellipse
                  cx="372"
                  cy="300"
                  rx="42"
                  ry="34"
                  fill={color.coatLight}
                  opacity={color.cheekOpacity}
                />
              </g>
            </g>
            <ellipse cx="300" cy="304" rx={shape.muzzleRx} ry={shape.muzzleRy} fill={color.coatLight} />

            <g
              ref={blush}
              opacity={initial.blushOpacity}
              clipPath={`url(#${faceClipId})`}
              style={{ transition: 'opacity 0.4s ease' }}
            >
              <g ref={blushLeft} transform={initial.cheekLeftTransform}>
                <ellipse cx="196" cy="298" rx="26" ry="15" fill="var(--color-blush)" opacity="0.55" />
              </g>
              <g ref={blushRight} transform={initial.cheekRightTransform}>
                <ellipse cx="404" cy="298" rx="26" ry="15" fill="var(--color-blush)" opacity="0.55" />
              </g>
            </g>

            <g
              ref={eyesOpen}
              opacity={initial.eyesOpenOpacity}
              style={{ transition: 'opacity 0.1s ease' }}
            >
              <g
                ref={eyeShift}
                transform={initial.eyeShift}
                style={{ transition: 'transform 0.14s ease' }}
              >
                <ellipse ref={eyeLeft} cx="248" cy="256" rx="17" ry={initial.eyeRy} fill="var(--color-eye)" />
                <ellipse ref={eyeRight} cx="352" cy="256" rx="17" ry={initial.eyeRy} fill="var(--color-eye)" />
                <circle cx="254" cy="249" r="5.5" fill="var(--color-highlight)" />
                <circle cx="358" cy="249" r="5.5" fill="var(--color-highlight)" />
              </g>
            </g>
            <g
              ref={eyesClosed}
              opacity={initial.eyesClosedOpacity}
              style={{ transition: 'opacity 0.1s ease' }}
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
              style={{ transition: 'opacity 0.1s ease' }}
              fill="none"
              stroke="var(--color-eye)"
              strokeWidth="7"
              strokeLinecap="round"
            >
              <path d="M230 258 Q 248 266 266 258" />
              <path d="M334 258 Q 352 266 370 258" />
            </g>

            <ellipse cx="300" cy="292" rx="19" ry="14" fill="var(--color-nose)" />
            <g ref={tongue} opacity={initial.tongueOpacity} style={{ transition: 'opacity 0.2s ease' }}>
              <path d={TONGUE_PATH} fill="var(--color-tongue)" />
              <path
                d={TONGUE_CREASE}
                fill="none"
                stroke="var(--color-tongue-crease)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
            <path
              ref={mouth}
              d={initial.mouthPath}
              fill="none"
              stroke="var(--color-nose)"
              strokeWidth="6"
              strokeLinecap="round"
              style={{ transition: 'd 0.18s ease' }}
            />
          </g>
        </g>
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

      {/* 가끔 날아오는 나비 — 강아지가 눈으로 쫓는다 */}
      <g
        ref={butterfly}
        transform={initial.butterflyTransform}
        opacity={initial.butterflyOpacity}
        style={{ transition: 'opacity 0.4s ease' }}
      >
        <path ref={wingLeft} d={initial.wingLeftPath} fill="var(--color-wing)" />
        <path ref={wingRight} d={initial.wingRightPath} fill="var(--color-wing-light)" />
        <ellipse cx="0" cy="0" rx="3" ry="9" fill="var(--color-wing-body)" />
      </g>

      <g
        ref={emote}
        transform={initial.emoteTransform}
        opacity={initial.emoteOpacity}
        style={{ transition: 'opacity 0.25s ease' }}
      >
        <rect
          x="-40"
          y="-34"
          width="80"
          height="56"
          rx="24"
          fill="var(--color-bubble)"
          stroke="var(--color-line-soft)"
          strokeWidth="2"
        />
        <path d="M-9 20 L 2 38 L 12 20 Z" fill="var(--color-bubble)" />
        <text
          ref={emoteText}
          x="0"
          y="8"
          textAnchor="middle"
          fontSize="38"
          fill={initial.emoteColor}
          fontFamily="var(--font-sans)"
        />
      </g>
    </svg>
  );
});
