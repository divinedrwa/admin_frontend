"use client";

import { HandCoins } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { VillaTypeahead } from "@/components/VillaTypeahead";
import { useVillaFinancialHistory } from "@/hooks/useAdminShortfall";

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type HistoryRow = {
  year: number;
  month: number;
  amount: number;
  status: string;
  dueDate: string | null;
  paymentDate: string | null;
  receiptNumber: string | null;
  paymentMode: string | null;
  transactionId: string | null;
};

export default function VillaFinancialHistoryPage() {
  const [villaId, setVillaId] = useState("");
  const { data, isLoading, isFetching } = useVillaFinancialHistory(villaId || undefined);

  const villa = data?.villa as {
    villaNumber?: string;
    block?: string;
    ownerName?: string;
    monthlyMaintenance?: number;
  } | undefined;
  const history = (data?.history ?? []) as HistoryRow[];
  const stats = data?.statistics as {
    totalPaid?: number;
    avgPaymentDelay?: number;
    onTimePayments?: number;
    latePayments?: number;
  } | undefined;

  return (
    <AppShell title="Villa financial history">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Finance"
          title="Villa financial history"
          description="Select a villa to view maintenance payment history and collection statistics."
          icon={<HandCoins className="h-6 w-6" />}
        />

        <div className="card p-4 max-w-xl">
          <label className="block text-sm font-medium mb-2">Villa</label>
          <VillaTypeahead value={villaId} onChange={(id) => setVillaId(id)} />
        </div>

        {!villaId ? (
          <p className="text-fg-secondary text-sm">Choose a villa to load payment history.</p>
        ) : isLoading || isFetching ? (
          <div className="loading-state"><div className="loading-spinner w-10 h-10" /></div>
        ) : (
          <>
            {villa ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="stat-card">
                  <div className="stat-card-value">{villa.villaNumber}</div>
                  <div className="stat-card-label">Villa</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">₹{stats?.totalPaid?.toLocaleString("en-IN") ?? 0}</div>
                  <div className="stat-card-label">Total paid (24 mo)</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{stats?.onTimePayments ?? 0}</div>
                  <div className="stat-card-label">On-time payments</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{stats?.latePayments ?? 0}</div>
                  <div className="stat-card-label">Late payments</div>
                </div>
              </div>
            ) : null}

            <div className="table-wrapper overflow-x-auto">
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th className="table-th">Period</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Due</th>
                    <th className="table-th">Paid</th>
                    <th className="table-th">Mode</th>
                    <th className="table-th">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="table-td text-center text-fg-secondary py-8">
                        No maintenance history for this villa.
                      </td>
                    </tr>
                  ) : (
                    history.map((row) => (
                      <tr key={`${row.year}-${row.month}`} className="table-row">
                        <td className="table-td">{MONTH_NAMES[row.month]} {row.year}</td>
                        <td className="table-td">₹{row.amount.toLocaleString("en-IN")}</td>
                        <td className="table-td"><span className="badge badge-gray">{row.status}</span></td>
                        <td className="table-td">{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "—"}</td>
                        <td className="table-td">{row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : "—"}</td>
                        <td className="table-td">{row.paymentMode ?? "—"}</td>
                        <td className="table-td font-mono text-xs">{row.receiptNumber ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
