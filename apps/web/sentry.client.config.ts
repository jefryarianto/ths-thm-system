// This file is auto-picked up by @sentry/nextjs and configures
// the client-side SDK.  Sentry is only activated when
// NEXT_PUBLIC_SENTRY_DSN is set (production / staging).
//
// For development: leave the env var unset — the SDK no-ops.

import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Set tracesSampleRate to 0.2 (20%) to capture a fair
    // sample of transactions without overwhelming the quota.
    tracesSampleRate: 0.2,

    environment: process.env.NODE_ENV || 'development',

    // Only send errors from the actual app domain
    allowUrls: [
      /https:\/\/ths-thm\.cloud/,
      /https:\/\/staging\.ths-thm\.cloud/,
    ],
  });
}
