"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

type CalendarTab = "calendar" | "amenities";

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

type CalendarOverview = {
  summary: {
    totalBookings: number;
    activeBookings: number;
    cancelledBookings: number;
    amenityCount: number;
  };
  byAmenity: Array<{
    amenityId: string;
    amenityName: string;
    bookingCount: number;
  }>;
  byDate: Array<{
    date: string;
    displayDate: string;
    bookingCount: number;
  }>;
  bookings: Array<{
    id: string;
    amenityName: string;
    amenityType: string;
    villa?: { villaNumber: string } | null;
    residentName: string;
    startTime: string;
    endTime: string;
    status: string;
  }>;
};

type AmenityCalendarItem = {
  id: string;
  name: string;
  type: string;
  availability: string;
  description?: string | null;
  capacity?: number | null;
  upcomingBookings: number;
  isActive: boolean;
};

export default function AmenityBookingCalendarPage() {
  const [activeTab, setActiveTab] = useState<CalendarTab>("calendar");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<CalendarOverview | null>(null);
  const [amenities, setAmenities] = useState<AmenityCalendarItem[]>([]);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(
        `/amenity-booking-calendar/overview?startDate=${startDate}&endDate=${endDate}`
      );
      setOverview(response.data);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.response?.data?.message || "Failed to fetch overview");
    } finally {
      setLoading(false);
    }
  }, [endDate, startDate]);

  const fetchAmenities = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/amenity-booking-calendar/amenities`);
      setAmenities(response.data.amenities);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.response?.data?.message || "Failed to fetch amenities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "calendar") void fetchOverview();
    else if (activeTab === "amenities") void fetchAmenities();
  }, [activeTab, fetchAmenities, fetchOverview]);

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
    <div className="min-h-screen bg-surface-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-fg-primary mb-2">📅 Amenity Booking Calendar</h1>
          <p className="text-fg-secondary">View and manage amenity bookings</p>
          <p className="text-sm text-fg-secondary mt-2">
            Change a booking’s outcome using the <strong>Status</strong> dropdown in the table (e.g. confirm a pending request or mark completed).
          </p>
        </div>

        <div className="tabs mb-6">
            {[
              { id: "calendar", label: "📅 Calendar" },
              { id: "amenities", label: "🏊 Amenities" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as CalendarTab)}
                className={activeTab === tab.id ? "tab tab-active" : "tab tab-inactive"}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {error && (
          <div className="bg-denied-bg border border-brand-danger text-denied-fg px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="loading-spinner w-10 h-10"></div>
            <p className="loading-state-text">Loading data...</p>
          </div>
        )}

        {!loading && activeTab === "calendar" && overview && (
          <div>
            <div className="filter-bar flex gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="stat-card">
                <p className="stat-card-label">Total Bookings</p>
                <p className="stat-card-value text-brand-primary">{overview.summary.totalBookings}</p>
              </div>
              <div className="stat-card">
                <p className="stat-card-label">Active</p>
                <p className="stat-card-value text-approved-solid">{overview.summary.activeBookings}</p>
              </div>
              <div className="stat-card">
                <p className="stat-card-label">Cancelled</p>
                <p className="stat-card-value text-brand-danger">{overview.summary.cancelledBookings}</p>
              </div>
              <div className="stat-card">
                <p className="stat-card-label">Amenities Used</p>
                <p className="stat-card-value text-brand-primary">{overview.summary.amenityCount}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="card">
                <div className="card-header"><h2 className="text-lg font-semibold">By Amenity</h2></div>
                <div className="card-body">
                <div className="space-y-3">
                  {overview.byAmenity.map((item) => (
                    <div key={item.amenityId}>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{item.amenityName}</span>
                        <span className="text-fg-secondary">{item.bookingCount} bookings</span>
                      </div>
                      <div className="w-full bg-surface-elevated rounded h-3">
                        <div
                          className="bg-brand-primary h-3 rounded"
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
              </div>

              <div className="card">
                <div className="card-header"><h2 className="text-lg font-semibold">By Date</h2></div>
                <div className="card-body">
                <div className="space-y-3">
                  {overview.byDate.slice(0, 10).map((item) => (
                    <div key={item.date} className="flex justify-between items-center">
                      <span className="font-medium">{item.displayDate}</span>
                      <span className="badge badge-info">
                        {item.bookingCount} bookings
                      </span>
                    </div>
                  ))}
                </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h2 className="text-lg font-semibold">All Bookings</h2></div>
              <div className="card-body">
              <div className="table-wrapper">
                <table className="table">
                  <thead className="table-head">
                    <tr>
                      <th className="table-th">
                        Amenity
                      </th>
                      <th className="table-th">
                        Villa
                      </th>
                      <th className="table-th">
                        Resident
                      </th>
                      <th className="table-th">
                        Start Time
                      </th>
                      <th className="table-th">
                        End Time
                      </th>
                      <th className="table-th">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.bookings.map((booking) => (
                      <tr key={booking.id} className="table-row">
                        <td className="table-td">
                          <div className="font-medium text-fg-primary">{booking.amenityName}</div>
                          <div className="text-xs text-fg-secondary">{booking.amenityType}</div>
                        </td>
                        <td className="table-td text-sm">
                          {booking.villa ? booking.villa.villaNumber : "N/A"}
                        </td>
                        <td className="table-td text-sm">
                          {booking.residentName}
                        </td>
                        <td className="table-td text-sm">
                          {formatDateTime(booking.startTime)}
                        </td>
                        <td className="table-td text-sm">
                          {formatDateTime(booking.endTime)}
                        </td>
                        <td className="table-td">
                          <select
                            value={booking.status}
                            disabled={updatingStatusId === booking.id}
                            onChange={(e) => {
                              const next = e.target.value;
                              updateBookingStatus(booking.id, next, booking.status);
                            }}
                            className="input text-xs max-w-[11rem] disabled:opacity-60"
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
          </div>
        )}

        {!loading && activeTab === "amenities" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {amenities.map((amenity) => (
              <div
                key={amenity.id}
                className="bg-surface rounded-lg shadow-lg p-6 border-l-4 border-brand-primary"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-fg-primary">{amenity.name}</h3>
                    <p className="text-sm text-fg-secondary">{amenity.type}</p>
                  </div>
                  <span
                    className={`badge ${
                      amenity.availability === "AVAILABLE"
                        ? "badge-success"
                        : amenity.availability === "BUSY"
                        ? "badge-warning"
                        : "badge-gray"
                    }`}
                  >
                    {amenity.availability}
                  </span>
                </div>

                {amenity.description && (
                  <p className="text-sm text-fg-secondary mb-4">{amenity.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-brand-primary-light rounded">
                    <p className="text-2xl font-bold text-brand-primary">{amenity.capacity || "N/A"}</p>
                    <p className="text-xs text-fg-secondary">Capacity</p>
                  </div>
                  <div className="text-center p-3 bg-brand-primary-light rounded">
                    <p className="text-2xl font-bold text-brand-primary">{amenity.upcomingBookings}</p>
                    <p className="text-xs text-fg-secondary">Upcoming</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <span
                    className={`badge ${
                      amenity.isActive
                        ? "badge-success"
                        : "badge-danger"
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
