import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Gate, GateForm } from "@/types/gate";

export type GatesResponse = {
  gates: Gate[];
};

export function useGates() {
  return useQuery({
    queryKey: ["gates"],
    queryFn: async () => {
      const res = await api.get<GatesResponse>("/gates");
      return res.data;
    },
  });
}

export function useCreateGate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: GateForm) => {
      const res = await api.post("/gates", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gates"] });
    },
  });
}

export function useUpdateGate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GateForm }) => {
      const res = await api.patch(`/gates/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gates"] });
    },
  });
}

export function useDeleteGate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/gates/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gates"] });
    },
  });
}
