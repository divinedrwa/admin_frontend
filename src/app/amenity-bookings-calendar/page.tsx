"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

export default function AmenityBookingCalendarPage() {
  const [activeTab, setActiveTab] = useState<"calendar" | "amenities">("calendar");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<any>(null);
  const [amenities, setAmenities] = useState<any[]>([]);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  useEffect(() => {
    if (activeTab === "calendar") fetchOverview();
    else if (activeTab === "amenities") fetchAmenities();
  }, [activeTab, startDate, endDate]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(
        `/amenity-booking-calendar/overview?startDate=${startDate}&endDate=${endDate}`
      );
      setOverview(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch overview");
    } finally {
      setLoading(false);
    }
  };

  const fetchAmenities = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/amenity-booking-calendar/amenities`);
      setAmenities(response.data.amenities);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch amenities");
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dt: string) => {
    return new Date(dt).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const updateBookingStatus = async (bookingId: string, status: string, current: string) => {
    if (status === current) return;
    setUpdatingStatusId(bookingId);
    try {
      await api.patch(`/amenity-bookings/${bookingId}/status`, { status });
      showToast("Booking status updated", "success");
      await fetchOverview();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to update status";
      showToast(msg, "error");
      await fetchOverview();
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📅 Amenity Booking Calendar</h1>
          <p className="text-gray-600">View and manage amenity bookings</p>
          <p className="text-sm text-gray-500 mt-2">
            Change a booking’s outcome using the <strong>Status</strong> dropdown in the table (e.g. confirm a pending request or mark completed).
          </p>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            {[
              { id: "calendar", label: "📅 Calendar" },
              { id: "amenities", label: "🏊 Amenities" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 font-medium ${
                  activeTab === tab.id
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading data...</p>
          </div>
        )}

        {!loading && activeTab === "calendar" && overview && (
          <div>
            <div className="flex gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-4 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-4 py-2 border rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Total Bookings</p>
                <p className="text-3xl font-bold text-blue-600">{overview.summary.totalBookings}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Active</p>
                <p className="text-3xl font-bold text-green-600">{overview.summary.activeBookings}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Cancelled</p>
                <p className="text-3xl font-bold text-red-600">{overview.summary.cancelledBookings}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Amenities Used</p>
                <p className="text-3xl font-bold text-purple-600">{overview.summary.amenityCount}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">By Amenity</h2>
                <div className="space-y-3">
                  {overview.byAmenity.map((item: any) => (
                    <div key={item.amenityId}>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{item.amenityName}</span>
                        <span className="text-gray-600">{item.bookingCount} bookings</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded h-3">
                        <div
                          className="bg-blue-600 h-3 rounded"
                          style={{
                            width: `${
                              (item.bookingCount / overview.summary.totalBookings) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">By Date</h2>
                <div className="space-y-3">
                  {overview.byDate.slice(0, 10).map((item: any) => (
                    <div key={item.date} className="flex justify-between items-center">
                      <span className="font-medium">{item.displayDate}</span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                        {item.bookingCount} bookings
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">All Bookings</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amenity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Villa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Resident
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Start Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        End Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {overview.bookings.map((booking: any) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{booking.amenityName}</div>
                          <div className="text-xs text-gray-500">{booking.amenityType}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {booking.villa ? booking.villa.villaNumber : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {booking.residentName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatDateTime(booking.startTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatDateTime(booking.endTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={booking.status}
                            disabled={updatingStatusId === booking.id}
                            onChange={(e) => {
                              const next = e.target.value;
                              updateBookingStatus(booking.id, next, booking.status);
                            }}
                            className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white max-w-[11rem] disabled:opacity-60"
                            aria-label="Update booking status"
                          >
                            {BOOKING_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === "amenities" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {amenities.map((amenity) => (
              <div
                key={amenity.id}
                className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{amenity.name}</h3>
                    <p className="text-sm text-gray-600">{amenity.type}</p>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs rounded-full ${
                      amenity.availability === "AVAILABLE"
                        ? "bg-green-100 text-green-800"
                        : amenity.availability === "BUSY"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {amenity.availability}
                  </span>
                </div>

                {amenity.description && (
                  <p className="text-sm text-gray-600 mb-4">{amenity.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <p className="text-2xl font-bold text-blue-600">{amenity.capacity || "N/A"}</p>
                    <p className="text-xs text-gray-600">Capacity</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded">
                    <p className="text-2xl font-bold text-purple-600">{amenity.upcomingBookings}</p>
                    <p className="text-xs text-gray-600">Upcoming</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      amenity.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {amenity.isActive ? "✅ Active" : "⛔ Inactive"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
