/**
 * 앱 아이콘 생성기.
 *
 * 디자인 시안의 oklch 색을 그대로 쓰되, SVG 래스터라이저 호환을 위해
 * sRGB hex로 변환해 아이콘을 만든다.
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
  bg: oklchToHex(0.955, 0.018, 82),
  coat: oklchToHex(0.85, 0.075, 68),
  coatDark: oklchToHex(0.74, 0.095, 58),
  coatLight: oklchToHex(0.965, 0.018, 84),
  ink: oklchToHex(0.32, 0.02, 60),
};

/**
 * @param {{ background: boolean, padding: number }} options
 *   maskable 아이콘은 바깥이 잘려 나가므로 여백을 더 준다.
 */
function iconSvg({ background = true, padding = 0 } = {}) {
  const scale = (100 - padding * 2) / 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
  ${background ? `<rect width="100" height="100" fill="${palette.bg}"/>` : ''}
  <g transform="translate(${padding} ${padding}) scale(${scale})">
    <path d="M22 44 C 14 26 18 14 26 10 C 34 16 44 30 48 42 Z" fill="${palette.coatDark}"/>
    <path d="M78 44 C 86 26 82 14 74 10 C 66 16 56 30 52 42 Z" fill="${palette.coatDark}"/>
    <ellipse cx="50" cy="56" rx="36" ry="32" fill="${palette.coat}"/>
    <ellipse cx="50" cy="62" rx="24" ry="20" fill="${palette.coatLight}"/>
    <path d="M36 54 Q 43 48 50 54" fill="none" stroke="${palette.ink}" stroke-width="4" stroke-linecap="round"/>
    <path d="M50 54 Q 57 48 64 54" fill="none" stroke="${palette.ink}" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="50" cy="66" rx="7" ry="5" fill="${palette.ink}"/>
    <path d="M43 72 Q 50 78 57 72" fill="none" stroke="${palette.ink}" stroke-width="3.5" stroke-linecap="round"/>
  </g>
</svg>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const standard = iconSvg({ background: true, padding: 6 });
  const maskable = iconSvg({ background: true, padding: 14 });

  await writeFile(path.join(OUT_DIR, 'icon.svg'), standard, 'utf8');

  const targets = [
    { source: standard, size: 192, name: 'icon-192.png' },
    { source: standard, size: 512, name: 'icon-512.png' },
    { source: standard, size: 180, name: 'apple-touch-icon.png' },
    { source: maskable, size: 512, name: 'maskable-512.png' },
    { source: standard, size: 32, name: 'favicon-32.png' },
  ];

  for (const target of targets) {
    await sharp(Buffer.from(target.source))
      .resize(target.size, target.size)
      .png()
      .toFile(path.join(OUT_DIR, target.name));
  }

  console.log('icons written to public/icons:', targets.map((t) => t.name).join(', '));
  console.log('palette:', palette);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
