import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_URL?.trim()) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is required for production builds (e.g. https://gatepass-v037.onrender.com/api).",
  );
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
};

export default withSentryConfig(nextConfig, {
  // Suppresses source map upload logs during build
  silent: true,

  // Upload source maps only when DSN + auth token are configured
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Automatically tree-shake Sentry debug logging in production
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
});
