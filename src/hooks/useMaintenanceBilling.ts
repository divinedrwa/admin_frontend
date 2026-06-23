import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useMaintenanceBillingCycles() {
  return useQuery({
    queryKey: ["maintenance-billing", "cycles"],
    queryFn: async () => {
      const res = await api.get("/v1/admin/cycles");
      return res.data as { cycles: unknown[]; residentCount: number };
    },
  });
}

export function useMaintenanceBillingUsers() {
  return useQuery({
    queryKey: ["maintenance-billing", "users"],
    queryFn: async () => {
      const res = await api.get("/users", { params: { role: "RESIDENT", isActive: "true" } });
      return res.data as { users: unknown[] };
    },
  });
}

export function useMaintenanceBillingFinancialYears() {
  return useQuery({
    queryKey: ["maintenance-billing", "financial-years"],
    queryFn: async () => {
      const res = await api.get("/v1/admin/financial-years");
      return res.data as { financialYears: unknown[] };
    },
  });
}

export function useMaintenanceBillingAudit(limit = 100) {
  return useQuery({
    queryKey: ["maintenance-billing", "audit", limit],
    queryFn: async () => {
      const res = await api.get("/v1/admin/audit-logs", { params: { limit } });
      return res.data as { logs: unknown[] };
    },
  });
}
