import { useQuery } from "@tanstack/react-query";
import { getApiOrigin, isApiUrlConfigured } from "@/lib/apiBaseUrl";

/** Polls `GET /health` on the API origin (not under `/api`). */
export function useApiHealth() {
  return useQuery({
    queryKey: ["apiHealth"],
    enabled: isApiUrlConfigured(),
    queryFn: async () => {
      const origin = getApiOrigin();
      const res = await fetch(`${origin}/health`, { cache: "no-store" });
      if (!res.ok) return false;
      const data = (await res.json()) as { ok?: boolean };
      return data?.ok === true;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}
