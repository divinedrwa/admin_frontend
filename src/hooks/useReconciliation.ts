import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useReconciliationAlerts(statusFilter: string) {
  return useQuery({
    queryKey: ["reconciliation", "alerts", statusFilter],
    queryFn: async () => {
      const res = await api.get(`/reconciliation/alerts?status=${statusFilter}`);
      return res.data as { alerts: unknown[] };
    },
  });
}

export function useReconciliationSummary() {
  return useQuery({
    queryKey: ["reconciliation", "summary"],
    queryFn: async () => {
      const res = await api.get("/reconciliation/summary");
      return res.data;
    },
  });
}
