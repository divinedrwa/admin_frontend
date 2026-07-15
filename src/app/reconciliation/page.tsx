"use client";

import { useState } from "react";
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  IndianRupee,
  TrendingUp,
  RefreshCw,
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
  villaSum: number;
  societyCash: number;
  creditApplied: number;
  unexplainedDifference: number | null;
  difference: number;
  detectedAt: string;
  resolvedAt: string | null;
  notes: string | null;
  resolvedBy: string | null;
  cycle?: {
    title?: string;
    periodMonth?: number;
    periodYear?: number;
    month?: number;
    year?: number;
  } | null;
}

/** Supports nested v2 summary and legacy flat fields from deployed admin web. */
function normalizeSummary(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const fh = r.financialHealth as Record<string, unknown> | undefined;
  const statsTotal = (r.stats as Record<string, unknown> | undefined)?.totalDifference;
  return {
    healthStatus: String(fh?.status ?? r.healthStatus ?? "HEALTHY"),
    criticalCount: Number(fh?.criticalAlerts ?? r.criticalCount ?? 0),
    unresolvedAlerts: Number(fh?.unresolvedAlerts ?? 0),
    totalDifference: Number(r.totalDifference ?? statsTotal ?? 0),
    recentPaymentsCount: Number(fh?.recentPayments7Days ?? r.recentPaymentsCount ?? 0),
  };
}

