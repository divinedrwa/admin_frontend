/**
 * Express mounts REST routes under `/api` (see backend `app.use("/api", routes)`).
 * `NEXT_PUBLIC_API_URL` must be the full base including `/api`.
 *
 * Normalizes a common deploy mistake: `https://api.example.com` → `https://api.example.com/api`.
 */
export function getResolvedApiBaseUrl(): string {
  const fallback = "http://localhost:4000/api";
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  if (!raw) return fallback;

  let u = raw.replace(/\/+$/, "");
  if (!u.endsWith("/api")) {
    u = `${u}/api`;
  }
  return u;
}
