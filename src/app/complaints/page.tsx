"use client";

import { AlertTriangle, CheckCircle2, ClipboardList } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { showToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { captureError } from "@/lib/captureError";
import { parseApiError } from "@/utils/errorHandler";
import { Complaint } from "@/types/complaint";
import { useComplaints } from "@/hooks/useComplaints";

const COMPLAINT_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

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
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const initialOffset = Number(searchParams.get("offset")) || 0;

  const queryParams = useMemo(() => ({ limit: 50, offset: initialOffset }), [initialOffset]);
  const { data, isLoading: loading } = useComplaints(queryParams);
  const complaints = data?.complaints ?? [];
  const openCount = data?.openCount ?? 0;
  const pgMeta = {
    total: data?.total ?? 0,
    limit: data?.limit ?? 50,
    offset: data?.offset ?? 0,
  };

  const handlePageChange = (newOffset: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newOffset > 0) params.set("offset", String(newOffset));
    else params.delete("offset");
    router.replace(`?${params.toString()}`, { scroll: false });
    // Don't manually refetch — the URL change updates initialOffset which updates queryParams and triggers React Query
  };

  async function updateStatus(id: string, newStatus: string) {
    setUpdatingId(id);
    try {
      await api.patch(`/complaints/${id}/status`, { status: newStatus });
      showToast("Status updated", "success");
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
    } catch (err: unknown) {
      captureError(err, { source: "complaints.updateStatus" });
      showToast(parseApiError(err, "Failed to update status").message, "error");
    } finally {
      setUpdatingId(null);
    }
  }

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
            <EmptyState
              icon={<ClipboardList className="h-12 w-12" />}
              title="No complaints yet"
              description="When residents submit complaints, they will appear here for review and resolution."
            />
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
