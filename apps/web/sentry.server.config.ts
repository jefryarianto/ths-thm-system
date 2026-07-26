// This file is auto-picked up by @sentry/nextjs and configures
// the server-side SDK (API routes, server components, getServerSideProps).
//
// Sentry is only activated when SENTRY_DSN is set (production / staging).
// For development: leave the env var unset — the SDK no-ops.

import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Capture a sample of transactions for performance insights
    tracesSampleRate: 0.1,

    environment: process.env.NODE_ENV || 'development',

    // Ignore 404s and client cancellations (noise)
    ignoreErrors: [
      'NotFoundError',
      'AbortError',
      'NetworkError',
    ],
  });
}
