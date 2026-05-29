import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { User } from "@/types/user";

export type UsersParams = {
  limit?: number;
  offset?: number;
  role?: string;
  isActive?: string;
};

export type UsersResponse = {
  users: User[];
  total: number;
  limit: number;
  offset: number;
};

export function useUsers(params?: UsersParams) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: async () => {
      const res = await api.get<UsersResponse>("/users", {
        params: {
          limit: params?.limit ?? 50,
          offset: params?.offset ?? 0,
          ...(params?.role ? { role: params.role } : {}),
          ...(params?.isActive ? { isActive: params.isActive } : {}),
        },
      });
      return res.data;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post("/users", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await api.patch(`/users/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/users/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
