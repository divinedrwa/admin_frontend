import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

function isTenantPublicPath(pathname: string): boolean {
  const p = pathname.split("?")[0] ?? "";
  return (
    p === "/login" ||
    p === "/super-admin/login" ||
    p === "/invite/accept" ||
    p.startsWith("/invite/accept/")
  );
}

/** Returns true when the JWT is structurally valid and its `exp` claim is in the future.
 *  An invalid/expired token is treated as no token — protected pages must not render
 *  their first frame before the 401 interceptor has a chance to redirect. */
function isJwtUnexpired(token: string | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length < 2) return false;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    if (typeof payload.exp !== "number") return false;
    // Allow 5s clock skew so a request mid-flight isn't pre-emptively killed.
    return payload.exp * 1000 > Date.now() - 5000;
  } catch {
    return false;
  }
}

export function useAuth(requireAuth: boolean = true) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const valid = isJwtUnexpired(token);

      // An expired token is worse than no token: it would let the page render
      // briefly while the 401 round-trip happens. Treat it as unauthenticated.
      if (!valid && token) {
        localStorage.removeItem("token");
      }

      if (requireAuth && !valid && !isTenantPublicPath(pathname ?? "")) {
        setIsAuthenticated(false);
        setIsLoading(false);
        router.replace("/login");
        return;
      }

      setIsAuthenticated(valid);
      setIsLoading(false);
    };

    if (typeof window !== "undefined") {
      checkAuth();
    }
  }, [requireAuth, pathname, router]);

  return { isAuthenticated, isLoading };
}
