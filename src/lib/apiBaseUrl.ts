/**
 * Express mounts REST routes under `/api` (see backend `app.use("/api", routes)`).
 * `NEXT_PUBLIC_API_URL` must be the full base including `/api`.
 *
 * Normalizes a common deploy mistake: `https://api.example.com` → `https://api.example.com/api`.
 */
const DEV_FALLBACK = "http://localhost:4000/api";

/** Missing in production builds — requests fail visibly instead of hitting localhost. */
const PROD_MISSING_MARKER = "/__gatepass_api_url_not_configured__";

export function getResolvedApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      return PROD_MISSING_MARKER;
    }
    return DEV_FALLBACK;
  }

  let u = raw.replace(/\/+$/, "");
  if (!u.endsWith("/api")) {
    u = `${u}/api`;
  }
  return u;
}

/** Origin for non-`/api` routes such as `GET /health`. */
export function getApiOrigin(): string {
  const base = getResolvedApiBaseUrl();
  if (base === PROD_MISSING_MARKER) return PROD_MISSING_MARKER;
  return base.replace(/\/api\/?$/, "") || base;
}

export function isApiUrlConfigured(): boolean {
  return getResolvedApiBaseUrl() !== PROD_MISSING_MARKER;
}
