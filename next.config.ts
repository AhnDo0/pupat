import path from 'node:path';

import type { NextConfig } from 'next';

/**
 * Tauri/PWA 확장을 고려한 설정.
 * - 핵심 화면은 모두 클라이언트에서 동작하므로 정적 내보내기(output: 'export')로도
 *   빌드할 수 있다. Tauri WebView로 옮길 때 이 플래그만 켜면 된다.
 */
const isStaticExport = process.env.PUPAT_TARGET === 'static';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 상위 폴더의 lockfile을 워크스페이스 루트로 오인하지 않도록 고정한다.
  outputFileTracingRoot: path.join(process.cwd()),
  ...(isStaticExport ? { output: 'export' as const, images: { unoptimized: true } } : {}),
  async headers() {
    if (isStaticExport) return [];
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
