import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Visitor } from "@/types/visitor";

export type VisitorsResponse = {
  visitors: Visitor[];
  total?: number;
  limit?: number;
  offset?: number;
  todayCount?: number;
};

export function useVisitors(
  filter?: "all" | "active",
  params?: Record<string, unknown>,
) {
  const endpoint = filter === "active" ? "/visitors/active/list" : "/visitors";
  return useQuery({
    queryKey: ["visitors", filter ?? "all", params],
    queryFn: async () => {
      const res = await api.get<VisitorsResponse>(endpoint, { params });
      const data = res.data;
      return {
        visitors: data.visitors ?? [],
        total: typeof data.total === "number" ? data.total : undefined,
        limit: typeof data.limit === "number" ? data.limit : (params?.limit as number | undefined),
        offset: typeof data.offset === "number" ? data.offset : (params?.offset as number | undefined),
        todayCount: typeof data.todayCount === "number" ? data.todayCount : undefined,
      };
    },
  });
}

export function usePreApprovedVisitors(params?: { limit?: number; offset?: number }) {
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;
  return useQuery({
    queryKey: ["preApprovedVisitors", { limit, offset }],
    queryFn: async () => {
      const res = await api.get("/pre-approved-visitors", {
        params: { limit, offset },
      });
      return {
        visitors: res.data.visitors ?? [],
        total: typeof res.data.total === "number" ? res.data.total : 0,
        limit: typeof res.data.limit === "number" ? res.data.limit : limit,
        offset: typeof res.data.offset === "number" ? res.data.offset : offset,
      };
    },
  });
}

export function useCreateVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      phone: string;
      purpose: string;
      visitorType: string;
      villaIds: string[];
      vehicleNumber?: string;
      gateId?: string;
    }) => {
      const res = await api.post("/visitors", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
    },
  });
}

export function useDeleteVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/visitors/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
    },
  });
}

export function useDeletePreApprovedVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/pre-approved-visitors/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preApprovedVisitors"] });
    },
  });
}
