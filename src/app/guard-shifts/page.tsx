"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

type GuardShift = {
  id: string;
  shiftType: "MORNING" | "AFTERNOON" | "NIGHT";
  startTime: string; // ISO datetime string
  endTime: string; // ISO datetime string
  recurringDaily?: boolean;
  recurringStartMinutes?: number | null;
  recurringEndMinutes?: number | null;
  gate: {
    name: string;
    location: string;
  };
  guard: {
    name: string;
    email: string;
  };
};

type Gate = {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
};

type Guard = {
  id: string;
  name: string;
  email: string;
};

type ShiftForm = {
  guardId: string;
  gateId: string;
  shiftType: "MORNING" | "AFTERNOON" | "NIGHT";
  date: string;
  startTime: string;
  endTime: string;
  /** Same shift window every calendar day (no specific date). */
  repeatDaily: boolean;
};

/** Parse `type="date"` + `type="time"` (HH:MM or HH:MM:SS) into a local Date (no broken `…T08:00:00:00.000Z`). */
function formatMinutesAsClock(m: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setMinutes(Math.min(Math.max(0, m), 24 * 60));
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function parseLocalDateTime(dateStr: string, timeStr: string): Date {
  const [ys, ms, ds] = dateStr.split("-").map((x) => parseInt(x, 10));
  const parts = timeStr.trim().split(":");
  const hh = parseInt(parts[0] ?? "0", 10);
  const mm = parseInt(parts[1] ?? "0", 10);
  const ss = parts.length >= 3 ? parseInt(String(parts[2]).slice(0, 2), 10) : 0;
  return new Date(ys, ms - 1, ds, hh, mm, ss);
}

export default function GuardShiftsPage() {
  const [shifts, setShifts] = useState<GuardShift[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [guards, setGuards] = useState<Guard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ShiftForm>({
    guardId: "",
    gateId: "",
    shiftType: "MORNING",
    date: "",
    startTime: "",
    endTime: "",
    repeatDaily: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const loadShifts = () => {
    setLoading(true);
    api
      .get("/guard-shifts")
      .then((response) => setShifts(response.data.shifts ?? []))
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load shifts";
        showToast(message, "error");
      })
      .finally(() => setLoading(false));
  };

  const loadGates = () => {
    api
      .get("/gates")
      .then((response) => {
        const allGates = response.data.gates ?? [];
        setGates(allGates.filter((g: Gate) => g.isActive));
      })
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load gates";
        showToast(message, "error");
      });
  };

  const loadGuards = () => {
    api
      .get("/users")
      .then((response) => {
        const allUsers = response.data.users ?? [];
        setGuards(allUsers.filter((u: { role: string }) => u.role === "GUARD"));
      })
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load guards";
        showToast(message, "error");
      });
  };

  useEffect(() => {
    loadShifts();
    loadGates();
    loadGuards();
  }, []);

  const handleOpenForm = () => {
    const today = new Date().toISOString().split("T")[0];
    setFormData({
      guardId: "",
      gateId: "",
      shiftType: "MORNING",
      date: today,
      startTime: "08:00",
      endTime: "16:00",
      repeatDaily: false,
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData({
      guardId: "",
      gateId: "",
      shiftType: "MORNING",
      date: "",
      startTime: "",
      endTime: "",
      repeatDaily: false,
    });
  };

  const handleShiftTypeChange = (type: "MORNING" | "AFTERNOON" | "NIGHT") => {
    let startTime = "08:00";
    let endTime = "16:00";

    if (type === "AFTERNOON") {
      startTime = "16:00";
      endTime = "00:00";
    } else if (type === "NIGHT") {
      startTime = "00:00";
      endTime = "08:00";
    }

    setFormData({ ...formData, shiftType: type, startTime, endTime });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.guardId) {
      showToast("Please select a guard", "error");
      return;
    }

    if (!formData.gateId) {
      showToast("Please select a gate", "error");
      return;
    }

    if (!formData.repeatDaily && !formData.date) {
      showToast("Please select a date", "error");
      return;
    }

    setSubmitting(true);

    try {
      if (formData.repeatDaily) {
        const anchor = "2000-01-01";
        const start = parseLocalDateTime(anchor, formData.startTime);
        let end = parseLocalDateTime(anchor, formData.endTime);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          showToast("Invalid time range", "error");
          setSubmitting(false);
          return;
        }
        if (end <= start) {
          end = new Date(end);
          end.setDate(end.getDate() + 1);
        }
        const recurringStartMinutes = start.getHours() * 60 + start.getMinutes();
        const recurringEndMinutes = end.getHours() * 60 + end.getMinutes();

        await api.post("/guard-shifts", {
          guardId: formData.guardId,
          gateId: formData.gateId,
          shiftType: formData.shiftType,
          recurringDaily: true,
          recurringStartMinutes,
          recurringEndMinutes,
        });
      } else {
        const start = parseLocalDateTime(formData.date, formData.startTime);
        let end = parseLocalDateTime(formData.date, formData.endTime);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          showToast("Invalid date or time", "error");
          setSubmitting(false);
          return;
        }
        // Same calendar day but clock end before start → crosses midnight (afternoon → midnight, night shift, etc.)
        if (end <= start) {
          end = new Date(end);
          end.setDate(end.getDate() + 1);
        }

        await api.post("/guard-shifts", {
          guardId: formData.guardId,
          gateId: formData.gateId,
          shiftType: formData.shiftType,
          recurringDaily: false,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        });
      }
      showToast("Guard shift scheduled successfully", "success");
      handleCloseForm();
      loadShifts();
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { message?: string; issues?: { path: (string | number)[]; message: string }[] } } })
        ?.response?.data;
      const firstIssue = data?.issues?.[0];
      const detail =
        firstIssue != null
          ? `${firstIssue.path?.filter(Boolean).join(".") || "request"}: ${firstIssue.message}`
          : undefined;
      const message = data?.message ?? "Failed to schedule shift";
      showToast(detail ? `${message} — ${detail}` : message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (shiftId: string) => {
    if (!confirm("Are you sure you want to delete this shift?")) return;

    try {
      await api.delete(`/guard-shifts/${shiftId}`);
      showToast("Shift deleted successfully", "success");
      loadShifts();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to delete shift";
      showToast(message, "error");
    }
  };

  const getShiftBadgeColor = (type: string) => {
    switch (type) {
      case "MORNING":
        return "badge-warning";
      case "AFTERNOON":
        return "badge-danger";
      case "NIGHT":
        return "badge-primary";
      default:
        return "badge-gray";
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <AppShell title="Guard Shifts">
      <div className="space-y-4">
        <div className="page-action-bar">
          <p className="text-fg-secondary">Schedule and manage guard shifts at gates</p>
          <button
            onClick={handleOpenForm}
            className="btn btn-primary"
          >
            + Schedule Shift
          </button>
        </div>

        {showForm && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">Schedule Guard Shift</h2>
            </div>
            <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Select Guard *
                  </label>
                  <select
                    required
                    value={formData.guardId}
                    onChange={(e) => setFormData({ ...formData, guardId: e.target.value })}
                    className="input"
                  >
                    <option value="">Choose a guard</option>
                    {guards.map((guard) => (
                      <option key={guard.id} value={guard.id}>
                        {guard.name} ({guard.email})
                      </option>
                    ))}
                  </select>
                  {guards.length === 0 && (
                    <p className="text-sm text-brand-danger mt-1">
                      No guards available. Please create guard users first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Assign to Gate *
                  </label>
                  <select
                    required
                    value={formData.gateId}
                    onChange={(e) => setFormData({ ...formData, gateId: e.target.value })}
                    className="input"
                  >
                    <option value="">Choose a gate</option>
                    {gates.map((gate) => (
                      <option key={gate.id} value={gate.id}>
                        {gate.name} - {gate.location}
                      </option>
                    ))}
                  </select>
                  {gates.length === 0 && (
                    <p className="text-sm text-brand-danger mt-1">
                      No active gates available. Please create gates first.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Shift Type *
                  </label>
                  <select
                    required
                    value={formData.shiftType}
                    onChange={(e) =>
                      handleShiftTypeChange(e.target.value as "MORNING" | "AFTERNOON" | "NIGHT")
                    }
                    className="input"
                  >
                    <option value="MORNING">Morning (8 AM - 4 PM)</option>
                    <option value="AFTERNOON">Afternoon (4 PM - 12 AM)</option>
                    <option value="NIGHT">Night (12 AM - 8 AM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Date {formData.repeatDaily ? "(not used)" : "*"}
                  </label>
                  <input
                    type="date"
                    required={!formData.repeatDaily}
                    disabled={formData.repeatDaily}
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className={`input ${
                      formData.repeatDaily ? "bg-surface-elevated text-fg-secondary cursor-not-allowed" : ""
                    }`}
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Time Range (clock times)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="input"
                    />
                    <span className="text-fg-secondary">to</span>
                    <input
                      type="time"
                      required
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-surface-border bg-brand-primary-light/80 px-4 py-3 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.repeatDaily}
                    onChange={(e) =>
                      setFormData({ ...formData, repeatDaily: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 rounded border-surface-border text-brand-primary"
                  />
                  <span>
                    <span className="font-medium text-fg-primary">Repeat every day</span>
                    <span className="block text-sm text-fg-secondary mt-0.5">
                      Same gate and guard on this time window every calendar day (including overnight
                      shifts). No single-date assignment — use the option above when you need one
                      specific day only.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting || guards.length === 0 || gates.length === 0}
                  className="btn btn-primary"
                >
                  {submitting ? "Scheduling..." : "Schedule Shift"}
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
              <p className="loading-state-text">Loading shifts...</p>
            </div>
          ) : (
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th className="table-th">Date</th>
                  <th className="table-th">Shift Type</th>
                  <th className="table-th">Time</th>
                  <th className="table-th">Guard</th>
                  <th className="table-th">Gate</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <span className="empty-state-icon">📅</span>
                        <p className="empty-state-title">No Shifts Scheduled</p>
                        <p className="empty-state-text">Click &quot;Schedule Shift&quot; to create your first shift.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  shifts.map((shift) => (
                    <tr key={shift.id} className="table-row">
                      <td className="table-td">
                        {shift.recurringDaily ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="font-medium text-info-fg">Every day</span>
                            {shift.recurringStartMinutes != null &&
                              shift.recurringEndMinutes != null && (
                                <span className="text-xs text-fg-secondary">
                                  (
                                  {formatMinutesAsClock(shift.recurringStartMinutes)}–
                                  {formatMinutesAsClock(shift.recurringEndMinutes)})
                                </span>
                              )}
                          </span>
                        ) : (
                          formatDate(shift.startTime)
                        )}
                      </td>
                      <td className="table-td">
                        <span
                          className={`badge ${getShiftBadgeColor(
                            shift.shiftType
                          )}`}
                        >
                          {shift.shiftType}
                        </span>
                      </td>
                      <td className="table-td text-xs">
                        {shift.recurringDaily &&
                        shift.recurringStartMinutes != null &&
                        shift.recurringEndMinutes != null ? (
                          <>
                            {formatMinutesAsClock(shift.recurringStartMinutes)} –{" "}
                            {formatMinutesAsClock(shift.recurringEndMinutes)}
                          </>
                        ) : (
                          <>
                            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                          </>
                        )}
                      </td>
                      <td className="table-td">
                        <div>
                          <div className="font-medium">{shift.guard.name}</div>
                          <div className="text-xs text-fg-secondary">{shift.guard.email}</div>
                        </div>
                      </td>
                      <td className="table-td">
                        <div>
                          <div className="font-medium">{shift.gate.name}</div>
                          <div className="text-xs text-fg-secondary">{shift.gate.location}</div>
                        </div>
                      </td>
                      <td className="table-td">
                        <button
                          onClick={() => handleDelete(shift.id)}
                          className="btn btn-danger !py-1 !px-3 text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
