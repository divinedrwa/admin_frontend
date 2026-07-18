/** E1 — When true, admin web relies on HttpOnly cookies set by the API (no JWT in localStorage). */
export function isHttpOnlyAuthEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_HTTPONLY_AUTH === "false") return false;
  return (
    process.env.NEXT_PUBLIC_HTTPONLY_AUTH === "true" ||
    process.env.NODE_ENV === "production"
  );
}
