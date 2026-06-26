"use client";

import { useState } from "react";
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { parseApiError } from "@/utils/errorHandler";
import {
  useReconciliationAlerts,
  useReconciliationSummary,
} from "@/hooks/useReconciliation";
import { useQueryClient } from "@tanstack/react-query";

interface ReconciliationAlert {
  id: string;
  severity: "CRITICAL" | "WARNING";
  difference: number;
  detectedAt: string;
  resolvedAt: string | null;
  notes: string | null;
  resolvedBy: string | null;
  cycle?: { month: number; year: number } | null;
}

interface ReconciliationSummary {
  totalDifference: number;
  criticalCount: number;
  warningCount: number;
  healthStatus: "CRITICAL" | "WARNING" | "HEALTHY";
  recentPaymentsCount: number;
  totalCycles: number;
  activeCycles: number;
}

export default function ReconciliationPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("unresolved");
  const { data: alertsData, isLoading: loading } = useReconciliationAlerts(statusFilter);
  const { data: summary } = useReconciliationSummary();
  const alerts = (alertsData?.alerts ?? []) as ReconciliationAlert[];
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["reconciliation"] });
  };

  async function handleResolve(id: string) {
    if (!resolveNotes.trim()) {
      showToast("Please enter resolution notes", "error");
      return;
    }
    setProcessingId(id);
    try {
      await api.post(`/reconciliation/alerts/${id}/resolve`, {
        notes: resolveNotes.trim(),
      });
      showToast("Alert resolved", "success");
      setResolvingId(null);
      setResolveNotes("");
      refresh();
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to resolve").message, "error");
    } finally {
      setProcessingId(null);
    }
  }

  const healthBadge = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return <span className="badge badge-success">Healthy</span>;
      case "WARNING":
        return <span className="badge badge-warning">Warning</span>;
      case "CRITICAL":
        return <span className="badge badge-danger">Critical</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  if (loading) {
    return (
      <AppShell title="Reconciliation">
        <div className="loading-state">
          <div className="loading-spinner w-10 h-10" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Financial Reconciliation">
      <div className="space-y-6 p-6">
        <AdminPageHeader
          eyebrow="Finance"
          title="Financial Reconciliation"
          description="Monitor ledger mismatches and resolve financial discrepancies."
          icon={<Scale className="h-6 w-6" />}
        />

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="stat-card-label">Health Status</div>
              <div className="mt-1">{healthBadge(summary.healthStatus)}</div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-brand-danger" />
                <div>
                  <div className="stat-card-label">Critical Alerts</div>
                  <div className="stat-card-value">{summary.criticalCount}</div>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-brand-warning" />
                <div>
                  <div className="stat-card-label">Total Difference</div>
                  <div className="stat-card-value">
                    {Math.abs(summary.totalDifference).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-brand-primary" />
                <div>
                  <div className="stat-card-label">Recent Payments (7d)</div>
                  <div className="stat-card-value">{summary.recentPaymentsCount}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="filter-bar">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-fg-secondary">Show:</label>
            {["unresolved", "resolved"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`btn ${statusFilter === s ? "btn-primary" : "btn-ghost"} text-sm`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts Table */}
        <div className="table-wrapper">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th scope="col" className="table-th">Severity</th>
                  <th scope="col" className="table-th">Period</th>
                  <th scope="col" className="table-th">Difference</th>
                  <th scope="col" className="table-th">Detected</th>
                  <th scope="col" className="table-th">Notes</th>
                  {statusFilter === "unresolved" && (
                    <th scope="col" className="table-th text-right">Actions</th>
                  )}
                  {statusFilter === "resolved" && (
                    <th scope="col" className="table-th">Resolved</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-surface divide-y">
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="empty-state">
                        <CheckCircle2 className="h-10 w-10 text-approved-fg mx-auto mb-2" />
                        <p className="empty-state-title">
                          {statusFilter === "unresolved"
                            ? "No unresolved alerts"
                            : "No resolved alerts found"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  alerts.map((alert) => (
                    <tr key={alert.id} className="table-row">
                      <td className="table-td">
                        <span
                          className={`badge ${
                            alert.severity === "CRITICAL" ? "badge-danger" : "badge-warning"
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </td>
                      <td className="table-td">
                        {alert.cycle
                          ? `${["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][alert.cycle.month]} ${alert.cycle.year}`
                          : "—"}
                      </td>
                      <td className="table-td font-mono">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="h-3.5 w-3.5" />
                          {Math.abs(alert.difference).toLocaleString("en-IN")}
                        </div>
                      </td>
                      <td className="table-td text-sm text-fg-secondary">
                        {new Date(alert.detectedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="table-td text-sm text-fg-secondary max-w-48 truncate">
                        {alert.notes || "—"}
                      </td>
                      {statusFilter === "unresolved" && (
                        <td className="table-td text-right">
                          {resolvingId === alert.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={resolveNotes}
                                onChange={(e) => setResolveNotes(e.target.value)}
                                placeholder="Resolution notes..."
                                className="input text-sm w-48"
                              />
                              <button
                                onClick={() => handleResolve(alert.id)}
                                disabled={processingId === alert.id}
                                className="btn btn-success text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setResolvingId(null); setResolveNotes(""); }}
                                className="btn btn-ghost text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setResolvingId(alert.id)}
                              className="btn btn-primary text-sm"
                            >
                              Resolve
                            </button>
                          )}
                        </td>
                      )}
                      {statusFilter === "resolved" && (
                        <td className="table-td text-sm text-fg-secondary">
                          {alert.resolvedAt
                            ? new Date(alert.resolvedAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })
                            : "—"}
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
