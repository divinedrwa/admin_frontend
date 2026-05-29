import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Resident, ResidentStatistics } from "@/types/resident";

export function useResidents(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["resident-management", params],
    queryFn: async () => {
      const res = await api.get("/resident-management/overview", { params });
      return res.data as {
        residents: Resident[];
        statistics: ResidentStatistics;
      };
    },
  });
}

export function useMoveOutResident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      userId: string;
      moveOutDate: string;
      reason?: string;
    }) => {
      const res = await api.post("/resident-management/move-out", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resident-management"] });
    },
  });
}

export function useReactivateResident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/resident-management/${id}/reactivate`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resident-management"] });
    },
  });
}
