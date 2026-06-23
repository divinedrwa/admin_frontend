import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useFinancialYears() {
  return useQuery({
    queryKey: ["financial-years"],
    queryFn: async () => {
      const res = await api.get("/v1/admin/financial-years");
      return res.data as {
        financialYears: Array<{
          id: string;
          label: string;
          startDate: string;
          endDate: string;
        }>;
      };
    },
  });
}

export function useAdminShortfall(financialYearId: string | undefined) {
  return useQuery({
    queryKey: ["admin-shortfall", financialYearId],
    queryFn: async () => {
      const res = await api.get(`/maintenance-management/shortfall/${financialYearId}`);
      return res.data;
    },
    enabled: Boolean(financialYearId),
  });
}

export function useVillaFinancialHistory(villaId: string | undefined) {
  return useQuery({
    queryKey: ["villa-financial-history", villaId],
    queryFn: async () => {
      const res = await api.get(`/maintenance-management/villa-history/${villaId}`);
      return res.data;
    },
    enabled: Boolean(villaId),
  });
}
