"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  BarChart3,
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
  expenseCategorySummary: Record<string, number>;
}

const MONTH_NAMES = [
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

export default function FinancialReportsPage() {
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

  if (loading) {
    return (
      <AppShell title="Financial Reports">
        <div className="loading-state">
          <div className="loading-spinner w-10 h-10" />
        </div>
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell title="Financial Reports">
        <div className="empty-state p-12">
          <p className="empty-state-title">No data available</p>
        </div>
      </AppShell>
    );
  }

  // Find max income/expense for bar scaling
  const maxAmount = Math.max(
    ...report.months.map((m) => Math.max(m.totalIncome, m.expenses)),
    1
  );

  // Sort expense categories by amount
  const sortedCategories = Object.entries(report.expenseCategorySummary)
    .sort(([, a], [, b]) => b - a);
  const topCategoryTotal = sortedCategories.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <AppShell title="Financial Reports">
      <div className="space-y-6 p-6">
        <AdminPageHeader
          eyebrow="Management"
          title="Financial Reports"
          description="Profit & loss overview with month-by-month income, expenses, and fund balance."
          icon={<BarChart3 className="h-6 w-6" />}
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

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="Total Income"
            value={fmt(report.totalIncome)}
            icon={<TrendingUp className="h-5 w-5 text-brand-success" />}
            subtitle="Maintenance + additional funds"
          />
          <SummaryCard
            label="Total Expenses"
            value={fmt(report.totalExpenses)}
            icon={<TrendingDown className="h-5 w-5 text-brand-danger" />}
            subtitle="All society outgoings"
          />
          <SummaryCard
            label={report.netSurplus >= 0 ? "Net Surplus" : "Net Deficit"}
            value={fmt(Math.abs(report.netSurplus))}
            icon={
              report.netSurplus >= 0
                ? <ArrowUpRight className="h-5 w-5 text-brand-success" />
                : <ArrowDownRight className="h-5 w-5 text-brand-danger" />
            }
            subtitle={`For year ${report.year}`}
            highlight={report.netSurplus >= 0 ? "success" : "danger"}
          />
          <SummaryCard
            label="Fund Balance"
            value={fmt(report.currentFundBalance)}
            icon={<Wallet className="h-5 w-5 text-brand-primary" />}
            subtitle={`Outstanding dues: ${fmt(report.outstandingDues)}`}
          />
        </div>

        {/* Monthly P&L bar chart */}
        <div className="card p-6">
          <h3 className="font-semibold text-fg-primary mb-4">Monthly Income vs Expenses</h3>
          <div className="space-y-3">
            {report.months.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="w-10 text-sm text-fg-secondary font-medium shrink-0">
                  {MONTH_NAMES[m.month - 1]}
                </span>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 rounded-sm bg-brand-success/70"
                      style={{ width: `${(m.totalIncome / maxAmount) * 100}%`, minWidth: m.totalIncome > 0 ? "4px" : "0" }}
                    />
                    <span className="text-xs text-fg-secondary whitespace-nowrap">{fmt(m.totalIncome)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 rounded-sm bg-brand-danger/60"
                      style={{ width: `${(m.expenses / maxAmount) * 100}%`, minWidth: m.expenses > 0 ? "4px" : "0" }}
                    />
                    <span className="text-xs text-fg-secondary whitespace-nowrap">{fmt(m.expenses)}</span>
                  </div>
                </div>
                <span className={`text-sm font-medium w-24 text-right ${m.net >= 0 ? "text-brand-success" : "text-brand-danger"}`}>
                  {m.net >= 0 ? "+" : ""}{fmt(m.net)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-brand-success/70" />
              <span className="text-xs text-fg-secondary">Income</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-brand-danger/60" />
              <span className="text-xs text-fg-secondary">Expenses</span>
            </div>
          </div>
        </div>

        {/* Monthly detail table */}
        <div className="table-wrapper">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th scope="col" className="table-th">Month</th>
                  <th scope="col" className="table-th text-right">Maintenance</th>
                  <th scope="col" className="table-th text-right">Additional</th>
                  <th scope="col" className="table-th text-right">Total Income</th>
                  <th scope="col" className="table-th text-right">Expenses</th>
                  <th scope="col" className="table-th text-right">Net</th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y">
                {report.months.map((m) => (
                  <tr key={m.month} className="table-row">
                    <td className="table-td font-medium">{MONTH_NAMES[m.month - 1]} {report.year}</td>
                    <td className="table-td text-right">{fmt(m.maintenance)}</td>
                    <td className="table-td text-right">{fmt(m.additionalFunds)}</td>
                    <td className="table-td text-right font-medium text-brand-success">{fmt(m.totalIncome)}</td>
                    <td className="table-td text-right font-medium text-brand-danger">{fmt(m.expenses)}</td>
                    <td className={`table-td text-right font-semibold ${m.net >= 0 ? "text-brand-success" : "text-brand-danger"}`}>
                      {m.net >= 0 ? "+" : ""}{fmt(m.net)}
                    </td>
                  </tr>
                ))}
                <tr className="table-row font-bold bg-surface-elevated">
                  <td className="table-td">Total</td>
                  <td className="table-td text-right">
                    {fmt(report.months.reduce((s, m) => s + m.maintenance, 0))}
                  </td>
                  <td className="table-td text-right">
                    {fmt(report.months.reduce((s, m) => s + m.additionalFunds, 0))}
                  </td>
                  <td className="table-td text-right text-brand-success">{fmt(report.totalIncome)}</td>
                  <td className="table-td text-right text-brand-danger">{fmt(report.totalExpenses)}</td>
                  <td className={`table-td text-right ${report.netSurplus >= 0 ? "text-brand-success" : "text-brand-danger"}`}>
                    {report.netSurplus >= 0 ? "+" : ""}{fmt(report.netSurplus)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Expense category breakdown */}
        {sortedCategories.length > 0 && (
          <div className="card p-6">
            <h3 className="font-semibold text-fg-primary mb-4">Expense Breakdown by Category</h3>
            <div className="space-y-3">
              {sortedCategories.map(([cat, amount]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="w-40 text-sm text-fg-secondary truncate shrink-0">{cat}</span>
                  <div className="flex-1">
                    <div
                      className="h-5 rounded-sm bg-brand-primary/50"
                      style={{ width: `${(amount / topCategoryTotal) * 100}%`, minWidth: "4px" }}
                    />
                  </div>
                  <span className="text-sm font-medium text-fg-primary w-28 text-right">{fmt(amount)}</span>
                  <span className="text-xs text-fg-secondary w-12 text-right">
                    {Math.round((amount / topCategoryTotal) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  subtitle,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
  highlight?: "success" | "danger";
}) {
  return (
    <div className={`card p-5 ${highlight === "success" ? "border-l-4 border-l-brand-success" : highlight === "danger" ? "border-l-4 border-l-brand-danger" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-fg-secondary">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold text-fg-primary">{value}</p>
      {subtitle && <p className="text-xs text-fg-tertiary mt-1">{subtitle}</p>}
    </div>
  );
}
