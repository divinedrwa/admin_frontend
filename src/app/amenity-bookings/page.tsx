"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";

type AmenityBooking = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice?: number;
  amenity?: {
    name: string;
    type: string;
  } | null;
  resident?: {
    name: string;
  } | null;
};

type Amenity = {
  id: string;
  name: string;
  type: string;
  pricePerHour?: number;
};

type Resident = {
  id: string;
  name: string;
};

export default function AmenityBookingsPage() {
  const [bookings, setBookings] = useState<AmenityBooking[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingBooking, setEditingBooking] = useState<AmenityBooking | null>(null);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [formData, setFormData] = useState({
    amenityId: "",
    residentId: "",
    startTime: "",
    endTime: ""
  });

  const loadBookings = () => {
    setLoading(true);
    api
      .get("/amenity-bookings")
      .then((response) => setBookings(response.data.bookings ?? []))
      .catch(() => showToast("Failed to load bookings", "error"))
      .finally(() => setLoading(false));
  };

  const loadDropdownData = () => {
    api
      .get("/amenities")
      .then((response) => setAmenities(response.data.amenities ?? []))
      .catch(() => showToast("Failed to load amenities", "error"));

    api
      .get("/users?role=RESIDENT")
      .then((response) => setResidents(response.data.users ?? []))
      .catch(() => showToast("Failed to load residents", "error"));
  };

  useEffect(() => {
    loadBookings();
    loadDropdownData();
  }, []);

  // Filter and search logic
  const filteredBookings = bookings.filter((booking) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesAmenity = (booking.amenity?.name?.toLowerCase() ?? "").includes(query);
      const matchesResident = (booking.resident?.name?.toLowerCase() ?? "").includes(query);
      if (!matchesAmenity && !matchesResident) return false;
    }
    if (statusFilter !== "all" && booking.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

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
      loadBookings();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to update status";
      showToast(message, "error");
      loadBookings();
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
    if (!window.confirm("Are you sure you want to delete this booking? This action cannot be undone.")) {
      return;
    }

    setDeletingBookingId(bookingId);
    try {
      await api.delete(`/amenity-bookings/${bookingId}`);
      showToast("Booking deleted successfully", "success");
      loadBookings();
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
      loadBookings();
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
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <p className="text-gray-600">Manage amenity bookings and reservations</p>
            <p className="text-sm text-gray-500 mt-1">
              Set <strong>Pending</strong> → <strong>CONFIRMED</strong> to approve, or <strong>COMPLETED</strong> / <strong>CANCELLED</strong> when done.
            </p>
          </div>
          <button
            onClick={handleOpenForm}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Book Amenity
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search by amenity or resident name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="all">All Status ({bookings.length})</option>
                <option value="PENDING">Pending ({statusCounts.PENDING})</option>
                <option value="CONFIRMED">Confirmed ({statusCounts.CONFIRMED})</option>
                <option value="COMPLETED">Completed ({statusCounts.COMPLETED})</option>
                <option value="CANCELLED">Cancelled ({statusCounts.CANCELLED})</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center text-sm">
            <span className="text-gray-600">Showing {paginatedBookings.length} of {filteredBookings.length} bookings</span>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
                <span>Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
              </div>
            )}
          </div>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">{editingBooking ? "Edit Booking" : "Book Amenity"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingBooking ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amenity *
                    </label>
                    <select
                      required
                      value={formData.amenityId}
                      onChange={(e) => setFormData({ ...formData, amenityId: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Resident *
                    </label>
                    <select
                      required
                      value={formData.residentId}
                      onChange={(e) => setFormData({ ...formData, residentId: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
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
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submitting ? (editingBooking ? "Updating..." : "Booking...") : (editingBooking ? "Update Booking" : "Book Amenity")}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="bg-gray-200 text-gray-800 px-6 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Loading bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">
                {searchQuery || statusFilter !== "all" ? "No bookings match your search criteria." : "No bookings found. Click \"Book Amenity\" to add one."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amenity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resident</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{booking.amenity?.name || "N/A"}</div>
                        <div className="text-xs text-gray-500">{booking.amenity?.type || ""}</div>
                      </td>
                      <td className="px-4 py-3">{booking.resident?.name || "N/A"}</td>
                      <td className="px-4 py-3 text-xs">{formatDateTime(booking.startTime)}</td>
                      <td className="px-4 py-3 text-xs">{formatDateTime(booking.endTime)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={booking.status}
                          disabled={updatingStatusId === booking.id}
                          onChange={(e) =>
                            updateBookingStatus(booking.id, e.target.value, booking.status)
                          }
                          className="text-xs rounded border border-gray-300 bg-white px-2 py-1 max-w-[10rem] disabled:opacity-60"
                          aria-label="Booking status"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {booking.totalPrice ? `₹${booking.totalPrice}` : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(booking)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit booking"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(booking.id)}
                            disabled={deletingBookingId === booking.id}
                            className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
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
          )}
        </div>
      </div>
    </AppShell>
  );
}
