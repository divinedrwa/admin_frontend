import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Villa, VillaForm } from "@/types/villa";

export type VillasParams = {
  limit?: number;
  offset?: number;
};

export type VillasResponse = {
  villas: Villa[];
  total: number;
  limit: number;
  offset: number;
};

export function useVillas(params?: VillasParams) {
  return useQuery({
    queryKey: ["villas", params],
    queryFn: async () => {
      const res = await api.get<VillasResponse>("/villas", {
        params: { limit: params?.limit ?? 50, offset: params?.offset ?? 0 },
      });
      return res.data;
    },
  });
}

export function useCreateVilla() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: VillaForm & {
        units?: Array<{ unitCode: string; label: string; sortOrder: number }>;
      },
    ) => {
      const res = await api.post("/villas", {
        villaNumber: data.villaNumber.trim(),
        floors: Math.min(10, Math.max(1, parseInt(data.floors, 10) || 1)),
        area: parseFloat(data.area),
        block: data.block,
        ownerName: data.ownerName,
        ownerEmail: data.ownerEmail,
        ownerPhone: data.ownerPhone,
        monthlyMaintenance: parseFloat(data.monthlyMaintenance),
        units: data.units,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["villas"] });
    },
  });
}

export function useUpdateVilla() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await api.patch(`/villas/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["villas"] });
    },
  });
}

export function useDeleteVilla() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/villas/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["villas"] });
    },
  });
}
