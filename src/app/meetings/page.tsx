"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { useConfirm } from "@/components/ConfirmDialog";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { Meeting } from "@/types/meeting";
import { useMeetings } from "@/hooks/useMeetings";

const TYPE_COLORS: Record<string, string> = {
  AGM: "bg-info-bg text-info-fg",
  SGM: "bg-info-bg text-info-fg",
  COMMITTEE: "bg-info-bg text-info-fg",
  GENERAL: "bg-surface-elevated text-fg-secondary",
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-pending-bg text-pending-fg",
  IN_PROGRESS: "bg-info-bg text-info-fg",
  COMPLETED: "bg-approved-bg text-approved-fg",
  CANCELLED: "bg-denied-bg text-denied-fg",
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function MeetingsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [viewing, setViewing] = useState<Meeting | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const { confirm, ConfirmUI } = useConfirm();

  const [form, setForm] = useState({
    title: "", type: "GENERAL", status: "SCHEDULED", scheduledAt: "",
    location: "", agenda: "", minutes: "", attendeeCount: "",
  });

  const queryParams = useMemo(() => {
    const p: Record<string, unknown> = { page, pageSize: 20 };
    if (typeFilter) p.type = typeFilter;
    if (statusFilter) p.status = statusFilter;
    return p;
  }, [page, typeFilter, statusFilter]);

  const { data, isLoading: loading } = useMeetings(queryParams);
  const meetings = data?.meetings ?? [];
  const totalPages = data?.totalPages ?? 1;

  const resetForm = () => {
    setForm({ title: "", type: "GENERAL", status: "SCHEDULED", scheduledAt: "", location: "", agenda: "", minutes: "", attendeeCount: "" });
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (m: Meeting) => {
    setForm({
      title: m.title, type: m.type, status: m.status,
      scheduledAt: m.scheduledAt.slice(0, 16),
      location: m.location || "", agenda: m.agenda || "",
      minutes: m.minutes || "", attendeeCount: m.attendeeCount != null ? String(m.attendeeCount) : "",
    });
    setEditing(m);
    setShowForm(true);
    setViewing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        attendeeCount: form.attendeeCount ? parseInt(form.attendeeCount) : undefined,
        location: form.location || undefined,
        agenda: form.agenda || undefined,
        minutes: form.minutes || undefined,
      };
      if (editing) {
        await api.patch(`/meetings/${editing.id}`, payload);
      } else {
        await api.post("/meetings", payload);
      }
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    } catch (error) {
      showToast(parseApiError(error, "Failed to save meeting").message, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Delete meeting", message: "Delete this meeting?", confirmLabel: "Delete" }))) return;
    try {
      await api.delete(`/meetings/${id}`);
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    } catch (error) {
      showToast(parseApiError(error, "Failed to delete meeting").message, "error");
    }
  };

  return (
    <AppShell title="Meetings & AGM">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="rounded border px-3 py-2 text-sm">
              <option value="">All types</option>
              {["AGM", "SGM", "COMMITTEE", "GENERAL"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded border px-3 py-2 text-sm">
              <option value="">All statuses</option>
              {["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); setViewing(null); }} className="flex items-center gap-1 rounded bg-brand-primary px-4 py-2 text-sm text-white transition-colors hover:bg-brand-primary-hover">
            <Plus size={16} /> Schedule Meeting
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="rounded border bg-surface p-4 shadow space-y-3">
            <h3 className="font-semibold">{editing ? "Edit Meeting" : "Schedule Meeting"}</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">Title *</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm">
                  {["AGM", "SGM", "COMMITTEE", "GENERAL"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Scheduled At *</label>
                <input type="datetime-local" required value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium">Location</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" placeholder="e.g. Community Hall" />
              </div>
              {editing && (
                <>
                  <div>
                    <label className="block text-sm font-medium">Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm">
                      {["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Attendees</label>
                    <input type="number" min="0" value={form.attendeeCount} onChange={(e) => setForm({ ...form, attendeeCount: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
                  </div>
                </>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium">Agenda</label>
              <textarea rows={3} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
            </div>
            {editing && (
              <div>
                <label className="block text-sm font-medium">Minutes</label>
                <textarea rows={4} value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="rounded bg-brand-primary px-4 py-2 text-sm text-white transition-colors hover:bg-brand-primary-hover">{editing ? "Update" : "Create"}</button>
              <button type="button" onClick={resetForm} className="rounded border px-4 py-2 text-sm">Cancel</button>
            </div>
          </form>
        )}

        {viewing && (
          <div className="rounded border bg-surface p-4 shadow space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-fg-primary">{viewing.title}</h3>
              <button onClick={() => setViewing(null)} className="text-fg-tertiary hover:text-fg-secondary text-sm">Close</button>
            </div>
            <div className="flex gap-2 text-sm">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[viewing.type] || "bg-surface-elevated text-fg-secondary"}`}>{viewing.type}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[viewing.status] || "bg-surface-elevated text-fg-secondary"}`}>{viewing.status}</span>
            </div>
            <p className="text-sm text-fg-secondary">{fmtDate(viewing.scheduledAt)}{viewing.location ? ` | ${viewing.location}` : ""}</p>
            {viewing.attendeeCount != null && <p className="text-sm">Attendees: {viewing.attendeeCount}</p>}
            {viewing.agenda && (
              <div>
                <h4 className="font-medium text-sm">Agenda</h4>
                <p className="mt-1 text-sm text-fg-secondary whitespace-pre-wrap">{viewing.agenda}</p>
              </div>
            )}
            {viewing.minutes && (
              <div>
                <h4 className="font-medium text-sm">Minutes</h4>
                <p className="mt-1 text-sm text-fg-secondary whitespace-pre-wrap">{viewing.minutes}</p>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <p className="text-fg-tertiary">Loading...</p>
        ) : meetings.length === 0 ? (
          <p className="text-fg-tertiary">No meetings found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y text-sm">
              <thead className="bg-surface-background text-left text-xs uppercase text-fg-tertiary">
                <tr>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Scheduled</th>
                  <th className="px-4 py-2">Location</th>
                  <th className="px-4 py-2">Attendees</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {meetings.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-background">
                    <td className="px-4 py-2 font-medium text-fg-primary">{m.title}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[m.type] || "bg-surface-elevated text-fg-secondary"}`}>{m.type}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[m.status] || "bg-surface-elevated text-fg-secondary"}`}>{m.status}</span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{fmtDate(m.scheduledAt)}</td>
                    <td className="px-4 py-2">{m.location || "-"}</td>
                    <td className="px-4 py-2">{m.attendeeCount ?? "-"}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => { setViewing(m); setShowForm(false); }} className="rounded p-1 text-fg-secondary hover:bg-surface-background"><Eye size={14} /></button>
                        <button onClick={() => openEdit(m)} className="rounded p-1 text-brand-primary hover:bg-brand-primary-light"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(m.id)} className="rounded p-1 text-denied-fg hover:bg-denied-bg"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-1 text-sm disabled:opacity-50">Previous</button>
            <span className="px-3 py-1 text-sm">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded border px-3 py-1 text-sm disabled:opacity-50">Next</button>
          </div>
        )}
      </div>
      {ConfirmUI}
    </AppShell>
  );
}
