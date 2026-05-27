"use client";

import { AlertTriangle, CheckCircle2, ClipboardList } from "lucide-react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { Pagination } from "@/components/Pagination";
import { showToast } from "@/components/Toast";
import { api } from "@/lib/api";

const COMPLAINT_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

type Complaint = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  villa: {
    villaNumber: string;
    block: string;
    ownerName: string;
  };
};

export default function ComplaintsPage() {
  return (
    <Suspense fallback={<AppShell title="Complaints"><div className="loading-state"><div className="loading-spinner w-10 h-10" /></div></AppShell>}>
      <ComplaintsPageInner />
    </Suspense>
  );
}

function ComplaintsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pgMeta, setPgMeta] = useState({ total: 0, limit: 50, offset: 0 });

  const initialOffset = Number(searchParams.get("offset")) || 0;

  const loadComplaints = useCallback((offset = initialOffset, signal?: AbortSignal) => {
    setLoading(true);
    api
      .get(`/complaints?limit=50&offset=${offset}`, { signal })
      .then((response) => {
        setComplaints(response.data.complaints ?? []);
        setOpenCount(response.data.openCount ?? 0);
        setPgMeta({
          total: response.data.total ?? 0,
          limit: response.data.limit ?? 50,
          offset: response.data.offset ?? 0,
        });
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === "CanceledError") return;
        showToast("Failed to load complaints", "error");
      })
      .finally(() => setLoading(false));
  }, [initialOffset]);

  useEffect(() => {
    const controller = new AbortController();
    loadComplaints(initialOffset, controller.signal);
    return () => controller.abort();
  }, [loadComplaints, initialOffset]);

  const handlePageChange = (newOffset: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newOffset > 0) params.set("offset", String(newOffset));
    else params.delete("offset");
    router.replace(`?${params.toString()}`, { scroll: false });
    // Don't call loadComplaints here — the URL change triggers useEffect
  };

  async function updateStatus(id: string, newStatus: string) {
    const prev = complaints.find((c) => c.id === id)?.status;
    // Optimistic update
    setComplaints((list) => list.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
    setUpdatingId(id);
    try {
      await api.patch(`/complaints/${id}/status`, { status: newStatus });
      showToast("Status updated", "success");
      // Reload at the current page offset (from pgMeta, not the closure)
      loadComplaints(pgMeta.offset);
    } catch {
      // Rollback
      if (prev) setComplaints((list) => list.map((c) => (c.id === id ? { ...c, status: prev } : c)));
      showToast("Failed to update status", "error");
    } finally {
      setUpdatingId(null);
    }
  }

  const [openCount, setOpenCount] = useState(0);

  return (
    <AppShell title="Complaints">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Resident support"
          title="Complaints"
          description="Track complaint intake, monitor open service issues, and keep resolution visibility higher for the operations team."
          icon={<ClipboardList className="h-6 w-6" />}
        />

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="stat-card-value">{pgMeta.total}</div>
                <div className="stat-card-label">Total complaints</div>
              </div>
              <ClipboardList className="h-8 w-8 text-brand-primary" />
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="stat-card-value text-pending-fg">{openCount}</div>
                <div className="stat-card-label">Open / In progress</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-pending-fg" />
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="stat-card-value text-approved-fg">{pgMeta.total - openCount}</div>
                <div className="stat-card-label">Resolved</div>
              </div>
              <CheckCircle2 className="h-8 w-8 text-approved-fg" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner w-10 h-10"></div>
              <p className="loading-state-text">Loading complaints...</p>
            </div>
          ) : complaints.length === 0 && pgMeta.total === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📋</span>
              <p className="empty-state-title">No complaints yet</p>
              <p className="empty-state-text">When residents submit complaints, they will appear here for review and resolution.</p>
            </div>
          ) : (<>
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th scope="col" className="table-th">Villa</th>
                  <th scope="col" className="table-th">Title</th>
                  <th scope="col" className="table-th">Description</th>
                  <th scope="col" className="table-th">Status</th>
                  <th scope="col" className="table-th">Created</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((complaint) => (
                  <tr key={complaint.id} className="table-row">
                    <td className="table-td">
                      <div className="font-medium">{complaint.villa.villaNumber}</div>
                      {complaint.villa.block && (
                        <div className="text-xs text-fg-secondary">Block {complaint.villa.block}</div>
                      )}
                    </td>
                    <td className="table-td font-medium">{complaint.title}</td>
                    <td className="table-td text-fg-secondary max-w-xs truncate">{complaint.description}</td>
                    <td className="table-td">
                      <select
                        className={`text-xs font-semibold rounded-full px-2 py-1 border cursor-pointer ${
                          complaint.status === "RESOLVED" || complaint.status === "CLOSED"
                            ? "bg-approved-bg text-approved-fg border-approved-fg/20"
                            : complaint.status === "IN_PROGRESS"
                            ? "bg-brand-bg text-brand-primary border-brand-primary/20"
                            : "bg-pending-bg text-pending-fg border-pending-fg/20"
                        }`}
                        value={complaint.status}
                        disabled={updatingId === complaint.id}
                        onChange={(e) => void updateStatus(complaint.id, e.target.value)}
                        aria-label={`Status for ${complaint.title}`}
                      >
                        {COMPLAINT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="table-td text-fg-secondary">
                      {new Date(complaint.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              total={pgMeta.total}
              limit={pgMeta.limit}
              offset={pgMeta.offset}
              onPageChange={handlePageChange}
            />
          </>)}
        </div>
      </div>
    </AppShell>
  );
}
