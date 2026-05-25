"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
} from "lucide-react";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { parseApiError } from "@/utils/errorHandler";

interface UpiSubmission {
  id: string;
  amount: number;
  month: number;
  year: number;
  upiTransactionRef: string | null;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  remark: string | null;
  rejectionReason: string | null;
  createdAt: string;
  user?: { name: string; email: string } | null;
  villa?: { villaNumber: string | null; block: string | null } | null;
}

interface UpiStats {
  pending: number;
  verified: number;
  rejected: number;
}

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function UpiPaymentsPage() {
  const [submissions, setSubmissions] = useState<UpiSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UpiStats>({ pending: 0, verified: 0, rejected: 0 });
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      const res = await api.get(`/upi-payments/pending?${params.toString()}`);
      setSubmissions(res.data?.submissions ?? res.data ?? []);
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to load submissions").message, "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/upi-payments/stats");
      setStats(res.data ?? { pending: 0, verified: 0, rejected: 0 });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void fetchSubmissions();
    void fetchStats();
  }, [fetchSubmissions, fetchStats]);

  async function handleVerify(id: string) {
    setProcessingId(id);
    try {
      await api.post(`/upi-payments/${id}/verify`);
      showToast("Payment verified and recorded", "success");
      await Promise.all([fetchSubmissions(), fetchStats()]);
    } catch (error: unknown) {
      showToast(parseApiError(error, "Verification failed").message, "error");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id: string) {
    if (!rejectionReason.trim()) {
      showToast("Please enter a rejection reason", "error");
      return;
    }
    setProcessingId(id);
    try {
      await api.post(`/upi-payments/${id}/reject`, {
        rejectionReason: rejectionReason.trim(),
      });
      showToast("Payment rejected", "success");
      setRejectingId(null);
      setRejectionReason("");
      await Promise.all([fetchSubmissions(), fetchStats()]);
    } catch (error: unknown) {
      showToast(parseApiError(error, "Rejection failed").message, "error");
    } finally {
      setProcessingId(null);
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="badge badge-warning">Pending</span>;
      case "VERIFIED":
        return <span className="badge badge-success">Verified</span>;
      case "REJECTED":
        return <span className="badge badge-danger">Rejected</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  if (loading) {
    return (
      <AppShell title="UPI Payments">
        <div className="loading-state">
          <div className="loading-spinner w-10 h-10" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="UPI Payments">
      <div className="space-y-6 p-6">
        <AdminPageHeader
          eyebrow="Finance"
          title="UPI Payment Verification"
          description="Review and verify resident UPI payment submissions."
          icon={<CreditCard className="h-6 w-6" />}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand-warning" />
              <div>
                <div className="stat-card-label">Pending</div>
                <div className="stat-card-value">{stats.pending}</div>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-brand-success" />
              <div>
                <div className="stat-card-label">Verified</div>
                <div className="stat-card-value">{stats.verified}</div>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-brand-danger" />
              <div>
                <div className="stat-card-label">Rejected</div>
                <div className="stat-card-value">{stats.rejected}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="filter-bar">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-fg-secondary">Status:</label>
            {["PENDING", "VERIFIED", "REJECTED"].map((s) => (
              <button
                key={s}
                disabled={loading}
                onClick={() => { setStatusFilter(s); setLoading(true); }}
                className={`btn ${statusFilter === s ? "btn-primary" : "btn-ghost"} text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th scope="col" className="table-th">Resident</th>
                  <th scope="col" className="table-th">Villa</th>
                  <th scope="col" className="table-th">Period</th>
                  <th scope="col" className="table-th">Amount</th>
                  <th scope="col" className="table-th">UPI Ref</th>
                  <th scope="col" className="table-th">Status</th>
                  <th scope="col" className="table-th">Date</th>
                  {statusFilter === "PENDING" && (
                    <th scope="col" className="table-th text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-surface divide-y">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={statusFilter === "PENDING" ? 8 : 7} className="px-6 py-12 text-center">
                      <div className="empty-state">
                        <p className="empty-state-title">No submissions found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="table-row">
                      <td className="table-td font-medium">{sub.user?.name ?? "—"}</td>
                      <td className="table-td">
                        {sub.villa
                          ? `${sub.villa.block ? sub.villa.block + "-" : ""}${sub.villa.villaNumber ?? ""}`
                          : "—"}
                      </td>
                      <td className="table-td">{MONTH_NAMES[sub.month]} {sub.year}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="h-3.5 w-3.5" />
                          {sub.amount.toLocaleString("en-IN")}
                        </div>
                      </td>
                      <td className="table-td text-sm font-mono">
                        {sub.upiTransactionRef || "—"}
                      </td>
                      <td className="table-td">{statusBadge(sub.status)}</td>
                      <td className="table-td text-sm text-fg-secondary">
                        {new Date(sub.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      {statusFilter === "PENDING" && (
                        <td className="table-td text-right">
                          {rejectingId === sub.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Reason..."
                                className="input text-sm w-40"
                              />
                              <button
                                onClick={() => handleReject(sub.id)}
                                disabled={processingId === sub.id}
                                className="btn btn-danger text-sm"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => { setRejectingId(null); setRejectionReason(""); }}
                                className="btn btn-ghost text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleVerify(sub.id)}
                                disabled={processingId === sub.id}
                                className="btn btn-success text-sm flex items-center gap-1"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Verify
                              </button>
                              <button
                                onClick={() => setRejectingId(sub.id)}
                                className="btn btn-danger text-sm flex items-center gap-1"
                              >
                                <XCircle className="h-4 w-4" />
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      )}
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
