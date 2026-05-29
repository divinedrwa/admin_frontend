import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Vendor, VendorForm } from "@/types/vendor";

export function useVendors(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["vendors", params],
    queryFn: async () => {
      const res = await api.get("/vendors", { params });
      return res.data as {
        vendors: Vendor[];
        total: number;
        limit: number;
        offset: number;
      };
    },
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<VendorForm>) => {
      const res = await api.post("/vendors", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VendorForm> }) => {
      const res = await api.patch(`/vendors/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/vendors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}
