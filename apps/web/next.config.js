const isWindows = process.platform === 'win32';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_PHASE === 'phase-production-build' && !isWindows ? 'standalone' : undefined,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;