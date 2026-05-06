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

export function useAuth(requireAuth: boolean = true) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      
      if (requireAuth && !token && !isTenantPublicPath(pathname ?? "")) {
        router.push("/login");
        return;
      }
      
      setIsAuthenticated(!!token);
      setIsLoading(false);
    };

    // Only run on client side
    if (typeof window !== "undefined") {
      checkAuth();
    }
  }, [requireAuth, pathname, router]);

  return { isAuthenticated, isLoading };
}
