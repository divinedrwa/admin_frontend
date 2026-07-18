"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Scale, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { EmptyState } from "@/components/EmptyState";
import { showToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { parseApiError } from "@/utils/errorHandler";

type DisputeStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";

type PaymentDispute = {
  id: string;
  reason: string;
  residentNote: string | null;
  adminNote: string | null;
  status: DisputeStatus;
  cycleKey: string | null;
  amount: string | number | null;
  createdAt: string;
  resolvedAt: string | null;
  user?: { id: string; name: string | null; username: string | null } | null;
  villa?: { id: string; villaNumber: string | null; ownerName: string | null } | null;
  resolvedBy?: { id: string; name: string | null } | null;
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "REJECTED", label: "Rejected" },
];

function statusBadge(status: DisputeStatus) {
  switch (status) {
    case "OPEN":
      return <span className="badge badge-warning">Open</span>;
    case "IN_REVIEW":
      return <span className="badge badge-info">In review</span>;
    case "RESOLVED":
      return <span className="badge badge-success">Resolved</span>;
    case "REJECTED":
      return <span className="badge badge-danger">Rejected</span>;
    default:
      return <span className="badge">{status}</span>;
  }
}

function formatAmount(amount: string | number | null | undefined) {
  if (amount == null || amount === "") return "—";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function PaymentDisputesPage() {
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [disputes, setDisputes] = useState<PaymentDispute[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const { data } = await api.get("/payment-disputes", { params });
      setDisputes((data?.disputes ?? []) as PaymentDispute[]);
      setOpenCount(typeof data?.openCount === "number" ? data.openCount : 0);
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to load payment disputes").message, "error");
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateDispute(id: string, status: DisputeStatus) {
    setProcessingId(id);
    try {
      await api.patch(`/payment-disputes/${id}`, {
        status,
        adminNote: adminNotes[id]?.trim() || undefined,
      });
      showToast("Dispute updated", "success");
      await load();
    } catch (error: unknown) {
      showToast(parseApiError(error, "Update failed").message, "error");
    } finally {
      setProcessingId(null);
    }
  }

  const resolvedCount = disputes.filter((d) => d.status === "RESOLVED").length;
  const rejectedCount = disputes.filter((d) => d.status === "REJECTED").length;

  return (
    <AppShell title="Payment disputes">
      <div className="space-y-6 p-6">
        <AdminPageHeader
          eyebrow="Finance"
          title="Payment disputes"
          description="Review resident reports of missing or incorrect maintenance payments."
          icon={<Scale className="h-6 w-6" />}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand-warning" />
              <div>
                <div className="stat-card-label">Open / in review</div>
                <div className="stat-card-value">{openCount}</div>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-approved-fg" />
              <div>
                <div className="stat-card-label">Resolved (this page)</div>
                <div className="stat-card-value">{resolvedCount}</div>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-brand-danger" />
              <div>
                <div className="stat-card-label">Rejected (this page)</div>
                <div className="stat-card-value">{rejectedCount}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value || "all"}
              type="button"
              className={`btn btn-sm ${statusFilter === f.value ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner w-10 h-10" />
          </div>
        ) : disputes.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle className="h-8 w-8" />}
            title="No disputes"
            description={
              statusFilter
                ? "No disputes match this filter."
                : "Residents can report payment issues from the mobile app."
            }
          />
        ) : (
          <div className="space-y-4">
            {disputes.map((d) => {
              const isTerminal = d.status === "RESOLVED" || d.status === "REJECTED";
              const residentLabel =
                d.user?.name?.trim() ||
                d.user?.username?.trim() ||
                d.villa?.ownerName?.trim() ||
                "Resident";
              const villaLabel = d.villa?.villaNumber ? `Villa ${d.villa.villaNumber}` : null;

              return (
                <div key={d.id} className="card">
                  <div className="card-body space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-fg-primary">{d.reason}</div>
                        <div className="text-sm text-fg-secondary mt-1">
                          {residentLabel}
                          {villaLabel ? ` · ${villaLabel}` : ""}
                          {d.cycleKey ? ` · ${d.cycleKey}` : ""}
                          {d.amount != null ? ` · ${formatAmount(d.amount)}` : ""}
                        </div>
                        <div className="text-xs text-fg-muted mt-1">
                          Filed {new Date(d.createdAt).toLocaleString("en-IN")}
                          {d.resolvedAt
                            ? ` · Closed ${new Date(d.resolvedAt).toLocaleString("en-IN")}`
                            : ""}
                        </div>
                      </div>
                      {statusBadge(d.status)}
                    </div>

                    {d.residentNote ? (
                      <p className="text-sm text-fg-secondary bg-surface-secondary rounded-lg p-3">
                        {d.residentNote}
                      </p>
                    ) : null}

                    {d.adminNote && isTerminal ? (
                      <p className="text-sm text-fg-secondary">
                        <span className="font-medium">Admin note:</span> {d.adminNote}
                        {d.resolvedBy?.name ? ` (${d.resolvedBy.name})` : ""}
                      </p>
                    ) : null}

                    {!isTerminal ? (
                      <div className="space-y-2 pt-1">
                        <label className="block text-sm font-medium text-fg-primary">
                          Admin note (optional)
                        </label>
                        <textarea
                          className="input w-full min-h-[72px]"
                          value={adminNotes[d.id] ?? d.adminNote ?? ""}
                          onChange={(e) =>
                            setAdminNotes((prev) => ({ ...prev, [d.id]: e.target.value }))
                          }
                          placeholder="Resolution details for the resident…"
                        />
                        <div className="flex flex-wrap gap-2">
                          {d.status === "OPEN" ? (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={processingId === d.id}
                              onClick={() => void updateDispute(d.id, "IN_REVIEW")}
                            >
                              Mark in review
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={processingId === d.id}
                            onClick={() => void updateDispute(d.id, "RESOLVED")}
                          >
                            Resolve
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={processingId === d.id}
                            onClick={() => void updateDispute(d.id, "REJECTED")}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
