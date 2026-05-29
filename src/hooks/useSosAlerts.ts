import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SOSAlert } from "@/types/sos";

export function useSosAlerts(filter?: "all" | "active", options?: { refetchInterval?: number }) {
  const endpoint = filter === "active" ? "/sos-alerts/active" : "/sos-alerts";
  return useQuery({
    queryKey: ["sos-alerts", filter],
    queryFn: async () => {
      const res = await api.get(endpoint);
      return res.data as { alerts: SOSAlert[] };
    },
    refetchInterval: options?.refetchInterval,
  });
}

export function useCreateSosAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      villaId: string;
      emergencyType: string;
      message?: string;
    }) => {
      const res = await api.post("/sos-alerts", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sos-alerts"] });
    },
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/sos-alerts/${id}/acknowledge`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sos-alerts"] });
    },
  });
}

export function useStartAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/sos-alerts/${id}/start`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sos-alerts"] });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/sos-alerts/${id}/resolve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sos-alerts"] });
    },
  });
}
