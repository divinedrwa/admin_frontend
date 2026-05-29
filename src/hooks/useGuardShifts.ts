import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { GuardShift, Guard } from "@/types/guard";

export function useGuardShifts(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["guard-shifts", params],
    queryFn: async () => {
      const res = await api.get("/guard-shifts", { params });
      return res.data as {
        shifts: GuardShift[];
        total: number;
        limit: number;
        offset: number;
      };
    },
  });
}

/** Fetches all users and filters to GUARD role. */
export function useGuards() {
  return useQuery({
    queryKey: ["guards"],
    queryFn: async () => {
      const res = await api.get("/users");
      const allUsers = res.data.users ?? [];
      return allUsers.filter((u: { role: string }) => u.role === "GUARD") as Guard[];
    },
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post("/guard-shifts", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guard-shifts"] });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/guard-shifts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guard-shifts"] });
    },
  });
}
