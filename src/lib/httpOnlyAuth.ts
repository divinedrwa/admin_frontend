/** E1 — When true, admin web relies on HttpOnly cookies set by the API (no JWT in localStorage). */
export function isHttpOnlyAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_HTTPONLY_AUTH === "true";
}
