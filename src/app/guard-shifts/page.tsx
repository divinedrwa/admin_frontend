"use client";

import { Clock3, Plus } from "lucide-react";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { useConfirm } from "@/components/ConfirmDialog";
import { useGuardShifts, useGuards, useGenerateRoster } from "@/hooks/useGuardShifts";
import { useGates } from "@/hooks/useGates";
import { ShiftForm, RosterForm } from "@/types/guard";

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
  return (
    <Suspense fallback={<AppShell title="Guard Shifts"><div className="loading-state"><div className="loading-spinner w-10 h-10" /></div></AppShell>}>
      <GuardShiftsPageInner />
    </Suspense>
  );
}

function GuardShiftsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"single" | "roster">("roster");
  const [formData, setFormData] = useState<ShiftForm>({
    guardId: "",
    gateId: "",
    shiftType: "MORNING",
    date: "",
    startTime: "",
    endTime: "",
    repeatDaily: false,
    contactPhone: "",
  });
  const [rosterData, setRosterData] = useState<RosterForm>({
    guardId: "",
    gateId: "",
    shiftDurationHours: 8,
    dayStartTime: "06:00",
    contactPhones: ["", "", ""],
    notes: "",
    replaceExisting: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const { confirm, ConfirmUI } = useConfirm();

  const initialOffset = Number(searchParams.get("offset")) || 0;

  const { data: shiftsData, isLoading: loading } = useGuardShifts({ limit: 50, offset: initialOffset });
  const shifts = shiftsData?.shifts ?? [];
  const pgMeta = {
    total: shiftsData?.total ?? 0,
    limit: shiftsData?.limit ?? 50,
    offset: shiftsData?.offset ?? 0,
  };

  const { data: guards = [] } = useGuards();
  const { data: gatesData } = useGates();
  const gates = (gatesData?.gates ?? []).filter((g) => g.isActive);

  const handlePageChange = (newOffset: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newOffset > 0) params.set("offset", String(newOffset));
    else params.delete("offset");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const generateRoster = useGenerateRoster();

  const rosterSlotCount = 24 / rosterData.shiftDurationHours;

  const handleOpenForm = () => {
    const today = new Date().toISOString().split("T")[0];
    setFormMode("roster");
    setFormData({
      guardId: "",
      gateId: "",
      shiftType: "MORNING",
      date: today,
      startTime: "08:00",
      endTime: "16:00",
      repeatDaily: false,
      contactPhone: "",
    });
    setRosterData({
      guardId: "",
      gateId: "",
      shiftDurationHours: 8,
      dayStartTime: "06:00",
      contactPhones: ["", "", ""],
      notes: "",
      replaceExisting: true,
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
      contactPhone: "",
    });
  };

  const handleShiftTypeChange = (type: "MORNING" | "EVENING" | "NIGHT") => {
    let startTime = "06:00";
    let endTime = "14:00";

    if (type === "EVENING") {
      startTime = "14:00";
      endTime = "22:00";
    } else if (type === "NIGHT") {
      startTime = "22:00";
      endTime = "06:00";
    }

    setFormData({ ...formData, shiftType: type, startTime, endTime });
  };

  const handleRosterDurationChange = (hours: 8 | 12) => {
    const count = 24 / hours;
    const phones = [...rosterData.contactPhones];
    while (phones.length < count) phones.push("");
    setRosterData({
      ...rosterData,
      shiftDurationHours: hours,
      contactPhones: phones.slice(0, count),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formMode === "roster") {
      if (!rosterData.guardId || !rosterData.gateId) {
        showToast("Please select guard and gate", "error");
        return;
      }
      const anchor = "2000-01-01";
      const start = parseLocalDateTime(anchor, rosterData.dayStartTime);
      if (Number.isNaN(start.getTime())) {
        showToast("Invalid day start time", "error");
        return;
      }
      const dayStartMinutes = start.getHours() * 60 + start.getMinutes();

      setSubmitting(true);
      try {
        await generateRoster.mutateAsync({
          guardId: rosterData.guardId,
          gateId: rosterData.gateId,
          shiftDurationHours: rosterData.shiftDurationHours,
          dayStartMinutes,
          contactPhones: rosterData.contactPhones.map((p) => p.trim() || null),
          notes: rosterData.notes.trim() || undefined,
          replaceExisting: rosterData.replaceExisting,
        });
        showToast(
          `${rosterSlotCount} recurring shifts created for 24h coverage`,
          "success",
        );
        handleCloseForm();
      } catch (error: unknown) {
        const data = (error as { response?: { data?: { message?: string } } })?.response?.data;
        showToast(data?.message ?? "Failed to generate roster", "error");
      } finally {
        setSubmitting(false);
      }
      return;
    }

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
          ...(formData.contactPhone.trim()
            ? { contactPhone: formData.contactPhone.trim() }
            : {}),
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
          ...(formData.contactPhone.trim()
            ? { contactPhone: formData.contactPhone.trim() }
            : {}),
        });
      }
      showToast("Guard shift scheduled successfully", "success");
      handleCloseForm();
      queryClient.invalidateQueries({ queryKey: ["guard-shifts"] });
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
    if (!(await confirm({ title: "Delete shift", message: "Are you sure you want to delete this shift?", confirmLabel: "Delete" }))) return;

    try {
      await api.delete(`/guard-shifts/${shiftId}`);
      showToast("Shift deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["guard-shifts"] });
    } catch (error: unknown) {
      const message = parseApiError(error, "Failed to delete shift").message;
      showToast(message, "error");
    }
  };

  const getShiftBadgeColor = (type: string) => {
    switch (type) {
      case "MORNING":
        return "badge-warning";
      case "EVENING":
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
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Shift planning"
          title="Guard shifts"
          description="Schedule gate coverage, balance recurring or one-off shifts, and keep staffing visibility stronger for daily guard operations."
          icon={<Clock3 className="h-6 w-6" />}
          actions={
            <button onClick={handleOpenForm} className="btn btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Schedule Shift
            </button>
          }
        />

        {showForm && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">
                {formMode === "roster" ? "Generate 24h Roster" : "Schedule Guard Shift"}
              </h2>
            </div>
            <div className="card-body">
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                className={`btn ${formMode === "roster" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setFormMode("roster")}
              >
                24h roster (auto)
              </button>
              <button
                type="button"
                className={`btn ${formMode === "single" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setFormMode("single")}
              >
                Single shift
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formMode === "roster" ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-fg-primary mb-1">
                        Guard *
                      </label>
                      <select
                        required
                        value={rosterData.guardId}
                        onChange={(e) =>
                          setRosterData({ ...rosterData, guardId: e.target.value })
                        }
                        className="input"
                      >
                        <option value="">Choose a guard</option>
                        {guards.map((guard) => (
                          <option key={guard.id} value={guard.id}>
                            {guard.name} ({guard.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-fg-primary mb-1">
                        Gate *
                      </label>
                      <select
                        required
                        value={rosterData.gateId}
                        onChange={(e) =>
                          setRosterData({ ...rosterData, gateId: e.target.value })
                        }
                        className="input"
                      >
                        <option value="">Choose a gate</option>
                        {gates.map((gate) => (
                          <option key={gate.id} value={gate.id}>
                            {gate.name} - {gate.location}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-fg-primary mb-1">
                        Shift length *
                      </label>
                      <select
                        value={rosterData.shiftDurationHours}
                        onChange={(e) =>
                          handleRosterDurationChange(
                            Number(e.target.value) as 8 | 12,
                          )
                        }
                        className="input"
                      >
                        <option value={8}>8 hours (3 shifts / day)</option>
                        <option value={12}>12 hours (2 shifts / day)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-fg-primary mb-1">
                        Day starts at *
                      </label>
                      <input
                        type="time"
                        required
                        value={rosterData.dayStartTime}
                        onChange={(e) =>
                          setRosterData({ ...rosterData, dayStartTime: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div className="flex items-end">
                      <p className="text-sm text-fg-secondary pb-2">
                        Creates {rosterSlotCount} recurring daily shifts covering 24 hours.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-fg-primary">
                      Duty contact per shift (optional)
                    </p>
                    {rosterData.contactPhones.map((phone, i) => (
                      <div key={i}>
                        <label className="block text-xs text-fg-secondary mb-1">
                          Shift {i + 1} phone
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            const next = [...rosterData.contactPhones];
                            next[i] = e.target.value;
                            setRosterData({ ...rosterData, contactPhones: next });
                          }}
                          placeholder="e.g. 9876543210"
                          className="input"
                        />
                      </div>
                    ))}
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rosterData.replaceExisting}
                      onChange={(e) =>
                        setRosterData({
                          ...rosterData,
                          replaceExisting: e.target.checked,
                        })
                      }
                      className="mt-1"
                    />
                    <span className="text-sm text-fg-secondary">
                      Replace existing recurring shifts for this guard at this gate
                    </span>
                  </label>
                </>
              ) : (
              <>
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
                      handleShiftTypeChange(e.target.value as "MORNING" | "EVENING" | "NIGHT")
                    }
                    className="input"
                  >
                    <option value="MORNING">Morning</option>
                    <option value="EVENING">Evening</option>
                    <option value="NIGHT">Night</option>
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

              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">
                  Duty contact phone (optional)
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPhone: e.target.value })
                  }
                  placeholder="SIM for this shift window"
                  className="input"
                />
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
              </>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting || guards.length === 0 || gates.length === 0}
                  className="btn btn-primary"
                >
                  {submitting
                    ? "Saving..."
                    : formMode === "roster"
                      ? `Generate ${rosterSlotCount} shifts`
                      : "Schedule Shift"}
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
            <>
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th scope="col" className="table-th">Date</th>
                    <th scope="col" className="table-th">Shift Type</th>
                    <th scope="col" className="table-th">Time</th>
                    <th scope="col" className="table-th">Guard</th>
                    <th scope="col" className="table-th">Duty phone</th>
                    <th scope="col" className="table-th">Gate</th>
                    <th scope="col" className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState
                          icon={<Clock3 className="h-12 w-12" />}
                          title="No Shifts Scheduled"
                          description="Click &quot;Schedule Shift&quot; to create your first shift."
                        />
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
                        <td className="table-td text-xs">
                          {shift.contactPhone ?? "—"}
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
