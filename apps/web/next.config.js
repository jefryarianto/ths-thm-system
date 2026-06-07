const isWindows = process.platform === 'win32';
const isBuild = !!process.env.NEXT_PHASE;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isBuild && !isWindows ? 'standalone' : undefined,
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