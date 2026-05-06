/** Paths where a 401 on the society-admin API should not bounce the browser to `/login`. */
export function isSocietyPublicAuthPath(pathname: string): boolean {
  const p = pathname.split("?")[0] ?? "";
  return (
    p === "/login" ||
    p === "/invite/accept" ||
    p.startsWith("/invite/accept/") ||
    p.startsWith("/super-admin")
  );
}
