import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Notice } from "@/types/notice";

export type NoticesParams = {
  limit?: number;
  offset?: number;
};

export type NoticesResponse = {
  notices: Notice[];
  total: number;
  limit: number;
  offset: number;
};

export function useNotices(params?: NoticesParams) {
  return useQuery({
    queryKey: ["notices", params],
    queryFn: async () => {
      const res = await api.get<NoticesResponse>("/notices", {
        params: { limit: params?.limit ?? 50, offset: params?.offset ?? 0 },
      });
      return res.data;
    },
  });
}

export function useCreateNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post("/notices", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
  });
}

export function useUpdateNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await api.put(`/notices/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
  });
}

export function useDeleteNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/notices/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
  });
}
