/**
 * Sentry Configuration for Next.js Frontend
 * 
 * SETUP:
 * 1. Sign up at https://sentry.io
 * 2. Create a Next.js project
 * 3. Copy your DSN
 * 4. Add to .env.local: NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
 * 
 * This file is automatically imported by Next.js on client-side
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
    beforeSend(event, hint) {
      // Remove sensitive cookies/auth
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
  
  console.log("[Sentry] Initialized (client)");
} else {
  console.log("[Sentry] Skipped - NEXT_PUBLIC_SENTRY_DSN not configured");
}
