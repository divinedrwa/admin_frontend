/**
 * Sentry Configuration for Next.js Server-side
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    
    beforeSend(event, hint) {
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
  
  console.log("[Sentry] Initialized (server)");
} else {
  console.log("[Sentry] Skipped - NEXT_PUBLIC_SENTRY_DSN not configured");
}
