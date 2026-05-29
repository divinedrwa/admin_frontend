import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isJwtUnexpired } from "@/lib/jwt";

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
