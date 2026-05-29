import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Document } from "@/types/document";

export type DocumentsResponse = {
  documents: Document[];
};

export function useDocuments(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["documents", params],
    queryFn: async () => {
      const res = await api.get<DocumentsResponse>("/documents", { params });
      return res.data;
    },
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      fileUrl: string;
      fileType?: string;
      category?: string;
      isPublic?: boolean;
    }) => {
      const res = await api.post("/documents", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        title: string;
        description?: string;
        fileUrl: string;
        fileType?: string;
        category?: string;
        isPublic?: boolean;
      };
    }) => {
      const res = await api.put(`/documents/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/documents/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
