import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isJwtUnexpired } from "@/lib/jwt";
import { attemptTokenRefresh } from "@/lib/tokenRefresh";

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
