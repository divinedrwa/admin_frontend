import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Villa, VillaForm } from "@/types/villa";

/** Backend caps list `limit` at 200 — use for villa pickers in forms. */
export const VILLA_SELECT_LIMIT = 200;

export type VillaMaintenanceFilter = "paying" | "not_paying";

export type VillasParams = {
  limit?: number;
  offset?: number;
  search?: string;
  maintenance?: VillaMaintenanceFilter;
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
  const maintenance = params?.maintenance;
  return useQuery({
    queryKey: ["villas", { limit, offset, search, maintenance }],
    queryFn: async () => {
      const res = await api.get<VillasResponse>("/villas", {
        params: {
          limit,
          offset,
          ...(search ? { search } : {}),
          ...(maintenance ? { maintenance } : {}),
        },
      });
      return res.data;
    },
  });
}

export type MaintenanceEnrollmentResult = {
  message: string;
  updated: number;
  unchanged: number;
  effectiveFromPeriod: string;
};

/** Mark villas as paying / not paying maintenance (effective from next month's cycle). */
export function useSetVillaMaintenanceEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { villaIds: string[]; enrolled: boolean }) => {
      const res = await api.post<MaintenanceEnrollmentResult>("/villas/maintenance-enrollment", input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["villas"] });
    },
  });
}

/**
 * Debounced server search for villa typeahead pickers. Loads up to the backend cap so every
 * villa (including newly added ones) is listed before the admin types anything.
 */
export function useVillaSearch(
  search: string,
  options?: { limit?: number; enabled?: boolean },
) {
  const limit = options?.limit ?? VILLA_SELECT_LIMIT;
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
