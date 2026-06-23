import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useUpiPayments(statusFilter: string) {
  return useQuery({
    queryKey: ["upi-payments", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      const res = await api.get(`/upi-payments/pending?${params.toString()}`);
      return {
        submissions: (res.data?.submissions ?? res.data ?? []) as unknown[],
      };
    },
  });
}

export function useUpiPaymentStats() {
  return useQuery({
    queryKey: ["upi-payments", "stats"],
    queryFn: async () => {
      const res = await api.get("/upi-payments/stats");
      return (res.data ?? { pending: 0, verified: 0, rejected: 0 }) as {
        pending: number;
        verified: number;
        rejected: number;
      };
    },
  });
}
