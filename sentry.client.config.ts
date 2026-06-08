/**
 * Sentry Configuration for Next.js Frontend (client-side)
 *
 * Add to .env.local: NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions

    // Session replay
    replaysSessionSampleRate: 0.01, // 1% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of errors

    // Environment
    environment: process.env.NODE_ENV,

    // Filter PII
    beforeSend(event) {
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },
  });
}
