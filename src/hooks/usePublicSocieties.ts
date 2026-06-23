"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type PublicSociety = {
  id: string;
  name: string;
  address?: string | null;
  status?: string;
};

export type PublicSocietiesResponse = {
  societies: PublicSociety[];
  total: number;
  limit: number;
  offset: number;
  hasMore?: boolean;
};

export function usePublicSocieties(params?: { search?: string; limit?: number; offset?: number }) {
  const search = params?.search?.trim() || undefined;
  const limit = params?.limit ?? 200;
  const offset = params?.offset ?? 0;
  return useQuery({
    queryKey: ["public-societies", { search, limit, offset }],
    queryFn: async () => {
      const res = await api.get<PublicSocietiesResponse>("/public/societies", {
        params: {
          limit,
          offset,
          ...(search ? { search } : {}),
        },
      });
      return res.data;
    },
    staleTime: 60_000,
  });
}
