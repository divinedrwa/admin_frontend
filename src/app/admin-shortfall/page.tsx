"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  CalendarDays,
  AlertTriangle,
  TrendingUp,
  IndianRupee,
  PiggyBank,
  CircleAlert,
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
  outstandingDues: number;
  totalAdvanceCredit: number;
  months: MonthPL[];
}

const MONTH_SHORT = [
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
  const [view, setView] = useState<"deficit" | "all">("all");

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

  // Only months that have any activity
  const activeMonths = report?.months.filter((m) => m.maintenance > 0 || m.expenses > 0) ?? [];
  const deficitMonths = activeMonths.filter((m) => m.expenses > m.totalIncome);
  const surplusMonths = activeMonths.filter((m) => m.totalIncome >= m.expenses && (m.maintenance > 0 || m.expenses > 0));
  const displayMonths = view === "deficit" ? deficitMonths : activeMonths;

  const totalShortfall = deficitMonths.reduce((s, m) => s + (m.expenses - m.totalIncome), 0);
  const totalSurplus = surplusMonths.reduce((s, m) => s + (m.totalIncome - m.expenses), 0);

  const totalCollected = report?.months.reduce((s, m) => s + m.maintenance, 0) ?? 0;
  const totalAdditional = report?.months.reduce((s, m) => s + m.additionalFunds, 0) ?? 0;
  const totalIncome = totalCollected + totalAdditional;
  const totalExpenses = report?.months.reduce((s, m) => s + m.expenses, 0) ?? 0;
  const netPosition = totalIncome - totalExpenses;

  if (loading) {
    return (
      <AppShell title="Income vs Expenses">
        <div className="loading-state">
          <div className="loading-spinner w-10 h-10" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Income vs Expenses">
      <div className="space-y-6 p-6">
        <AdminPageHeader
          eyebrow="Finance"
          title="Income vs Expenses"
          description="Monthly breakdown of maintenance collections vs expenses. When expenses exceed collections in a month, the gap is covered from the society fund balance."
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

        {/* Fund health overview — always shown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-fg-secondary">Fund Balance</span>
              <PiggyBank className="h-5 w-5 text-blue-500" />
            </div>
            <p className={`text-2xl font-bold ${(report?.currentFundBalance ?? 0) >= 0 ? "text-fg-primary" : "text-brand-danger"}`}>
              {fmt(report?.currentFundBalance ?? 0)}
            </p>
            <p className="text-xs text-fg-tertiary mt-1">
              Total money in the society fund right now
            </p>
          </div>

          <div className="card p-5 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-fg-secondary">Outstanding Dues</span>
              <CircleAlert className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-fg-primary">
              {fmt(report?.outstandingDues ?? 0)}
            </p>
            <p className="text-xs text-fg-tertiary mt-1">
              Unpaid maintenance by residents — fund balance will increase as they pay
            </p>
          </div>

          <div className="card p-5 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-fg-secondary">Advance Credit</span>
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-fg-primary">
              {fmt(report?.totalAdvanceCredit ?? 0)}
            </p>
            <p className="text-xs text-fg-tertiary mt-1">
              Overpayments by residents — available to cover future bills
            </p>
          </div>

          <div className={`card p-5 border-l-4 ${netPosition >= 0 ? "border-l-brand-success" : "border-l-orange-500"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-fg-secondary">{year} Net Position</span>
              {netPosition >= 0
                ? <ArrowUpRight className="h-5 w-5 text-brand-success" />
                : <ArrowDownRight className="h-5 w-5 text-orange-500" />}
            </div>
            <p className={`text-2xl font-bold ${netPosition >= 0 ? "text-brand-success" : "text-orange-600"}`}>
              {netPosition >= 0 ? "+" : ""}{fmt(netPosition)}
            </p>
            <p className="text-xs text-fg-tertiary mt-1">
              Total income minus total expenses in {year}
            </p>
          </div>
        </div>

        {/* Year income/expense breakdown */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <IndianRupee className="h-4 w-4 text-fg-tertiary" />
            <span className="text-xs font-semibold text-fg-tertiary uppercase tracking-wide">
              {year} Summary
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-fg-tertiary">Maintenance Collected</span>
              <p className="font-semibold text-brand-success">{fmt(totalCollected)}</p>
            </div>
            <div>
              <span className="text-fg-tertiary">Additional Funds</span>
              <p className="font-semibold text-blue-600">{fmt(totalAdditional)}</p>
            </div>
            <div>
              <span className="text-fg-tertiary">Total Income</span>
              <p className="font-semibold text-fg-primary">{fmt(totalIncome)}</p>
            </div>
            <div>
              <span className="text-fg-tertiary">Total Expenses</span>
              <p className="font-semibold text-brand-danger">{fmt(totalExpenses)}</p>
            </div>
            <div>
              <span className="text-fg-tertiary">Deficit Months</span>
              <p className={`font-semibold ${deficitMonths.length > 0 ? "text-orange-600" : "text-brand-success"}`}>
                {deficitMonths.length} of {activeMonths.length}
              </p>
            </div>
          </div>
        </div>

        {/* How it works explanation */}
        {deficitMonths.length > 0 && totalShortfall > 0 && (
          <div className="card p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                <p className="font-medium">
                  {fmt(totalShortfall)} gap across {deficitMonths.length} month{deficitMonths.length > 1 ? "s" : ""} where expenses exceeded income
                </p>
                <p className="text-amber-700 dark:text-amber-300">
                  This gap was covered from the society fund balance. As residents pay their outstanding dues ({fmt(report?.outstandingDues ?? 0)}), the fund balance will recover automatically.
                  {totalSurplus > 0 && ` Surplus months contributed ${fmt(totalSurplus)} back to the fund.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeMonths.length === 0 ? (
          <div className="empty-state p-12">
            <p className="empty-state-title">No financial activity in {year}</p>
            <p className="text-sm text-fg-tertiary mt-1">
              No maintenance collections or expenses recorded for this year yet.
            </p>
          </div>
        ) : (
          <>
            {/* View toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView("all")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  view === "all"
                    ? "bg-brand-primary text-white"
                    : "bg-surface-elevated text-fg-secondary hover:text-fg-primary"
                }`}
              >
                All Months ({activeMonths.length})
              </button>
              <button
                onClick={() => setView("deficit")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  view === "deficit"
                    ? "bg-brand-primary text-white"
                    : "bg-surface-elevated text-fg-secondary hover:text-fg-primary"
                }`}
              >
                Deficit Only ({deficitMonths.length})
              </button>
            </div>

            {displayMonths.length === 0 ? (
              <div className="empty-state p-8">
                <p className="empty-state-title">No deficit months in {year}</p>
                <p className="text-sm text-fg-tertiary mt-1">
                  Maintenance collections covered all expenses every month.
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-head">
                      <tr>
                        <th scope="col" className="table-th">Month</th>
                        <th scope="col" className="table-th text-right">Maintenance</th>
                        <th scope="col" className="table-th text-right">Add. Funds</th>
                        <th scope="col" className="table-th text-right">Total Income</th>
                        <th scope="col" className="table-th text-right">Expenses</th>
                        <th scope="col" className="table-th text-right">Net</th>
                        <th scope="col" className="table-th">Top Expense Categories</th>
                      </tr>
                    </thead>
                    <tbody className="bg-surface divide-y">
                      {displayMonths.map((m) => {
                        const net = m.totalIncome - m.expenses;
                        const isDeficit = net < 0;
                        const sorted = Object.entries(m.expenseCategories)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 3);
                        return (
                          <tr key={m.month} className={`table-row ${isDeficit ? "bg-orange-50/50 dark:bg-orange-950/10" : ""}`}>
                            <td className="table-td font-medium">
                              <div className="flex items-center gap-2">
                                {MONTH_SHORT[m.month - 1]} {year}
                                {isDeficit && (
                                  <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-300">
                                    DEFICIT
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="table-td text-right text-brand-success font-medium">
                              {fmt(m.maintenance)}
                            </td>
                            <td className="table-td text-right text-blue-600 font-medium">
                              {m.additionalFunds > 0 ? fmt(m.additionalFunds) : "—"}
                            </td>
                            <td className="table-td text-right font-medium">
                              {fmt(m.totalIncome)}
                            </td>
                            <td className="table-td text-right text-brand-danger font-medium">
                              {fmt(m.expenses)}
                            </td>
                            <td className={`table-td text-right font-semibold ${isDeficit ? "text-orange-600" : "text-brand-success"}`}>
                              {isDeficit ? "" : "+"}{fmt(net)}
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
                        <td className="table-td">
                          Total ({displayMonths.length} month{displayMonths.length === 1 ? "" : "s"})
                        </td>
                        <td className="table-td text-right text-brand-success">
                          {fmt(displayMonths.reduce((s, m) => s + m.maintenance, 0))}
                        </td>
                        <td className="table-td text-right text-blue-600">
                          {fmt(displayMonths.reduce((s, m) => s + m.additionalFunds, 0))}
                        </td>
                        <td className="table-td text-right">
                          {fmt(displayMonths.reduce((s, m) => s + m.totalIncome, 0))}
                        </td>
                        <td className="table-td text-right text-brand-danger">
                          {fmt(displayMonths.reduce((s, m) => s + m.expenses, 0))}
                        </td>
                        <td className={`table-td text-right ${
                          displayMonths.reduce((s, m) => s + m.totalIncome - m.expenses, 0) >= 0
                            ? "text-brand-success"
                            : "text-orange-600"
                        }`}>
                          {fmt(displayMonths.reduce((s, m) => s + m.totalIncome - m.expenses, 0))}
                        </td>
                        <td className="table-td" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Visual bar chart */}
            {activeMonths.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-fg-secondary mb-4">Monthly Income vs Expenses</h3>
                <div className="space-y-3">
                  {activeMonths.map((m) => {
                    const maxVal = Math.max(
                      ...activeMonths.map((am) => Math.max(am.totalIncome, am.expenses)),
                      1,
                    );
                    const incomeWidth = (m.totalIncome / maxVal) * 100;
                    const expenseWidth = (m.expenses / maxVal) * 100;
                    const isDeficit = m.expenses > m.totalIncome;
                    return (
                      <div key={m.month} className="flex items-center gap-3 text-xs">
                        <span className="w-8 text-fg-tertiary font-medium shrink-0">
                          {MONTH_SHORT[m.month - 1]}
                        </span>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 rounded-sm bg-emerald-400 dark:bg-emerald-500 transition-all"
                              style={{ width: `${Math.max(incomeWidth, 0.5)}%` }}
                            />
                            <span className="text-fg-tertiary shrink-0">{fmt(m.totalIncome)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-3 rounded-sm transition-all ${isDeficit ? "bg-orange-400 dark:bg-orange-500" : "bg-red-300 dark:bg-red-400"}`}
                              style={{ width: `${Math.max(expenseWidth, 0.5)}%` }}
                            />
                            <span className="text-fg-tertiary shrink-0">{fmt(m.expenses)}</span>
                          </div>
                        </div>
                        {isDeficit && (
                          <span className="text-orange-600 font-semibold shrink-0">
                            {fmt(m.expenses - m.totalIncome)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-fg-tertiary">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-emerald-400" /> Income
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-red-300" /> Expenses
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-orange-400" /> Expenses (exceeds income)
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs text-fg-tertiary px-1">
              Income = maintenance collected + additional funds. Deficit months are when expenses exceed income — the gap is automatically covered from the society fund balance. When residents clear their outstanding dues, the fund balance recovers.
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
