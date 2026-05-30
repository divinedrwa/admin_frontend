"use client";

import { CalendarRange, Plus } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { Pagination } from "@/components/Pagination";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAmenityBookings, useAmenities } from "@/hooks/useAmenities";
import { AmenityBooking } from "@/types/amenity";

type Resident = {
  id: string;
  name: string;
};

export default function AmenityBookingsPage() {
  return (
    <Suspense fallback={<AppShell title="Amenity Bookings"><div className="loading-state"><div className="loading-spinner w-10 h-10" /></div></AppShell>}>
      <AmenityBookingsPageInner />
    </Suspense>
  );
}

function AmenityBookingsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingBooking, setEditingBooking] = useState<AmenityBooking | null>(null);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const { confirm, ConfirmUI } = useConfirm();

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [formData, setFormData] = useState({
    amenityId: "",
    residentId: "",
    startTime: "",
    endTime: ""
  });

  const initialOffset = Number(searchParams.get("offset")) || 0;

  const bookingQueryParams = useMemo(() => ({
    limit: 50,
    offset: initialOffset,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  }), [initialOffset, debouncedSearch, statusFilter]);

  const { data: bookingsData, isLoading: loading } = useAmenityBookings(bookingQueryParams);
  const bookings = bookingsData?.bookings ?? [];
  const pgMeta = {
    total: bookingsData?.total ?? 0,
    limit: bookingsData?.limit ?? 50,
    offset: bookingsData?.offset ?? 0,
  };

  const { data: amenitiesData } = useAmenities();
  const amenities = amenitiesData?.amenities ?? [];

  // Residents dropdown still loaded manually (no dedicated hook)
  useEffect(() => {
    api
      .get("/users?role=RESIDENT&limit=200")
      .then((response) => setResidents(response.data.users ?? []))
      .catch(() => showToast("Failed to load residents", "error"));
  }, []);

  const handlePageChange = (newOffset: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newOffset > 0) params.set("offset", String(newOffset));
    else params.delete("offset");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const statusCounts = {
    PENDING: bookings.filter((b) => b.status === "PENDING").length,
    CONFIRMED: bookings.filter((b) => b.status === "CONFIRMED").length,
    COMPLETED: bookings.filter((b) => b.status === "COMPLETED").length,
    CANCELLED: bookings.filter((b) => b.status === "CANCELLED").length,
  };

  const updateBookingStatus = async (bookingId: string, status: string, current: string) => {
    if (status === current) return;
    setUpdatingStatusId(bookingId);
    try {
      await api.patch(`/amenity-bookings/${bookingId}/status`, { status });
      showToast("Status updated", "success");
      queryClient.invalidateQueries({ queryKey: ["amenityBookings"] });
    } catch (error: unknown) {
      const message = parseApiError(error, "Failed to update status").message;
      showToast(message, "error");
      queryClient.invalidateQueries({ queryKey: ["amenityBookings"] });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleOpenForm = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0); // Next hour
    const startStr = now.toISOString().slice(0, 16);
    now.setHours(now.getHours() + 2); // 2 hours later
    const endStr = now.toISOString().slice(0, 16);

    setEditingBooking(null);
    setFormData({
      amenityId: "",
      residentId: "",
      startTime: startStr,
      endTime: endStr
    });
    setShowForm(true);
  };

  const handleEdit = (booking: AmenityBooking) => {
    setEditingBooking(booking);
    setFormData({
      amenityId: "", // Can't change amenity
      residentId: "", // Can't change resident
      startTime: booking.startTime.slice(0, 16),
      endTime: booking.endTime.slice(0, 16)
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingBooking(null);
  };

  const handleDelete = async (bookingId: string) => {
    if (!(await confirm({ title: "Delete booking", message: "Are you sure you want to delete this booking? This action cannot be undone.", confirmLabel: "Delete" }))) {
      return;
    }

    setDeletingBookingId(bookingId);
    try {
      await api.delete(`/amenity-bookings/${bookingId}`);
      showToast("Booking deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["amenityBookings"] });
    } catch (error: unknown) {
      const message = parseApiError(error, "Failed to delete booking").message;
      showToast(message, "error");
    } finally {
      setDeletingBookingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingBooking && (!formData.amenityId || !formData.residentId)) {
      showToast("Please select amenity and resident", "error");
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      showToast("Please fill all required fields", "error");
      return;
    }

    if (new Date(formData.endTime) <= new Date(formData.startTime)) {
      showToast("End time must be after start time", "error");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        amenityId: editingBooking ? undefined : formData.amenityId,
        residentId: editingBooking ? undefined : formData.residentId,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString()
      };

      if (editingBooking) {
        await api.put(`/amenity-bookings/${editingBooking.id}`, payload);
        showToast("Booking updated successfully", "success");
      } else {
        await api.post("/amenity-bookings", payload);
        showToast("Amenity booked successfully", "success");
      }

      handleCloseForm();
      queryClient.invalidateQueries({ queryKey: ["amenityBookings"] });
    } catch (error: unknown) {
      const message = parseApiError(error, editingBooking ? "Failed to update booking" : "Failed to book amenity").message;
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AppShell title="Amenity Bookings">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Reservation desk"
          title="Amenity bookings"
          description="Manage resident amenity reservations, review booking status, and keep approvals or completions consistent across the booking lifecycle."
          icon={<CalendarRange className="h-6 w-6" />}
          actions={
            <button onClick={handleOpenForm} className="btn btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Book Amenity
            </button>
          }
        />

        {/* Search and Filters */}
        <div className="filter-bar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search by amenity or resident name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Status ({bookings.length} on this page)</option>
                <option value="PENDING">Pending ({statusCounts.PENDING} on this page)</option>
                <option value="CONFIRMED">Confirmed ({statusCounts.CONFIRMED} on this page)</option>
                <option value="COMPLETED">Completed ({statusCounts.COMPLETED} on this page)</option>
                <option value="CANCELLED">Cancelled ({statusCounts.CANCELLED} on this page)</option>
              </select>
            </div>
          </div>
          <div className="mt-3 text-sm text-fg-secondary">
            Showing {bookings.length} of {pgMeta.total} bookings
          </div>
        </div>

        {showForm && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">{editingBooking ? "Edit Booking" : "Book Amenity"}</h2>
            </div>
            <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingBooking ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-1">
                      Amenity *
                    </label>
                    <select
                      required
                      value={formData.amenityId}
                      onChange={(e) => setFormData({ ...formData, amenityId: e.target.value })}
                      className="input"
                    >
                      <option value="">Select amenity</option>
                      {amenities.map((amenity) => (
                        <option key={amenity.id} value={amenity.id}>
                          {amenity.name} ({amenity.type})
                          {amenity.pricePerHour && ` - ₹${amenity.pricePerHour}/hr`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-1">
                      Resident *
                    </label>
                    <select
                      required
                      value={formData.residentId}
                      onChange={(e) => setFormData({ ...formData, residentId: e.target.value })}
                      className="input"
                    >
                      <option value="">Select resident</option>
                      {residents.map((resident) => (
                        <option key={resident.id} value={resident.id}>
                          {resident.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="bg-surface-background p-3 rounded">
                  <p className="text-sm text-fg-secondary">
                    <span className="font-medium">Amenity:</span>{" "}
                    {editingBooking.amenity
                      ? `${editingBooking.amenity.name} (${editingBooking.amenity.type})`
                      : "—"}{" "}
                    |
                    <span className="font-medium ml-2">Resident:</span>{" "}
                    {editingBooking.resident?.name ?? "Unknown"}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? (editingBooking ? "Updating..." : "Booking...") : (editingBooking ? "Update Booking" : "Book Amenity")}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        )}

        <div className="table-wrapper">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner w-10 h-10"></div>
              <p className="loading-state-text">Loading bookings...</p>
            </div>
          ) : bookings.length === 0 && pgMeta.total === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📅</span>
              <p className="empty-state-title">No bookings found</p>
              <p className="empty-state-text">
                {searchQuery || statusFilter !== "all" ? "No bookings match your search criteria." : "Click \"Book Amenity\" to add one."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-head">
                    <tr>
                      <th scope="col" className="table-th">Amenity</th>
                      <th scope="col" className="table-th">Resident</th>
                      <th scope="col" className="table-th">Start Time</th>
                      <th scope="col" className="table-th">End Time</th>
                      <th scope="col" className="table-th">Status</th>
                      <th scope="col" className="table-th">Price</th>
                      <th scope="col" className="table-th">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="table-row">
                        <td className="table-td">
                          <div className="font-medium text-fg-primary">{booking.amenity?.name || "N/A"}</div>
                          <div className="text-xs text-fg-secondary">{booking.amenity?.type || ""}</div>
                        </td>
                        <td className="table-td">{booking.resident?.name || "N/A"}</td>
                        <td className="table-td text-xs">{formatDateTime(booking.startTime)}</td>
                        <td className="table-td text-xs">{formatDateTime(booking.endTime)}</td>
                        <td className="table-td">
                          <select
                            value={booking.status}
                            disabled={updatingStatusId === booking.id}
                            onChange={(e) =>
                              updateBookingStatus(booking.id, e.target.value, booking.status)
                            }
                            className="text-xs rounded border border-surface-border bg-surface px-2 py-1 max-w-[10rem] disabled:opacity-60"
                            aria-label="Booking status"
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </td>
                        <td className="table-td font-medium">
                          {booking.totalPrice ? `₹${booking.totalPrice}` : "-"}
                        </td>
                        <td className="table-td">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(booking)}
                              className="p-1 text-brand-primary hover:bg-brand-primary-light rounded"
                              title="Edit booking"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(booking.id)}
                              disabled={deletingBookingId === booking.id}
                              className="p-1 text-brand-danger hover:bg-denied-bg rounded disabled:opacity-50"
                              title="Delete booking"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                total={pgMeta.total}
                limit={pgMeta.limit}
                offset={pgMeta.offset}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </div>
      {ConfirmUI}
    </AppShell>
  );
}
