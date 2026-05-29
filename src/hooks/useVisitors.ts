import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Visitor } from "@/types/visitor";

export type VisitorsResponse = {
  visitors: Visitor[];
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
      return res.data;
    },
  });
}

export function usePreApprovedVisitors() {
  return useQuery({
    queryKey: ["preApprovedVisitors"],
    queryFn: async () => {
      const res = await api.get("/pre-approved-visitors");
      return res.data.visitors ?? res.data;
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
