import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { GuardPatrol } from "@/types/guard";

export function useGuardPatrols(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["guard-patrols", params],
    queryFn: async () => {
      const res = await api.get("/guard-patrols", { params });
      return res.data as { patrols: GuardPatrol[] };
    },
  });
}

export function useCreatePatrol() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post("/guard-patrols", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guard-patrols"] });
    },
  });
}

export function useUpdatePatrol() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await api.put(`/guard-patrols/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guard-patrols"] });
    },
  });
}

export function useDeletePatrol() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/guard-patrols/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guard-patrols"] });
    },
  });
}
