import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Complaint } from "@/types/complaint";

export function useComplaints(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["complaints", params],
    queryFn: async () => {
      const res = await api.get("/complaints", { params });
      return res.data as {
        complaints: Complaint[];
        openCount: number;
        total: number;
        limit: number;
        offset: number;
      };
    },
  });
}

export function useUpdateComplaintStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/complaints/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
    },
  });
}
