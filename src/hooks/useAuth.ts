import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isJwtUnexpired, isTenantAdminToken } from "@/lib/jwt";
import { attemptTokenRefresh } from "@/lib/tokenRefresh";
import { setTenantAuthCookie } from "@/lib/api";
import { isHttpOnlyAuthEnabled } from "@/lib/httpOnlyAuth";
import { getPlatformViewSession } from "@/lib/platformViewSession";

function hasTenantAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("tenant_auth=1"));
}

function isTenantPublicPath(pathname: string): boolean {
  const p = pathname.split("?")[0] ?? "";
  return (
    p === "/login" ||
    p === "/super-admin/login" ||
    p === "/invite/accept" ||
    p.startsWith("/invite/accept/")
  );
}

export function useAuth(requireAuth: boolean = true) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const httpOnly = isHttpOnlyAuthEnabled();
      const token = localStorage.getItem("token");
      let valid = isJwtUnexpired(token);

      // Token exists but expired — try a silent refresh before giving up.
      if (!valid && token) {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          const newToken = await attemptTokenRefresh({
            tokenKey: "token",
            refreshTokenKey: "refresh_token",
          });
          valid = !!newToken;
        }
        if (!valid) {
          localStorage.removeItem("token");
        }
      }

      // HttpOnly cookie session (no JWT in localStorage) — refresh via tenant_refresh cookie.
      if (!valid && httpOnly && (hasTenantAuthCookie() || getPlatformViewSession())) {
        const newToken = await attemptTokenRefresh({
          tokenKey: "token",
          refreshTokenKey: "refresh_token",
        });
        valid = !!newToken || hasTenantAuthCookie();
      }

      const activeToken = localStorage.getItem("token");
      if (valid && requireAuth && activeToken && !isTenantAdminToken(activeToken)) {
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        valid = false;
      }

      if (requireAuth && !valid && !isTenantPublicPath(pathname ?? "")) {
        setIsAuthenticated(false);
        setIsLoading(false);
        router.replace("/login");
        return;
      }

      setIsAuthenticated(valid);
      if (valid && (activeToken ? isTenantAdminToken(activeToken) : httpOnly && hasTenantAuthCookie())) {
        setTenantAuthCookie();
      }
      setIsLoading(false);
    };

    if (typeof window !== "undefined") {
      checkAuth();
    }
  }, [requireAuth, pathname, router]);

  return { isAuthenticated, isLoading };
}
