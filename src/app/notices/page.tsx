"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

type ResidentOption = {
  id: string;
  name: string;
  email: string;
  villa?: { villaNumber: string | null; block: string | null } | null;
};

type Notice = {
  id: string;
  title: string;
  content: string;
  fileUrl: string | null;
  createdAt: string;
  category?: string;
  priority?: string;
  isUrgent?: boolean;
  recipients?: Array<{
    userId: string;
    user: { id: string; name: string; email: string; villa?: { villaNumber: string | null; block: string | null } };
  }>;
};

type NoticeForm = {
  title: string;
  content: string;
  fileUrl: string;
  category: string;
  priority: string;
  isUrgent: boolean;
  recipientUserIds: string[];
};

const NOTICE_CATEGORIES = [
  { value: "GENERAL", label: "General" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "EVENT", label: "Events" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "ANNOUNCEMENT", label: "Announcement" },
  { value: "MEETING", label: "Meeting" }
] as const;

const NOTICE_PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" }
] as const;

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<NoticeForm>({
    title: "",
    content: "",
    fileUrl: "",
    category: "GENERAL",
    priority: "NORMAL",
    isUrgent: false,
    recipientUserIds: []
  });
  const [residentOptions, setResidentOptions] = useState<ResidentOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadNotices = () => {
    setLoading(true);
    api
      .get("/notices")
      .then((response) => setNotices(response.data.notices ?? []))
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load notices";
        showToast(message, "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotices();
  }, []);

  useEffect(() => {
    if (!showForm) return;
    api
      .get<{ users: ResidentOption[] }>("/users", {
        params: { role: "RESIDENT", isActive: "true" }
      })
      .then((res) => setResidentOptions(res.data.users ?? []))
      .catch(() => setResidentOptions([]));
  }, [showForm]);

  const handleOpenForm = () => {
    setFormData({
      title: "",
      content: "",
      fileUrl: "",
      category: "GENERAL",
      priority: "NORMAL",
      isUrgent: false,
      recipientUserIds: []
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData({
      title: "",
      content: "",
      fileUrl: "",
      category: "GENERAL",
      priority: "NORMAL",
      isUrgent: false,
      recipientUserIds: []
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const title = formData.title.trim();
      const content = formData.content.trim();
      const attachment = formData.fileUrl.trim();
      const payload: Record<string, string | boolean | string[]> = {
        title,
        content,
        notifyResidents: true,
        category: formData.category,
        priority: formData.priority,
        isUrgent: formData.isUrgent
      };
      if (attachment) payload.fileUrl = attachment;
      if (formData.recipientUserIds.length > 0) {
        payload.recipientUserIds = formData.recipientUserIds;
      }

      await api.post("/notices", payload);
      showToast("Notice posted successfully. Residents will be notified.", "success");
      handleCloseForm();
      loadNotices();
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { message?: string; issues?: { path?: (string | number)[]; message?: string }[] } } })?.response?.data;
      let message = data?.message ?? "Failed to post notice";
      const firstIssue = data?.issues?.[0];
      if (firstIssue?.path?.length && firstIssue.message) {
        message = `${message}: ${firstIssue.path.join(".")} — ${firstIssue.message}`;
      }
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noticeId: string) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;

    try {
      await api.delete(`/notices/${noticeId}`);
      showToast("Notice deleted successfully", "success");
      loadNotices();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to delete notice";
      showToast(message, "error");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <AppShell title="Notice Board">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Post important announcements and notices</p>
          <button
            onClick={handleOpenForm}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Post Notice
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">Post New Notice</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="e.g., Water Supply Maintenance on Sunday"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={5}
                  placeholder="Describe the notice in detail..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attachment URL (optional)
                </label>
                <input
                  type="url"
                  value={formData.fileUrl}
                  onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="https://example.com/document.pdf"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category (resident app filters)
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-white"
                >
                  {NOTICE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Maps to the chips on the resident app Notices tab (General, Maintenance, Events,
                  etc.).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-white"
                >
                  {NOTICE_PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="notice-urgent"
                  type="checkbox"
                  checked={formData.isUrgent}
                  onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="notice-urgent" className="text-sm text-gray-700">
                  Mark as urgent (highlighted on resident app)
                </label>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Who should see this notice?
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  Leave nobody checked to send to <strong>all residents</strong>. Select one or more
                  accounts for a <strong>private</strong> notice (e.g. maintenance update for one unit).
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 rounded bg-white p-2">
                  {residentOptions.length === 0 ? (
                    <p className="text-sm text-gray-500">Loading residents…</p>
                  ) : (
                    residentOptions.map((r) => {
                      const checked = formData.recipientUserIds.includes(r.id);
                      const unit =
                        r.villa?.villaNumber != null
                          ? ` · Unit ${r.villa.villaNumber}${r.villa.block ? ` (${r.villa.block})` : ""}`
                          : "";
                      return (
                        <label
                          key={r.id}
                          className="flex items-start gap-2 text-sm cursor-pointer py-1"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setFormData((prev) => {
                                const set = new Set(prev.recipientUserIds);
                                if (set.has(r.id)) set.delete(r.id);
                                else set.add(r.id);
                                return { ...prev, recipientUserIds: [...set] };
                              });
                            }}
                            className="mt-0.5 rounded border-gray-300"
                          />
                          <span>
                            <span className="font-medium text-gray-900">{r.name}</span>
                            <span className="text-gray-600">{unit}</span>
                            <span className="text-gray-400 text-xs block">{r.email}</span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
                {formData.recipientUserIds.length > 0 ? (
                  <p className="text-xs text-blue-700 mt-2 font-medium">
                    Only {formData.recipientUserIds.length} selected resident(s) will see this notice
                    and get a push notification.
                  </p>
                ) : (
                  <p className="text-xs text-gray-600 mt-2">All active residents will be notified.</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submitting ? "Posting..." : "Post Notice"}
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

        <div className="space-y-4">
          {loading ? (
            <p className="text-gray-500">Loading notices...</p>
          ) : notices.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded p-8 text-center text-gray-500">
              No notices posted yet. Click "Post Notice" to create your first notice.
            </div>
          ) : (
            notices.map((notice) => (
              <div key={notice.id} className="bg-white border border-gray-200 rounded p-6">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <h3 className="text-lg font-semibold">{notice.title}</h3>
                    {notice.category && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase shrink-0">
                        {notice.category}
                      </span>
                    )}
                    {notice.isUrgent ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700 shrink-0">
                        Urgent
                      </span>
                    ) : null}
                    {notice.recipients && notice.recipients.length > 0 ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 shrink-0">
                        Targeted ({notice.recipients.length})
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 shrink-0">
                        All residents
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(notice.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-3">{formatDate(notice.createdAt)}</p>
                <p className="text-gray-700 whitespace-pre-wrap">{notice.content}</p>
                {notice.recipients && notice.recipients.length > 0 ? (
                  <p className="text-sm text-indigo-900 mt-2">
                    <span className="font-semibold">Recipients: </span>
                    {notice.recipients.map((r) => r.user?.name ?? r.userId).join(", ")}
                  </p>
                ) : null}
                {notice.fileUrl && (
                  <a
                    href={notice.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View Attachment →
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