function normalizeAlert(raw: Record<string, unknown>): ReconciliationAlert {
  return {
    id: String(raw.id),
    severity: raw.severity as ReconciliationAlert["severity"],
    villaSum: Number(raw.villaSum ?? 0),
    societyCash: Number(raw.societyCash ?? 0),
    creditApplied: Number(raw.creditApplied ?? 0),
    unexplainedDifference:
      raw.unexplainedDifference != null ? Number(raw.unexplainedDifference) : null,
    difference: Number(raw.difference ?? 0),
    detectedAt: String(raw.detectedAt),
    resolvedAt: raw.resolvedAt ? String(raw.resolvedAt) : null,
    notes: raw.notes != null ? String(raw.notes) : null,
    resolvedBy: raw.resolvedBy != null ? String(raw.resolvedBy) : null,
    cycle: raw.cycle as ReconciliationAlert["cycle"],
  };
}

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ReconciliationPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("unresolved");
  const { data: alertsData, isLoading: loading } = useReconciliationAlerts(statusFilter);
  const { data: summaryRaw } = useReconciliationSummary();
  const summary = normalizeSummary(summaryRaw);
  const alerts = ((alertsData?.alerts ?? []) as Record<string, unknown>[]).map(normalizeAlert);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [runningReconcile, setRunningReconcile] = useState(false);
  const [notesModal, setNotesModal] = useState<{
    period: string;
    notes: string;
    severity: string;
    difference: number;
  } | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["reconciliation"] });
  };

  async function handleRunReconcile() {
    setRunningReconcile(true);
    try {
      const res = await api.post("/reconciliation/run");
      const created = res.data?.result?.alertsCreated ?? 0;
      const resolved = res.data?.result?.alertsResolved ?? 0;
      showToast(
        `Reconciliation complete — ${resolved} auto-resolved, ${created} new alert(s)`,
        "success",
      );
      refresh();
    } catch (error: unknown) {
      showToast(parseApiError(error, "Reconciliation run failed").message, "error");
    } finally {
      setRunningReconcile(false);
    }
  }

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
        return <span className="badge">{status || "—"}</span>;
    }
  };

  const formatMoney = (n: number) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return "0";
    return v.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const cycleLabel = (alert: ReconciliationAlert) => {
    const c = alert.cycle;
    if (!c) return "—";
    if (c.title?.trim()) return c.title;
    const month = c.periodMonth ?? c.month;
    const year = c.periodYear ?? c.year;
    if (month != null && year != null && month >= 1 && month <= 12) {
      return `${MONTHS[month]} ${year}`;
    }
    return "—";
  };

  const listTotalDifference =
    statusFilter === "unresolved" && summary
      ? summary.totalDifference
      : alerts.reduce((s, a) => s + Math.abs(a.difference), 0);

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
          description="Compares villa settled totals with cash received. Bank overpayments and advance credit auto-resolve with explanatory notes — no fund changes."
          icon={<Scale className="h-6 w-6" />}
          actions={
            <button
              type="button"
              onClick={() => void handleRunReconcile()}
              disabled={runningReconcile}
              className="btn btn-primary text-sm inline-flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${runningReconcile ? "animate-spin" : ""}`} />
              {runningReconcile ? "Running…" : "Run reconciliation"}
            </button>
          }
        />

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
                  <div className="stat-card-label">
                    {statusFilter === "unresolved" ? "Open difference" : "Listed difference"}
                  </div>
                  <div className="stat-card-value">₹{formatMoney(listTotalDifference)}</div>
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

        <div className="table-wrapper">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th scope="col" className="table-th">Severity</th>
                  <th scope="col" className="table-th">Period</th>
                  <th scope="col" className="table-th">Settled</th>
                  <th scope="col" className="table-th">Cash</th>
                  <th scope="col" className="table-th">Variance</th>
                  <th scope="col" className="table-th">Detected</th>
                  <th scope="col" className="table-th min-w-[14rem]">Resolution notes</th>
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
                    <td colSpan={statusFilter === "resolved" ? 8 : 8} className="px-6 py-12 text-center">
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
                      <td className="table-td font-medium">{cycleLabel(alert)}</td>
                      <td className="table-td font-mono">₹{formatMoney(alert.villaSum)}</td>
                      <td className="table-td font-mono">₹{formatMoney(alert.societyCash)}</td>
                      <td className="table-td font-mono">₹{formatMoney(alert.difference)}</td>
                      <td className="table-td text-sm text-fg-secondary whitespace-nowrap">
                        {new Date(alert.detectedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="table-td text-sm">
                        {alert.notes ? (
                          <button
                            type="button"
                            onClick={() =>
                              setNotesModal({
                                period: cycleLabel(alert),
                                notes: alert.notes!,
                                severity: alert.severity,
                                difference: alert.difference,
                              })
                            }
                            className="text-left w-full group"
                          >
                            <p className="text-fg line-clamp-3 whitespace-pre-wrap break-words group-hover:text-brand-primary">
                              {alert.notes}
                            </p>
                            <span className="text-brand-primary text-xs font-medium mt-1 inline-block">
                              View full explanation →
                            </span>
                          </button>
                        ) : (
                          <span className="text-fg-secondary">—</span>
                        )}
                      </td>
                      {statusFilter === "unresolved" && (
                        <td className="table-td text-right">
                          {resolvingId === alert.id ? (
                            <div className="flex items-center gap-2 justify-end">
                              <input
                                type="text"
                                value={resolveNotes}
                                onChange={(e) => setResolveNotes(e.target.value)}
                                placeholder="Why is this acceptable?"
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
                        <td className="table-td text-sm text-fg-secondary whitespace-nowrap">
                          {alert.resolvedAt
                            ? new Date(alert.resolvedAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
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

        {notesModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reconciliation-notes-title"
            onClick={() => setNotesModal(null)}
          >
            <div
              className="bg-surface rounded-lg shadow-lg max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h2 id="reconciliation-notes-title" className="text-lg font-semibold text-fg">
                  Why this alert was resolved
                </h2>
                <p className="text-sm text-fg-secondary mt-1">{notesModal.period}</p>
                <p className="text-xs text-fg-secondary mt-1">
                  {notesModal.severity} · variance ₹{formatMoney(notesModal.difference)}
                </p>
              </div>
              <div className="rounded-md bg-muted/40 border border-border p-4">
                <p className="text-sm text-fg whitespace-pre-wrap break-words leading-relaxed">
                  {notesModal.notes}
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setNotesModal(null)}
                  className="btn btn-primary text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
