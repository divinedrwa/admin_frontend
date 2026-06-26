"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { LogIn, LogOut, ChevronLeft, ChevronRight } from "lucide-react";

type StaffInfo = { id: string; name: string; type: string; phone: string; photo: string | null };
type AttendanceRecord = {
  id: string;
  staffId: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  notes: string | null;
  staff: StaffInfo;
  markedBy: { id: string; name: string };
};

const STAFF_TYPE_COLORS: Record<string, string> = {
  MAID: "bg-denied-bg text-denied-fg",
  COOK: "bg-pending-bg text-pending-fg",
  DRIVER: "bg-info-bg text-info-fg",
  NANNY: "bg-brand-primary-light text-brand-primary",
  GARDENER: "bg-approved-bg text-approved-fg",
  OTHER: "bg-surface-elevated text-fg-secondary",
};

const fmtTime = (d: string) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export default function StaffAttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [notCheckedIn, setNotCheckedIn] = useState<StaffInfo[]>([]);
  const [summary, setSummary] = useState({ total: 0, present: 0, absent: 0, checkedOut: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/staff-attendance?date=${date}`, { signal });
      setAttendance(data.attendance);
      setNotCheckedIn(data.notCheckedIn);
      setSummary(data.summary);
    } catch (error) {
      if ((error as { name?: string }).name === "CanceledError") return;
      /* ignore */
    } finally { setLoading(false); }
  }, [date]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const handleCheckIn = async (staffId: string) => {
    try {
      await api.post("/staff-attendance/check-in", { staffId });
      load();
    } catch (err: unknown) {
      showToast(parseApiError(err, "Check-in failed").message, "error");
    }
  };

  const handleCheckOut = async (id: string) => {
    try {
      await api.post(`/staff-attendance/${id}/check-out`, {});
      load();
    } catch (err: unknown) {
      showToast(parseApiError(err, "Check-out failed").message, "error");
    }
  };

  return (
    <AppShell title="Staff Attendance">
      <div className="space-y-4">
        {/* Date picker */}
        <div className="flex items-center gap-3">
          <button onClick={() => changeDate(-1)} className="rounded border p-1 hover:bg-surface-background"><ChevronLeft size={18} /></button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border px-3 py-2 text-sm" />
          <button onClick={() => changeDate(1)} className="rounded border p-1 hover:bg-surface-background"><ChevronRight size={18} /></button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded border bg-surface p-3 text-center">
            <div className="text-2xl font-bold text-fg-primary">{summary.total}</div>
            <div className="text-xs text-fg-tertiary">Total Staff</div>
          </div>
          <div className="rounded border bg-approved-bg p-3 text-center">
            <div className="text-2xl font-bold text-approved-fg">{summary.present}</div>
            <div className="text-xs text-fg-tertiary">Present</div>
          </div>
          <div className="rounded border bg-denied-bg p-3 text-center">
            <div className="text-2xl font-bold text-denied-fg">{summary.absent}</div>
            <div className="text-xs text-fg-tertiary">Absent</div>
          </div>
          <div className="rounded border bg-info-bg p-3 text-center">
            <div className="text-2xl font-bold text-info-fg">{summary.checkedOut}</div>
            <div className="text-xs text-fg-tertiary">Checked Out</div>
          </div>
        </div>

        {loading ? (
          <p className="text-fg-tertiary">Loading...</p>
        ) : (
          <>
            {/* Not checked in */}
            {notCheckedIn.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-fg-secondary">Not Checked In ({notCheckedIn.length})</h3>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {notCheckedIn.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded border bg-surface p-3">
                      <div>
                        <p className="font-medium text-fg-primary">{s.name}</p>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAFF_TYPE_COLORS[s.type] || "bg-surface-elevated text-fg-secondary"}`}>{s.type}</span>
                          <span className="text-xs text-fg-tertiary">{s.phone}</span>
                        </div>
                      </div>
                      <button onClick={() => handleCheckIn(s.id)} className="flex items-center gap-1 rounded bg-approved-solid px-3 py-1.5 text-xs text-white transition-opacity hover:opacity-90">
                        <LogIn size={14} /> Check In
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checked in */}
            {attendance.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-fg-secondary">Present ({attendance.length})</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y text-sm">
                    <thead className="bg-surface-background text-left text-xs uppercase text-fg-tertiary">
                      <tr>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Check In</th>
                        <th className="px-4 py-2">Check Out</th>
                        <th className="px-4 py-2">Duration</th>
                        <th className="px-4 py-2">Marked By</th>
                        <th className="px-4 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {attendance.map((r) => {
                        const checkIn = new Date(r.checkIn);
                        const checkOut = r.checkOut ? new Date(r.checkOut) : null;
                        const duration = checkOut
                          ? Math.round((checkOut.getTime() - checkIn.getTime()) / 60000)
                          : null;
                        return (
                          <tr key={r.id} className="hover:bg-surface-background">
                            <td className="px-4 py-2 font-medium text-fg-primary">{r.staff.name}</td>
                            <td className="px-4 py-2">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAFF_TYPE_COLORS[r.staff.type] || "bg-surface-elevated text-fg-secondary"}`}>{r.staff.type}</span>
                            </td>
                            <td className="px-4 py-2">{fmtTime(r.checkIn)}</td>
                            <td className="px-4 py-2">{checkOut ? fmtTime(r.checkOut!) : "-"}</td>
                            <td className="px-4 py-2">
                              {duration != null
                                ? `${Math.floor(duration / 60)}h ${duration % 60}m`
                                : "-"}
                            </td>
                            <td className="px-4 py-2 text-fg-tertiary">{r.markedBy.name}</td>
                            <td className="px-4 py-2">
                              {!r.checkOut && (
                                <button onClick={() => handleCheckOut(r.id)} className="flex items-center gap-1 rounded bg-pending-solid px-3 py-1 text-xs text-white transition-opacity hover:opacity-90">
                                  <LogOut size={14} /> Check Out
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
