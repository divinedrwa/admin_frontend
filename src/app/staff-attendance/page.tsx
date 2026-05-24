"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
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
  MAID: "bg-pink-100 text-pink-700",
  COOK: "bg-orange-100 text-orange-700",
  DRIVER: "bg-blue-100 text-blue-700",
  NANNY: "bg-purple-100 text-purple-700",
  GARDENER: "bg-green-100 text-green-700",
  OTHER: "bg-gray-100 text-gray-700",
};

const fmtTime = (d: string) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export default function StaffAttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [notCheckedIn, setNotCheckedIn] = useState<StaffInfo[]>([]);
  const [summary, setSummary] = useState({ total: 0, present: 0, absent: 0, checkedOut: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/staff-attendance?date=${date}`);
      setAttendance(data.attendance);
      setNotCheckedIn(data.notCheckedIn);
      setSummary(data.summary);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

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
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Check-in failed";
      alert(msg);
    }
  };

  const handleCheckOut = async (id: string) => {
    try {
      await api.post(`/staff-attendance/${id}/check-out`, {});
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Check-out failed";
      alert(msg);
    }
  };

  return (
    <AppShell title="Staff Attendance">
      <div className="space-y-4">
        {/* Date picker */}
        <div className="flex items-center gap-3">
          <button onClick={() => changeDate(-1)} className="rounded border p-1 hover:bg-gray-100"><ChevronLeft size={18} /></button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border px-3 py-2 text-sm" />
          <button onClick={() => changeDate(1)} className="rounded border p-1 hover:bg-gray-100"><ChevronRight size={18} /></button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded border bg-white p-3 text-center">
            <div className="text-2xl font-bold">{summary.total}</div>
            <div className="text-xs text-gray-500">Total Staff</div>
          </div>
          <div className="rounded border bg-green-50 p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{summary.present}</div>
            <div className="text-xs text-gray-500">Present</div>
          </div>
          <div className="rounded border bg-red-50 p-3 text-center">
            <div className="text-2xl font-bold text-red-700">{summary.absent}</div>
            <div className="text-xs text-gray-500">Absent</div>
          </div>
          <div className="rounded border bg-blue-50 p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{summary.checkedOut}</div>
            <div className="text-xs text-gray-500">Checked Out</div>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <>
            {/* Not checked in */}
            {notCheckedIn.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-600">Not Checked In ({notCheckedIn.length})</h3>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {notCheckedIn.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded border bg-white p-3">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAFF_TYPE_COLORS[s.type] || "bg-gray-100"}`}>{s.type}</span>
                          <span className="text-xs text-gray-500">{s.phone}</span>
                        </div>
                      </div>
                      <button onClick={() => handleCheckIn(s.id)} className="flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700">
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
                <h3 className="mb-2 text-sm font-semibold text-gray-600">Present ({attendance.length})</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
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
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium">{r.staff.name}</td>
                            <td className="px-4 py-2">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAFF_TYPE_COLORS[r.staff.type] || "bg-gray-100"}`}>{r.staff.type}</span>
                            </td>
                            <td className="px-4 py-2">{fmtTime(r.checkIn)}</td>
                            <td className="px-4 py-2">{checkOut ? fmtTime(r.checkOut!) : "-"}</td>
                            <td className="px-4 py-2">
                              {duration != null
                                ? `${Math.floor(duration / 60)}h ${duration % 60}m`
                                : "-"}
                            </td>
                            <td className="px-4 py-2 text-gray-500">{r.markedBy.name}</td>
                            <td className="px-4 py-2">
                              {!r.checkOut && (
                                <button onClick={() => handleCheckOut(r.id)} className="flex items-center gap-1 rounded bg-orange-600 px-3 py-1 text-xs text-white hover:bg-orange-700">
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
