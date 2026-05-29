/**
 * Shared JWT payload parser for client-side token inspection.
 * Does NOT verify signatures — only used for reading claims like
 * `societyId` and `exp` before the server validates on each request.
 */

export function parseJwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Returns true when the JWT `exp` claim is in the future (5s clock skew). */
export function isJwtUnexpired(token: string | null): boolean {
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return false;
  return payload.exp * 1000 > Date.now() - 5000;
}

/** Read the `societyId` claim from a tenant JWT. Returns "" if absent. */
export function readSocietyIdFromToken(token: string | null): string {
  const payload = parseJwtPayload(token);
  if (!payload) return "";
  return typeof payload.societyId === "string" ? payload.societyId.trim() : "";
}
