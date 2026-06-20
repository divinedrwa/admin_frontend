import * as Sentry from "@sentry/nextjs";

/** Report to Sentry when configured; always safe to call. */
export function captureError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  Sentry.withScope((scope) => {
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
    }
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(String(error), "error");
    }
  });
}
