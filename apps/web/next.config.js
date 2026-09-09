const isWindows = process.platform === 'win32';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output:
    process.env.NEXT_PHASE === 'phase-production-build' && !isWindows ? 'standalone' : undefined,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [];
  },
  async rewrites() {
    const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    // Normalize: strip trailing /api so the rewrite always produces exactly one /api prefix
    const baseUrl = rawBase.replace(/\/api\/?$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${baseUrl}/api/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
