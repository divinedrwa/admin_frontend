"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  AlertTriangle,
  TrendingUp,
  PiggyBank,
  CircleAlert,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { parseApiError } from "@/utils/errorHandler";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FinancialYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
}

interface CycleRow {
  periodKey: string;
  periodMonth: number;
  periodYear: number;
  title: string | null;
  dueDate: string | null;
  status: string;
  totalExpected: number;
  totalCollected: number;
  totalExpense: number;
  net: number;
  paidCount: number;
  unpaidCount: number;
  expenseCategories: Record<string, number>;
}

interface ShortfallReport {
  financialYear: { id: string; label: string };
  currentFundBalance: number;
  outstandingDues: number;
  totalAdvanceCredit: number;
  totalShortfall: number;
  deficitCycleCount: number;
  totalCycleCount: number;
  cycles: CycleRow[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function fmt(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function cycleLabel(c: CycleRow): string {
  return c.title || `${MONTH_SHORT[c.periodMonth - 1]} ${c.periodYear}`;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminShortfallPage() {
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [selectedFyId, setSelectedFyId] = useState("");
  const [report, setReport] = useState<ShortfallReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"deficit" | "all">("all");

  // Load financial years on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/v1/admin/financial-years");
        const rows: FinancialYear[] = res.data.financialYears ?? [];
        if (cancelled) return;
        setFinancialYears(rows);
        if (rows.length > 0) setSelectedFyId((prev) => prev || rows[0].id);
      } catch (error: unknown) {
        showToast(parseApiError(error, "Failed to load financial years").message, "error");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load shortfall report when FY changes
  const fetchReport = useCallback(async (fyId: string, signal?: AbortSignal) => {
    if (!fyId) return;
    try {
      setLoading(true);
      const res = await api.get(`/maintenance-management/shortfall/${fyId}`, { signal });
      setReport(res.data);
    } catch (error: unknown) {
      if ((error as { name?: string }).name === "CanceledError") return;
      showToast(parseApiError(error, "Failed to load shortfall data").message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedFyId) return;
    const controller = new AbortController();
    void fetchReport(selectedFyId, controller.signal);
    return () => controller.abort();
  }, [selectedFyId, fetchReport]);

  /* ---- Derived data ---- */
  const cycles = report?.cycles ?? [];
  const deficitCycles = cycles.filter((c) => c.net < 0);
  const displayCycles = view === "deficit" ? deficitCycles : cycles;

  const totalCollected = cycles.reduce((s, c) => s + c.totalCollected, 0);
  const totalExpected = cycles.reduce((s, c) => s + c.totalExpected, 0);
  const totalExpense = cycles.reduce((s, c) => s + c.totalExpense, 0);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  const selectedFy = financialYears.find((f) => f.id === selectedFyId);

  /* ---- Loading state ---- */
  if (loading && !report) {
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
          description="Per-cycle breakdown of maintenance collections vs society expenses. Shows how much the society fund covered when expenses exceeded collections."
          icon={<Wallet className="h-6 w-6" />}
        />

        {/* Financial year selector */}
        <div className="filter-bar">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-fg-secondary">Financial Year</label>
            <select
              value={selectedFyId}
              onChange={(e) => setSelectedFyId(e.target.value)}
              className="input w-56"
            >
              {financialYears.length === 0 && (
                <option value="">No financial years</option>
              )}
              {financialYears.map((fy) => (
                <option key={fy.id} value={fy.id}>{fy.label}</option>
              ))}
            </select>
          </div>
        </div>

        {!report || cycles.length === 0 ? (
          <div className="empty-state p-12">
            <p className="empty-state-title">
              {financialYears.length === 0
                ? "No financial years created yet"
                : "No billing cycles in this financial year"}
            </p>
            <p className="text-sm text-fg-tertiary mt-1">
              {financialYears.length === 0
                ? "Create a financial year in Maintenance Management to get started."
                : "Create billing cycles to start tracking collections and expenses."}
            </p>
          </div>
        ) : (
          <>
            {/* Fund health overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-5 border-l-4 border-l-blue-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-fg-secondary">Fund Balance</span>
                  <PiggyBank className="h-5 w-5 text-blue-500" />
                </div>
                <p className={`text-2xl font-bold ${report.currentFundBalance >= 0 ? "text-fg-primary" : "text-brand-danger"}`}>
                  {fmt(report.currentFundBalance)}
                </p>
                <p className="text-xs text-fg-tertiary mt-1">
                  Total money in the society fund
                </p>
              </div>

              <div className="card p-5 border-l-4 border-l-amber-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-fg-secondary">Outstanding Dues</span>
                  <CircleAlert className="h-5 w-5 text-amber-500" />
                </div>
                <p className="text-2xl font-bold text-fg-primary">
                  {fmt(report.outstandingDues)}
                </p>
                <p className="text-xs text-fg-tertiary mt-1">
                  Pending from residents — fund recovers as they pay
                </p>
              </div>

              <div className="card p-5 border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-fg-secondary">Advance Credit</span>
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-fg-primary">
                  {fmt(report.totalAdvanceCredit)}
                </p>
                <p className="text-xs text-fg-tertiary mt-1">
                  Resident overpayments — covers future bills
                </p>
              </div>

              <div className={`card p-5 border-l-4 ${report.totalShortfall > 0 ? "border-l-orange-500" : "border-l-brand-success"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-fg-secondary">Total Shortfall</span>
                  {report.totalShortfall > 0
                    ? <ArrowDownRight className="h-5 w-5 text-orange-500" />
                    : <CheckCircle2 className="h-5 w-5 text-brand-success" />}
                </div>
                <p className={`text-2xl font-bold ${report.totalShortfall > 0 ? "text-orange-600" : "text-brand-success"}`}>
                  {report.totalShortfall > 0 ? fmt(report.totalShortfall) : "None"}
                </p>
                <p className="text-xs text-fg-tertiary mt-1">
                  {report.totalShortfall > 0
                    ? `Across ${report.deficitCycleCount} deficit cycle${report.deficitCycleCount === 1 ? "" : "s"} — covered from fund`
                    : "Collections covered all expenses"}
                </p>
              </div>
            </div>

            {/* FY summary row */}
            <div className="card p-4">
              <div className="text-xs font-semibold text-fg-tertiary uppercase tracking-wide mb-3">
                {selectedFy?.label ?? "Financial Year"} — {cycles.length} billing cycle{cycles.length === 1 ? "" : "s"}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="text-fg-tertiary">Expected</span>
                  <p className="font-semibold text-fg-primary">{fmt(totalExpected)}</p>
                </div>
                <div>
                  <span className="text-fg-tertiary">Collected</span>
                  <p className="font-semibold text-brand-success">{fmt(totalCollected)}</p>
                </div>
                <div>
                  <span className="text-fg-tertiary">Collection Rate</span>
                  <p className={`font-semibold ${collectionRate >= 80 ? "text-brand-success" : collectionRate >= 50 ? "text-amber-600" : "text-brand-danger"}`}>
                    {collectionRate}%
                  </p>
                </div>
                <div>
                  <span className="text-fg-tertiary">Expenses</span>
                  <p className="font-semibold text-brand-danger">{fmt(totalExpense)}</p>
                </div>
                <div>
                  <span className="text-fg-tertiary">Deficit Cycles</span>
                  <p className={`font-semibold ${deficitCycles.length > 0 ? "text-orange-600" : "text-brand-success"}`}>
                    {deficitCycles.length} of {cycles.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Explanation banner */}
            {report.totalShortfall > 0 && (
              <div className="card p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                    <p className="font-medium">
                      {fmt(report.totalShortfall)} shortfall across {report.deficitCycleCount} cycle{report.deficitCycleCount > 1 ? "s" : ""} where expenses exceeded collections
                    </p>
                    <p className="text-amber-700 dark:text-amber-300">
                      This was covered from the society fund balance.
                      {report.outstandingDues > 0
                        ? ` As residents clear their pending dues (${fmt(report.outstandingDues)}), the fund will recover.`
                        : " All dues have been collected."}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                All Cycles ({cycles.length})
              </button>
              <button
                onClick={() => setView("deficit")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  view === "deficit"
                    ? "bg-brand-primary text-white"
                    : "bg-surface-elevated text-fg-secondary hover:text-fg-primary"
                }`}
              >
                Deficit Only ({deficitCycles.length})
              </button>
            </div>

            {displayCycles.length === 0 ? (
              <div className="empty-state p-8">
                <p className="empty-state-title">No deficit cycles</p>
                <p className="text-sm text-fg-tertiary mt-1">
                  Collections covered expenses in every billing cycle.
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-head">
                      <tr>
                        <th scope="col" className="table-th">Cycle</th>
                        <th scope="col" className="table-th text-right">Expected</th>
                        <th scope="col" className="table-th text-right">Collected</th>
                        <th scope="col" className="table-th text-center">Paid / Total</th>
                        <th scope="col" className="table-th text-right">Expenses</th>
                        <th scope="col" className="table-th text-right">Net</th>
                        <th scope="col" className="table-th">Top Expense Categories</th>
                      </tr>
                    </thead>
                    <tbody className="bg-surface divide-y">
                      {displayCycles.map((c) => {
                        const isDeficit = c.net < 0;
                        const sorted = Object.entries(c.expenseCategories)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 3);
                        return (
                          <tr key={c.periodKey} className={`table-row ${isDeficit ? "bg-orange-50/50 dark:bg-orange-950/10" : ""}`}>
                            <td className="table-td font-medium">
                              <div className="flex items-center gap-2">
                                {cycleLabel(c)}
                                {isDeficit && (
                                  <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-300">
                                    DEFICIT
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="table-td text-right text-fg-secondary font-medium">
                              {fmt(c.totalExpected)}
                            </td>
                            <td className="table-td text-right text-brand-success font-medium">
                              {fmt(c.totalCollected)}
                            </td>
                            <td className="table-td text-center text-fg-secondary">
                              <span className="text-brand-success font-medium">{c.paidCount}</span>
                              <span className="text-fg-tertiary"> / {c.paidCount + c.unpaidCount}</span>
                            </td>
                            <td className="table-td text-right text-brand-danger font-medium">
                              {c.totalExpense > 0 ? fmt(c.totalExpense) : "—"}
                            </td>
                            <td className={`table-td text-right font-semibold ${isDeficit ? "text-orange-600" : "text-brand-success"}`}>
                              {isDeficit ? "" : "+"}{fmt(c.net)}
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
                          Total ({displayCycles.length} cycle{displayCycles.length === 1 ? "" : "s"})
                        </td>
                        <td className="table-td text-right">
                          {fmt(displayCycles.reduce((s, c) => s + c.totalExpected, 0))}
                        </td>
                        <td className="table-td text-right text-brand-success">
                          {fmt(displayCycles.reduce((s, c) => s + c.totalCollected, 0))}
                        </td>
                        <td className="table-td text-center">
                          <span className="text-brand-success">{displayCycles.reduce((s, c) => s + c.paidCount, 0)}</span>
                          <span className="text-fg-tertiary"> / {displayCycles.reduce((s, c) => s + c.paidCount + c.unpaidCount, 0)}</span>
                        </td>
                        <td className="table-td text-right text-brand-danger">
                          {fmt(displayCycles.reduce((s, c) => s + c.totalExpense, 0))}
                        </td>
                        <td className={`table-td text-right ${
                          displayCycles.reduce((s, c) => s + c.net, 0) >= 0
                            ? "text-brand-success"
                            : "text-orange-600"
                        }`}>
                          {fmt(displayCycles.reduce((s, c) => s + c.net, 0))}
                        </td>
                        <td className="table-td" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Visual bar chart */}
            {cycles.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-fg-secondary mb-4">
                  Collections vs Expenses by Cycle
                </h3>
                <div className="space-y-3">
                  {cycles.map((c) => {
                    const maxVal = Math.max(
                      ...cycles.map((cc) => Math.max(cc.totalCollected, cc.totalExpense)),
                      1,
                    );
                    const collectWidth = (c.totalCollected / maxVal) * 100;
                    const expenseWidth = (c.totalExpense / maxVal) * 100;
                    const isDeficit = c.net < 0;
                    return (
                      <div key={c.periodKey} className="flex items-center gap-3 text-xs">
                        <span className="w-20 text-fg-tertiary font-medium shrink-0 truncate">
                          {cycleLabel(c)}
                        </span>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 rounded-sm bg-emerald-400 dark:bg-emerald-500 transition-all"
                              style={{ width: `${Math.max(collectWidth, 0.5)}%` }}
                            />
                            <span className="text-fg-tertiary shrink-0">{fmt(c.totalCollected)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-3 rounded-sm transition-all ${isDeficit ? "bg-orange-400 dark:bg-orange-500" : "bg-red-300 dark:bg-red-400"}`}
                              style={{ width: `${Math.max(expenseWidth, 0.5)}%` }}
                            />
                            <span className="text-fg-tertiary shrink-0">{fmt(c.totalExpense)}</span>
                          </div>
                        </div>
                        {isDeficit && (
                          <span className="text-orange-600 font-semibold shrink-0">
                            {fmt(Math.abs(c.net))}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-fg-tertiary">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-emerald-400" /> Collected
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-red-300" /> Expenses
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-orange-400" /> Expenses (exceeds collected)
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs text-fg-tertiary px-1">
              Shortfall = expenses minus collections for cycles where expenses exceeded what was collected. The gap is covered from the society fund balance. As residents pay outstanding dues, the fund recovers.
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
