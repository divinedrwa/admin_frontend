"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Clock, Calendar, MapPin, LogIn, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { parseApiError } from "@/utils/errorHandler";
import { useGates } from "@/hooks/useGates";

interface GarbageEvent {
  id: string;
  entryTime: string;
  exitTime: string | null;
  notes: string | null;
  gate: { id: string; name: string; location?: string | null } | null;
  guard?: { name: string } | null;
}

export default function GarbageCollectionPage() {
  const [events, setEvents] = useState<GarbageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState<GarbageEvent | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: gatesData } = useGates();
  const gates = gatesData?.gates ?? [];
  const [selectedGateId, setSelectedGateId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchActive = useCallback(async () => {
    try {
      const res = await api.get("/garbage-collection/active");
      setActiveEvent(res.data?.event ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const res = await api.get(`/garbage-collection/history?${params.toString()}`);
      setEvents(res.data?.events ?? []);
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to load history").message, "error");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const handleEntry = async () => {
    const gateId = selectedGateId || gates[0]?.id;
    if (!gateId) {
      showToast("No gate available", "error");
      return;
    }
    try {
      setSubmitting(true);
      await api.post("/garbage-collection/entry", { gateId, notes: notes || undefined });
      showToast("Garbage collector entry logged", "success");
      setNotes("");
      void fetchActive();
      void fetchHistory();
    } catch (err: unknown) {
      showToast(parseApiError(err, "Failed to log entry").message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExit = async () => {
    if (!activeEvent) {
      showToast("No active garbage collection event", "error");
      return;
    }
    try {
      setSubmitting(true);
      await api.patch(`/garbage-collection/${activeEvent.id}/exit`, { notes: notes || undefined });
      showToast("Garbage collector exit logged", "success");
      setNotes("");
      void fetchActive();
      void fetchHistory();
    } catch (err: unknown) {
      showToast(parseApiError(err, "Failed to log exit").message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    void fetchActive();
    void fetchHistory();
  }, [fetchActive, fetchHistory]);

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getDuration(entry: string, exit: string | null) {
    if (!exit) return "Ongoing";
    const ms = new Date(exit).getTime() - new Date(entry).getTime();
    const mins = Math.round(ms / 60_000);
    return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  if (loading) {
    return (
      <AppShell title="Garbage Collection">
        <div className="loading-state">
          <div className="loading-spinner w-10 h-10" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Garbage Collection">
      <div className="space-y-6 p-6">
        <AdminPageHeader
          eyebrow="Analytics"
          title="Garbage Collection"
          description="Track garbage collector entry/exit events and collection patterns."
          icon={<Trash2 className="h-6 w-6" />}
        />

        {/* Garbage Collection Controls */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-fg-primary mb-4">Garbage Collection Control</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-sm font-medium text-fg-secondary mb-1">Gate</label>
              <select
                value={selectedGateId || gates[0]?.id || ""}
                onChange={(e) => setSelectedGateId(e.target.value)}
                className="input w-full"
              >
                {gates.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-sm font-medium text-fg-secondary mb-1">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Municipal truck"
                className="input w-full"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleEntry}
                disabled={submitting || gates.length === 0 || !!activeEvent}
                className="btn bg-approved-solid hover:bg-approved-solid/90 text-white flex items-center gap-2 disabled:opacity-50"
                title={activeEvent ? "A collector is already inside" : ""}
              >
                <LogIn className="h-4 w-4" />
                Inside
              </button>
              <button
                onClick={handleExit}
                disabled={submitting || !activeEvent}
                className="btn bg-brand-danger hover:bg-brand-danger/90 text-white flex items-center gap-2 disabled:opacity-50"
                title={!activeEvent ? "No active collection event" : ""}
              >
                <LogOut className="h-4 w-4" />
                Left from Society
              </button>
            </div>
          </div>
        </div>

        {/* Active Event */}
        {activeEvent && (
          <div className="card p-4 border-l-4 border-l-brand-success">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-brand-success animate-pulse" />
              <div>
                <p className="font-semibold text-fg-primary">Collector currently inside</p>
                <p className="text-sm text-fg-secondary">
                  Entered at {formatTime(activeEvent.entryTime)}
                  {activeEvent.gate ? ` via ${activeEvent.gate.name}` : ""}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filter-bar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input w-full"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="btn btn-ghost"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th scope="col" className="table-th">Date</th>
                  <th scope="col" className="table-th">Gate</th>
                  <th scope="col" className="table-th">Entry</th>
                  <th scope="col" className="table-th">Exit</th>
                  <th scope="col" className="table-th">Duration</th>
                  <th scope="col" className="table-th">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="empty-state">
                        <p className="empty-state-title">No collection events found</p>
                        <p className="text-fg-secondary text-sm">Events are logged by guards at the gates.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  events.map((ev) => (
                    <tr key={ev.id} className="table-row">
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-fg-tertiary" />
                          {new Date(ev.entryTime).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-fg-tertiary" />
                          {ev.gate?.name ?? "—"}
                        </div>
                      </td>
                      <td className="table-td">
                        {new Date(ev.entryTime).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="table-td">
                        {ev.exitTime
                          ? new Date(ev.exitTime).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : <span className="badge badge-warning">In progress</span>}
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-fg-tertiary" />
                          {getDuration(ev.entryTime, ev.exitTime)}
                        </div>
                      </td>
                      <td className="table-td text-fg-secondary">{ev.notes || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
