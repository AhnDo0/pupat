/**
 * 앱 아이콘 생성기.
 *
 * 시안(쓰담하개 앱.dc.html, 화면 01)의 아이콘을 그대로 옮긴다.
 * - 108px 라운드 스퀘어(radius 28) + coat 색 배경
 * - 그 위에 강아지 일러스트의 머리 부분(viewBox "120 90 360 320")을 86px 폭으로
 *
 * 머리 타원은 배경과 같은 색이라 실루엣이 배경에 녹아들고
 * 귀 · 주둥이 · 눈 · 코 · 입만 떠오르는 것이 의도된 모습이다.
 *
 *   node scripts/generate-icons.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

/** oklch(L C H) → #rrggbb */
function oklchToHex(L, C, H) {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  const channel = (value) => {
    const clamped = Math.min(1, Math.max(0, value));
    const srgb = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return Math.round(srgb * 255)
      .toString(16)
      .padStart(2, '0');
  };

  return `#${linear.map(channel).join('')}`;
}

const palette = {
  coat: oklchToHex(0.85, 0.075, 68),
  coatDark: oklchToHex(0.74, 0.095, 58),
  coatLight: oklchToHex(0.965, 0.018, 84),
  earInner: oklchToHex(0.82, 0.05, 40),
  eye: oklchToHex(0.28, 0.02, 60),
  nose: oklchToHex(0.3, 0.025, 40),
  highlight: oklchToHex(0.99, 0.005, 90),
};

/** 시안의 아이콘 비율 (컨테이너 108 / 아트 86 / 라운드 28) */
const FRAME = { container: 108, art: 86, radius: 28 };
/** 아트가 잘라 쓰는 강아지 SVG 영역 */
const CROP = { x: 120, y: 90, width: 360, height: 320 };

/** 강아지 머리 — 원본 600 viewBox 좌표를 그대로 쓴다. */
function dogHead() {
  return `
    <path d="M212 214 C 196 168 200 122 216 104 C 232 118 258 152 268 196 Z" fill="${palette.coatDark}"/>
    <path d="M222 200 C 212 170 214 142 222 128 C 232 146 244 172 250 194 Z" fill="${palette.earInner}"/>
    <path d="M388 214 C 404 168 400 122 384 104 C 368 118 342 152 332 196 Z" fill="${palette.coatDark}"/>
    <path d="M378 200 C 388 170 386 142 378 128 C 368 146 356 172 350 194 Z" fill="${palette.earInner}"/>
    <ellipse cx="300" cy="268" rx="132" ry="118" fill="${palette.coat}"/>
    <ellipse cx="300" cy="304" rx="78" ry="62" fill="${palette.coatLight}"/>
    <ellipse cx="248" cy="256" rx="17" ry="19" fill="${palette.eye}"/>
    <ellipse cx="352" cy="256" rx="17" ry="19" fill="${palette.eye}"/>
    <circle cx="254" cy="249" r="5.5" fill="${palette.highlight}"/>
    <circle cx="358" cy="249" r="5.5" fill="${palette.highlight}"/>
    <ellipse cx="300" cy="292" rx="19" ry="14" fill="${palette.nose}"/>
    <path d="M276 310 Q 288 324 300 310 Q 312 324 324 310" fill="none" stroke="${palette.nose}" stroke-width="6" stroke-linecap="round"/>`;
}

/**
 * @param {object} options
 * @param {number} options.size        아이콘 한 변(px)
 * @param {boolean} options.rounded    라운드 스퀘어 여부. 마스크가 씌워지는
 *                                     apple-touch-icon / maskable은 full-bleed로 뽑는다.
 * @param {number} options.artRatio    한 변 대비 아트 폭 비율
 */
function iconSvg({ size = 512, rounded = true, artRatio = FRAME.art / FRAME.container } = {}) {
  const radius = rounded ? (size * FRAME.radius) / FRAME.container : 0;
  const artWidth = size * artRatio;

  // viewBox가 정사각형이 아니므로(360x320) 시안처럼 가로에 맞추고 세로는 가운데 정렬한다.
  const scale = artWidth / CROP.width;
  const left = (size - artWidth) / 2;
  const top = left + (artWidth - CROP.height * scale) / 2;
  const translateX = left - CROP.x * scale;
  const translateY = top - CROP.y * scale;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${radius.toFixed(2)}" fill="${palette.coat}"/>
  <g transform="translate(${translateX.toFixed(3)} ${translateY.toFixed(3)}) scale(${scale.toFixed(6)})">${dogHead()}
  </g>
</svg>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  await writeFile(path.join(OUT_DIR, 'icon.svg'), iconSvg({ size: 512 }), 'utf8');

  const targets = [
    { name: 'icon-192.png', size: 192, options: {} },
    { name: 'icon-512.png', size: 512, options: {} },
    { name: 'favicon-32.png', size: 32, options: {} },
    // iOS가 알아서 모서리를 둥글게 깎으므로 사각형 그대로 넘긴다.
    { name: 'apple-touch-icon.png', size: 180, options: { rounded: false } },
    // Android 마스크는 바깥을 잘라내므로 안전 영역(80%) 안으로 아트를 줄인다.
    {
      name: 'maskable-512.png',
      size: 512,
      options: { rounded: false, artRatio: (FRAME.art / FRAME.container) * 0.8 },
    },
  ];

  for (const target of targets) {
    const svg = iconSvg({ size: target.size, ...target.options });
    await sharp(Buffer.from(svg)).png().toFile(path.join(OUT_DIR, target.name));
  }

  console.log('icons written to public/icons:', targets.map((t) => t.name).join(', '));
  console.log('palette:', palette);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
