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
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

// ── Sentry integration ────────────────────────────────────────
// Only wrap with Sentry if the DSN is configured (production / staging).
// In development the wrapper is a no-op passthrough.
const sentryConfig = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,                     // verbose in CI, quiet otherwise
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
};

// require inside the conditional so the module is only loaded when needed
let moduleExports = nextConfig;
if (process.env.SENTRY_DSN) {
  const { withSentryConfig } = require('@sentry/nextjs');
  moduleExports = withSentryConfig(nextConfig, sentryConfig);
}

module.exports = moduleExports;
