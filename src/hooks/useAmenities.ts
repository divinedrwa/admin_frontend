import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Amenity, AmenityBooking } from "@/types/amenity";

export type AmenitiesResponse = {
  amenities: Amenity[];
};

export type AmenityBookingsParams = {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
  amenityId?: string;
};

export type AmenityBookingsResponse = {
  bookings: AmenityBooking[];
  total: number;
  limit: number;
  offset: number;
};

export function useAmenities() {
  return useQuery({
    queryKey: ["amenities"],
    queryFn: async () => {
      const res = await api.get<AmenitiesResponse>("/amenities");
      return res.data;
    },
  });
}

export function useCreateAmenity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post("/amenities", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amenities"] });
    },
  });
}

export function useUpdateAmenity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await api.patch(`/amenities/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amenities"] });
    },
  });
}

export function useDeleteAmenity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/amenities/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amenities"] });
    },
  });
}

export function useAmenityBookings(params?: AmenityBookingsParams) {
  return useQuery({
    queryKey: ["amenityBookings", params],
    queryFn: async () => {
      const queryParams: Record<string, unknown> = {
        limit: params?.limit ?? 50,
        offset: params?.offset ?? 0,
      };
      if (params?.search) queryParams.search = params.search;
      if (params?.status && params.status !== "all") queryParams.status = params.status;
      if (params?.amenityId) queryParams.amenityId = params.amenityId;
      const res = await api.get<AmenityBookingsResponse>(
        "/amenity-bookings",
        { params: queryParams },
      );
      return res.data;
    },
  });
}

export function useCreateAmenityBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      amenityId: string;
      residentId: string;
      startTime: string;
      endTime: string;
    }) => {
      const res = await api.post("/amenity-bookings", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amenityBookings"] });
    },
  });
}

export function useUpdateAmenityBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await api.put(`/amenity-bookings/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amenityBookings"] });
    },
  });
}

export function useUpdateAmenityBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }) => {
      const res = await api.patch(`/amenity-bookings/${id}/status`, {
        status,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amenityBookings"] });
    },
  });
}

export function useDeleteAmenityBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/amenity-bookings/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amenityBookings"] });
    },
  });
}
