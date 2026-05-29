"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowDownRight,
  Wallet,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { parseApiError } from "@/utils/errorHandler";

interface MonthPL {
  month: number;
  maintenance: number;
  additionalFunds: number;
  totalIncome: number;
  expenses: number;
  expenseCategories: Record<string, number>;
  net: number;
}

interface PLReport {
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netSurplus: number;
  currentFundBalance: number;
  months: MonthPL[];
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmt(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function AdminShortfallPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [report, setReport] = useState<PLReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await api.get(`/maintenance-management/profit-loss/${year}`, { signal });
      setReport(res.data);
    } catch (error: unknown) {
      if ((error as { name?: string }).name === "CanceledError") return;
      showToast(parseApiError(error, "Failed to load report").message, "error");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchReport(controller.signal);
    return () => controller.abort();
  }, [fetchReport]);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Filter deficit months
  const deficitMonths = report?.months.filter((m) => m.net < 0) ?? [];
  const totalShortfall = deficitMonths.reduce((s, m) => s + Math.abs(m.net), 0);
  const avgShortfall = deficitMonths.length > 0 ? totalShortfall / deficitMonths.length : 0;

  if (loading) {
    return (
      <AppShell title="Admin Shortfall">
        <div className="loading-state">
          <div className="loading-spinner w-10 h-10" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin Shortfall">
      <div className="space-y-6 p-6">
        <AdminPageHeader
          eyebrow="Management"
          title="Admin Shortfall"
          description="Month-wise tracker of expenses exceeding collections — the difference paid by admin."
          icon={<Wallet className="h-6 w-6" />}
        />

        {/* Year selector */}
        <div className="filter-bar">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-fg-secondary">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="input w-40"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {deficitMonths.length === 0 ? (
          <div className="empty-state p-12">
            <p className="empty-state-title">No shortfall in {year}</p>
            <p className="text-sm text-fg-tertiary mt-1">
              Collections covered all expenses this year. No admin contribution was needed.
            </p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card p-5 border-l-4 border-l-orange-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-fg-secondary">Total Shortfall</span>
                  <ArrowDownRight className="h-5 w-5 text-orange-500" />
                </div>
                <p className="text-2xl font-bold text-fg-primary">{fmt(totalShortfall)}</p>
                <p className="text-xs text-fg-tertiary mt-1">Paid by admin in {year}</p>
              </div>
              <div className="card p-5 border-l-4 border-l-brand-danger">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-fg-secondary">Months with Deficit</span>
                  <CalendarDays className="h-5 w-5 text-brand-danger" />
                </div>
                <p className="text-2xl font-bold text-fg-primary">{deficitMonths.length}</p>
                <p className="text-xs text-fg-tertiary mt-1">Out of {report?.months.length ?? 12} months</p>
              </div>
              <div className="card p-5 border-l-4 border-l-amber-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-fg-secondary">Avg Monthly Shortfall</span>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <p className="text-2xl font-bold text-fg-primary">{fmt(avgShortfall)}</p>
                <p className="text-xs text-fg-tertiary mt-1">Per deficit month</p>
              </div>
            </div>

            {/* Shortfall table */}
            <div className="table-wrapper">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-head">
                    <tr>
                      <th scope="col" className="table-th">Month</th>
                      <th scope="col" className="table-th text-right">Income</th>
                      <th scope="col" className="table-th text-right">Expenses</th>
                      <th scope="col" className="table-th text-right">Shortfall</th>
                      <th scope="col" className="table-th">Top Expense Categories</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y">
                    {deficitMonths.map((m) => {
                      const sorted = Object.entries(m.expenseCategories)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 3);
                      return (
                        <tr key={m.month} className="table-row">
                          <td className="table-td font-medium">
                            {MONTH_FULL[m.month - 1]} {year}
                          </td>
                          <td className="table-td text-right text-brand-success font-medium">
                            {fmt(m.totalIncome)}
                          </td>
                          <td className="table-td text-right text-brand-danger font-medium">
                            {fmt(m.expenses)}
                          </td>
                          <td className="table-td text-right font-semibold text-orange-600">
                            {fmt(Math.abs(m.net))}
                          </td>
                          <td className="table-td">
                            <div className="flex flex-wrap gap-1">
                              {sorted.map(([cat, amt]) => (
                                <span
                                  key={cat}
                                  className="inline-flex items-center rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-fg-secondary"
                                >
                                  {cat}: {fmt(amt)}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total row */}
                    <tr className="table-row font-bold bg-surface-elevated">
                      <td className="table-td">Total</td>
                      <td className="table-td text-right text-brand-success">
                        {fmt(deficitMonths.reduce((s, m) => s + m.totalIncome, 0))}
                      </td>
                      <td className="table-td text-right text-brand-danger">
                        {fmt(deficitMonths.reduce((s, m) => s + m.expenses, 0))}
                      </td>
                      <td className="table-td text-right text-orange-600">
                        {fmt(totalShortfall)}
                      </td>
                      <td className="table-td" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
