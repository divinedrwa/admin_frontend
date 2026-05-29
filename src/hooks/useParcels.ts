import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Parcel } from "@/types/parcel";

export function useParcels(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["parcels", params],
    queryFn: async () => {
      const res = await api.get("/parcels", { params });
      return res.data as {
        parcels: Parcel[];
        total: number;
        limit: number;
        offset: number;
      };
    },
  });
}

export function useCreateParcel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { villaId: string; description: string }) => {
      const res = await api.post("/parcels", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcels"] });
    },
  });
}

export function useUpdateParcel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { description: string } }) => {
      const res = await api.put(`/parcels/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcels"] });
    },
  });
}

export function useDeleteParcel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/parcels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcels"] });
    },
  });
}
