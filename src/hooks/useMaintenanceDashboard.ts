"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type FinancialYear = { id: string; label: string; status?: string };

export function useFinancialYears() {
  return useQuery({
    queryKey: ["financial-years"],
    queryFn: async () => {
      const r = await api.get("/v1/admin/financial-years");
      return (r.data.financialYears ?? []) as FinancialYear[];
    },
  });
}

export function useAdminCycles(financialYearId: string) {
  return useQuery({
    queryKey: ["admin-cycles", financialYearId],
    queryFn: async () => {
      const r = await api.get("/v1/admin/cycles");
      return r.data.cycles ?? [];
    },
    enabled: !!financialYearId,
  });
}

export function useVillas() {
  return useQuery({
    queryKey: ["villas"],
    queryFn: async () => {
      const r = await api.get("/villas");
      return r.data.villas ?? [];
    },
  });
}
