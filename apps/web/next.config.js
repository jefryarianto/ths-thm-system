const isWindows = process.platform === 'win32';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_PHASE === 'phase-production-build' && !isWindows ? 'standalone' : undefined,
  // ESLint disabled on Windows during builds (Next.js 15.5.19 + Node.js v26 incompatibility)
  // Remove when Node.js is downgraded to 20.x/22.x LTS or Next.js is upgraded
  eslint: {
    ignoreDuringBuilds: true,
  },
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