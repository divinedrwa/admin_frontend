import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Villa, VillaForm } from "@/types/villa";

/** Backend caps list `limit` at 200 — use for villa pickers in forms. */
export const VILLA_SELECT_LIMIT = 200;

export type VillasParams = {
  limit?: number;
  offset?: number;
  search?: string;
};

export type VillasResponse = {
  villas: Villa[];
  total: number;
  limit: number;
  offset: number;
};

export function useVillas(params?: VillasParams) {
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;
  const search = params?.search?.trim() || undefined;
  return useQuery({
    queryKey: ["villas", { limit, offset, search }],
    queryFn: async () => {
      const res = await api.get<VillasResponse>("/villas", {
        params: { limit, offset, ...(search ? { search } : {}) },
      });
      return res.data;
    },
  });
}

/** Debounced server search for villa typeahead pickers. */
export function useVillaSearch(
  search: string,
  options?: { limit?: number; enabled?: boolean },
) {
  const limit = options?.limit ?? 20;
  const q = search.trim();
  return useQuery({
    queryKey: ["villas", "search", { q, limit }],
    queryFn: async () => {
      const res = await api.get<VillasResponse>("/villas", {
        params: { limit, offset: 0, ...(q ? { search: q } : {}) },
      });
      return res.data;
    },
    enabled: options?.enabled !== false,
    staleTime: 30_000,
  });
}

/** Fetch one villa (units, residents) when a picker has a pre-selected id. */
export function useVilla(id: string | undefined) {
  return useQuery({
    queryKey: ["villas", id],
    queryFn: async () => {
      const res = await api.get<{ villa: Villa }>(`/villas/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

/** All villas for dropdowns (visitors, parcels, invitations, etc.). */
export function useVillaOptions() {
  return useVillas({ limit: VILLA_SELECT_LIMIT, offset: 0 });
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
