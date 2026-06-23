"use client";

import { Pagination } from "@/components/Pagination";
import { Download } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import type { BillingCycleRow, ResidentRow, ResidentTotals } from "./types";
import { fmtInr, paymentDeltaStyles, statusBadgeStyles } from "./types";

export interface ResidentsTabProps {
  residentTotals: ResidentTotals;
  filterMonth: string;
  setFilterMonth: React.Dispatch<React.SetStateAction<string>>;
  filterStatus: string;
  setFilterStatus: React.Dispatch<React.SetStateAction<string>>;
  sortBy: string;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
  cycles: BillingCycleRow[];
  residentsLoading: boolean;
  residentRows: ResidentRow[];
  residentPgMeta: { total: number; limit: number; offset: number };
  onResidentPageChange: (offset: number) => void;
}

export function ResidentsTab({
  residentTotals,
  filterMonth,
  setFilterMonth,
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
  cycles,
  residentsLoading,
  residentRows,
  residentPgMeta,
  onResidentPageChange,
}: ResidentsTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="stat-card-label">Total expected</div>
          <div className="stat-card-value text-base text-fg-primary">{fmtInr(residentTotals.totalExpected)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total collected</div>
          <div className="stat-card-value text-base text-approved-fg">{fmtInr(residentTotals.totalCollected)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total shortfall</div>
          <div className="stat-card-value text-base text-denied-fg">{fmtInr(residentTotals.totalShortfall)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total advance credit</div>
          <div className="stat-card-value text-base text-approved-fg">{fmtInr(residentTotals.totalAdvanceCredit)}</div>
        </div>
      </div>
      <div className="flex gap-3 flex-wrap">
        <select
          className="input border rounded-lg px-3 py-2 text-sm bg-surface"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
        >
          <option value="">All months</option>
          {cycles.map((c) => (
            <option key={c.cycleKey} value={c.cycleKey}>
              {c.cycleKey}
            </option>
          ))}
        </select>
        <select
          className="input border rounded-lg px-3 py-2 text-sm bg-surface"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="PAID">Paid</option>
          <option value="UNPAID">Unpaid</option>
          <option value="CREDIT">Credit</option>
          <option value="DUE">Due</option>
          <option value="SETTLED">Settled</option>
        </select>
        <select
          className="input border rounded-lg px-3 py-2 text-sm bg-surface"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="">Default sort</option>
          <option value="highest_due">Highest due first</option>
          <option value="highest_credit">Highest credit first</option>
        </select>
      </div>
      <div className="table-wrapper relative">
        {residentsLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/60">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand border-t-transparent" />
          </div>
        )}
        <table className="table">
          <thead className="table-head">
            <tr>
              <th scope="col" className="table-th">Resident</th>
              <th scope="col" className="table-th">Unit</th>
              <th scope="col" className="table-th">Cycle</th>
              <th scope="col" className="table-th">Pay status</th>
              <th scope="col" className="table-th">Expected</th>
              <th scope="col" className="table-th">Cash paid</th>
              <th scope="col" className="table-th">Effective paid</th>
              <th scope="col" className="table-th">Delta</th>
              <th scope="col" className="table-th">Badge</th>
              <th scope="col" className="table-th w-10"></th>
            </tr>
          </thead>
          <tbody>
            {residentRows.map((r) => {
              const delta = Number(r.deltaAmount ?? 0);
              const status = r.statusBadge ?? "";
              return (
              <tr key={`${r.userId ?? ""}-${r.cycleKey ?? ""}`} className="table-row">
                <td className="table-td">{r.name ?? ""}</td>
                <td className="table-td">{r.flat ?? ""}</td>
                <td className="table-td">{r.cycleKey ?? ""}</td>
                <td className="table-td">{r.paymentStatus ?? ""}</td>
                <td className="table-td">{fmtInr(Number(r.expectedAmount ?? 0))}</td>
                <td className="table-td">{fmtInr(Number(r.cashPaidAmount ?? 0))}</td>
                <td className="table-td">{fmtInr(Number(r.effectivePaidAmount ?? r.paidAmount ?? 0))}</td>
                <td className={`table-td ${paymentDeltaStyles(delta)}`}>{fmtInr(delta)}</td>
                <td className="table-td">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${statusBadgeStyles(status)}`}>
                    {status || "—"}
                  </span>
                </td>
                <td className="table-td">
                  {r.paymentId && r.paymentStatus === "SUCCESS" && (
                    <DownloadInvoiceButton paymentId={r.paymentId} flat={r.flat} cycleKey={r.cycleKey} />
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {residentPgMeta.total > residentPgMeta.limit && (
        <Pagination
          total={residentPgMeta.total}
          limit={residentPgMeta.limit}
          offset={residentPgMeta.offset}
          onPageChange={onResidentPageChange}
        />
      )}
    </div>
  );
}

function DownloadInvoiceButton({ paymentId, flat, cycleKey }: { paymentId: string; flat?: string; cycleKey?: string }) {
  const [loading, setLoading] = useState(false);
  const download = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.get(`/v1/payments/${paymentId}/invoice.pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${flat ?? "unit"}-${cycleKey ?? "cycle"}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // silently fail — user can retry
    } finally {
      setLoading(false);
    }
  };
  return (
    <button onClick={download} disabled={loading} className="p-1 rounded hover:bg-surface-elevated transition-colors" title="Download receipt">
      <Download className={`w-4 h-4 ${loading ? "animate-pulse text-fg-muted" : "text-fg-secondary hover:text-fg-primary"}`} />
    </button>
  );
}
