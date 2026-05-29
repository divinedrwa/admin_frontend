import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Vehicle, VehicleForm } from "@/types/vehicle";

export function useVehicles(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["vehicles", params],
    queryFn: async () => {
      const res = await api.get("/vehicles", { params });
      return res.data as {
        vehicles: Vehicle[];
        total: number;
        limit: number;
        offset: number;
      };
    },
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<VehicleForm>) => {
      const res = await api.post("/vehicles", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<VehicleForm>;
    }) => {
      const res = await api.patch(`/vehicles/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/vehicles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
}
