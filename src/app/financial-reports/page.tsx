"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  BarChart3,
  Download,
  Scale,
  ClipboardList,
  Target,
} from "lucide-react";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { parseApiError } from "@/utils/errorHandler";

// ---- Types ----

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

interface BalanceSheet {
  year: number;
  asOf: string;
  assets: { fundBalance: number; outstandingDues: number; totalAssets: number };
  liabilities: { advanceCredit: number; totalLiabilities: number };
  equity: { accumulatedSurplus: number; currentYearSurplus: number };
  totalLiabilitiesAndEquity: number;
}

interface TrialBalanceAccount {
  account: string;
  type: "INCOME" | "EXPENSE";
  debit: number;
  credit: number;
}

interface TrialBalance {
  year: number;
  accounts: TrialBalanceAccount[];
  totalDebit: number;
  totalCredit: number;
  difference: number;
  isBalanced: boolean;
}

interface BudgetRow {
  categoryId: string | null;
  categoryName: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
}

interface BudgetVsActual {
  year: number;
  rows: BudgetRow[];
  totals: { budgeted: number; actual: number; variance: number; variancePercent: number };
  hasBudgets: boolean;
}

type TabKey = "pl" | "balance" | "trial" | "budget";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "pl", label: "Income & Expenditure", icon: <BarChart3 className="h-4 w-4" /> },
  { key: "balance", label: "Balance Sheet", icon: <Scale className="h-4 w-4" /> },
  { key: "trial", label: "Trial Balance", icon: <ClipboardList className="h-4 w-4" /> },
  { key: "budget", label: "Budget vs Actual", icon: <Target className="h-4 w-4" /> },
];

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

// ---- PDF download helper ----

async function downloadPdf(url: string, filename: string) {
  try {
    const res = await api.get(url, { responseType: "blob" });
    const blob = new Blob([res.data as BlobPart], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error: unknown) {
    showToast(parseApiError(error, "Failed to download PDF").message, "error");
  }
}

// ---- Main page ----

export default function FinancialReportsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [tab, setTab] = useState<TabKey>("pl");
  const [loading, setLoading] = useState(true);

  // Data for each tab
  const [plReport, setPlReport] = useState<PLReport | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [budgetVsActual, setBudgetVsActual] = useState<BudgetVsActual | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const endpoints: Record<TabKey, string> = {
        pl: `/maintenance-management/profit-loss/${year}`,
        balance: `/maintenance-management/balance-sheet/${year}`,
        trial: `/maintenance-management/trial-balance/${year}`,
        budget: `/maintenance-management/budget-vs-actual/${year}`,
      };
      const res = await api.get(endpoints[tab], { signal });
      switch (tab) {
        case "pl": setPlReport(res.data); break;
        case "balance": setBalanceSheet(res.data); break;
        case "trial": setTrialBalance(res.data); break;
        case "budget": setBudgetVsActual(res.data); break;
      }
    } catch (error: unknown) {
      if ((error as { name?: string }).name === "CanceledError") return;
      showToast(parseApiError(error, "Failed to load report").message, "error");
    } finally {
      setLoading(false);
    }
  }, [year, tab]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const pdfEndpoints: Record<TabKey, { url: string; filename: string } | null> = {
    pl: { url: `/maintenance-management/profit-loss/${year}/pdf`, filename: `income_expenditure_${year}.pdf` },
    balance: { url: `/maintenance-management/balance-sheet/${year}/pdf`, filename: `balance_sheet_${year}.pdf` },
    trial: { url: `/maintenance-management/trial-balance/${year}/pdf`, filename: `trial_balance_${year}.pdf` },
    budget: null, // no PDF for budget vs actual yet
  };

  return (
    <AppShell title="Financial Reports">
      <div className="space-y-6 p-6">
        <AdminPageHeader
          eyebrow="Management"
          title="Financial Reports"
          description="Income & expenditure, balance sheet, trial balance, and budget analysis."
          icon={<BarChart3 className="h-6 w-6" />}
          actions={
            pdfEndpoints[tab] ? (
              <button
                onClick={() => {
                  const ep = pdfEndpoints[tab]!;
                  void downloadPdf(ep.url, ep.filename);
                }}
                className="btn btn-ghost flex items-center gap-2"
              >
                <Download size={16} />
                Download PDF
              </button>
            ) : undefined
          }
        />

        {/* Year selector + tabs */}
        <div className="filter-bar">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-fg-secondary">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="input w-36"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    tab === t.key
                      ? "bg-brand-primary text-white"
                      : "text-fg-secondary hover:bg-surface-elevated"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner w-10 h-10" />
          </div>
        ) : (
          <>
            {tab === "pl" && plReport && <PLTab report={plReport} />}
            {tab === "balance" && balanceSheet && <BalanceSheetTab data={balanceSheet} />}
            {tab === "trial" && trialBalance && <TrialBalanceTab data={trialBalance} />}
            {tab === "budget" && budgetVsActual && <BudgetTab data={budgetVsActual} />}
          </>
        )}
      </div>
    </AppShell>
  );
}

// ---- P&L Tab (existing, preserved) ----

function PLTab({ report }: { report: PLReport }) {
  const maxAmount = Math.max(
    ...report.months.map((m) => Math.max(m.totalIncome, m.expenses)),
    1
  );
  const sortedCategories = Object.entries(report.expenseCategorySummary)
    .sort(([, a], [, b]) => b - a);
  const topCategoryTotal = sortedCategories.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <>
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

      {/* Monthly bar chart */}
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

      {/* Expense breakdown */}
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
    </>
  );
}

// ---- Balance Sheet Tab ----

function BalanceSheetTab({ data }: { data: BalanceSheet }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Total Assets"
          value={fmt(data.assets.totalAssets)}
          icon={<TrendingUp className="h-5 w-5 text-brand-success" />}
          subtitle="Fund balance + receivables"
          highlight="success"
        />
        <SummaryCard
          label="Total Liabilities"
          value={fmt(data.liabilities.totalLiabilities)}
          icon={<TrendingDown className="h-5 w-5 text-brand-danger" />}
          subtitle="Advance credit owed to residents"
          highlight="danger"
        />
        <SummaryCard
          label="Net Worth"
          value={fmt(data.equity.accumulatedSurplus)}
          icon={<Wallet className="h-5 w-5 text-brand-primary" />}
          subtitle={`Current year surplus: ${fmt(data.equity.currentYearSurplus)}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <div className="card p-6">
          <h3 className="font-semibold text-fg-primary mb-4 flex items-center gap-2">
            <div className="h-3 w-1 rounded-full bg-brand-success" />
            Assets
          </h3>
          <div className="space-y-3">
            <StatementRow label="Fund Balance (Bank)" value={fmt(data.assets.fundBalance)} />
            <StatementRow label="Outstanding Dues (Receivable)" value={fmt(data.assets.outstandingDues)} />
            <div className="border-t border-border pt-3">
              <StatementRow label="Total Assets" value={fmt(data.assets.totalAssets)} bold />
            </div>
          </div>
        </div>

        {/* Liabilities + Equity */}
        <div className="card p-6">
          <h3 className="font-semibold text-fg-primary mb-4 flex items-center gap-2">
            <div className="h-3 w-1 rounded-full bg-brand-danger" />
            Liabilities & Equity
          </h3>
          <div className="space-y-3">
            <StatementRow label="Advance Credit (Resident Overpayments)" value={fmt(data.liabilities.advanceCredit)} />
            <div className="border-t border-border pt-3">
              <StatementRow label="Total Liabilities" value={fmt(data.liabilities.totalLiabilities)} bold />
            </div>
            <div className="pt-2">
              <StatementRow label="Accumulated Surplus (Equity)" value={fmt(data.equity.accumulatedSurplus)} />
              <StatementRow label="Current Year Surplus" value={fmt(data.equity.currentYearSurplus)} muted />
            </div>
            <div className="border-t border-border pt-3">
              <StatementRow label="Total Liabilities + Equity" value={fmt(data.totalLiabilitiesAndEquity)} bold />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <p className="text-xs text-fg-tertiary text-center">
          As of {new Date(data.asOf).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          {" "} | This is a simplified balance sheet for housing society accounting. Assets = Liabilities + Equity.
        </p>
      </div>
    </>
  );
}

// ---- Trial Balance Tab ----

function TrialBalanceTab({ data }: { data: TrialBalance }) {
  const incomeAccounts = data.accounts.filter((a) => a.type === "INCOME");
  const expenseAccounts = data.accounts.filter((a) => a.type === "EXPENSE");

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Total Credits"
          value={fmt(data.totalCredit)}
          icon={<TrendingUp className="h-5 w-5 text-brand-success" />}
          subtitle="Income accounts"
          highlight="success"
        />
        <SummaryCard
          label="Total Debits"
          value={fmt(data.totalDebit)}
          icon={<TrendingDown className="h-5 w-5 text-brand-danger" />}
          subtitle="Expense accounts"
          highlight="danger"
        />
        <SummaryCard
          label="Difference"
          value={fmt(data.difference)}
          icon={<Scale className="h-5 w-5 text-brand-primary" />}
          subtitle={data.isBalanced ? "Books are balanced" : "Imbalance detected"}
        />
      </div>

      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th scope="col" className="table-th">Account</th>
                <th scope="col" className="table-th">Type</th>
                <th scope="col" className="table-th text-right">Debit</th>
                <th scope="col" className="table-th text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y">
              {incomeAccounts.map((a) => (
                <tr key={a.account} className="table-row">
                  <td className="table-td font-medium">{a.account}</td>
                  <td className="table-td"><span className="badge badge-success">Income</span></td>
                  <td className="table-td text-right">{a.debit > 0 ? fmt(a.debit) : "—"}</td>
                  <td className="table-td text-right font-medium text-brand-success">{a.credit > 0 ? fmt(a.credit) : "—"}</td>
                </tr>
              ))}
              {expenseAccounts.map((a) => (
                <tr key={a.account} className="table-row">
                  <td className="table-td font-medium">{a.account}</td>
                  <td className="table-td"><span className="badge badge-danger">Expense</span></td>
                  <td className="table-td text-right font-medium text-brand-danger">{a.debit > 0 ? fmt(a.debit) : "—"}</td>
                  <td className="table-td text-right">{a.credit > 0 ? fmt(a.credit) : "—"}</td>
                </tr>
              ))}
              <tr className="table-row font-bold bg-surface-elevated">
                <td className="table-td" colSpan={2}>Totals</td>
                <td className="table-td text-right text-brand-danger">{fmt(data.totalDebit)}</td>
                <td className="table-td text-right text-brand-success">{fmt(data.totalCredit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {!data.isBalanced && (
        <div className="card p-4 border-l-4 border-l-brand-danger">
          <p className="text-sm text-fg-secondary">
            <strong>Note:</strong> The trial balance shows a difference of {fmt(data.difference)}.
            This represents the net surplus (income exceeding expenses) for the year, which is expected for a society that collects more than it spends.
          </p>
        </div>
      )}
    </>
  );
}

// ---- Budget vs Actual Tab ----

function BudgetTab({ data }: { data: BudgetVsActual }) {
  if (!data.hasBudgets && data.rows.length === 0) {
    return (
      <div className="empty-state p-12">
        <Target className="h-10 w-10 text-fg-tertiary mx-auto mb-3" />
        <p className="empty-state-title">No budgets set</p>
        <p className="text-sm text-fg-tertiary mt-1">
          Set category budgets in the Expenses section to see budget vs actual comparisons here.
        </p>
      </div>
    );
  }

  const maxBar = Math.max(...data.rows.map((r) => Math.max(r.budgeted, r.actual)), 1);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Total Budgeted"
          value={fmt(data.totals.budgeted)}
          icon={<Target className="h-5 w-5 text-brand-primary" />}
          subtitle={`${data.rows.length} categories`}
        />
        <SummaryCard
          label="Total Actual"
          value={fmt(data.totals.actual)}
          icon={<TrendingDown className="h-5 w-5 text-brand-danger" />}
          subtitle="Approved expenses"
          highlight={data.totals.actual > data.totals.budgeted ? "danger" : undefined}
        />
        <SummaryCard
          label={data.totals.variance >= 0 ? "Under Budget" : "Over Budget"}
          value={fmt(Math.abs(data.totals.variance))}
          icon={
            data.totals.variance >= 0
              ? <ArrowDownRight className="h-5 w-5 text-brand-success" />
              : <ArrowUpRight className="h-5 w-5 text-brand-danger" />
          }
          subtitle={`${Math.abs(data.totals.variancePercent).toFixed(1)}% ${data.totals.variance >= 0 ? "savings" : "overrun"}`}
          highlight={data.totals.variance >= 0 ? "success" : "danger"}
        />
      </div>

      {/* Visual bars */}
      <div className="card p-6">
        <h3 className="font-semibold text-fg-primary mb-4">Category Comparison</h3>
        <div className="space-y-4">
          {data.rows.map((r) => (
            <div key={r.categoryId ?? r.categoryName}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-fg-primary">{r.categoryName}</span>
                <span className={`text-xs font-medium ${r.variance >= 0 ? "text-brand-success" : "text-brand-danger"}`}>
                  {r.variance >= 0 ? "Under" : "Over"} by {fmt(Math.abs(r.variance))}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-16 text-xs text-fg-tertiary shrink-0">Budget</div>
                  <div className="flex-1 bg-surface-elevated rounded-sm h-3">
                    <div
                      className="h-3 rounded-sm bg-brand-primary/40"
                      style={{ width: `${r.budgeted > 0 ? (r.budgeted / maxBar) * 100 : 0}%`, minWidth: r.budgeted > 0 ? "4px" : "0" }}
                    />
                  </div>
                  <span className="text-xs text-fg-secondary w-24 text-right">{fmt(r.budgeted)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 text-xs text-fg-tertiary shrink-0">Actual</div>
                  <div className="flex-1 bg-surface-elevated rounded-sm h-3">
                    <div
                      className={`h-3 rounded-sm ${r.actual > r.budgeted ? "bg-brand-danger/60" : "bg-brand-success/60"}`}
                      style={{ width: `${r.actual > 0 ? (r.actual / maxBar) * 100 : 0}%`, minWidth: r.actual > 0 ? "4px" : "0" }}
                    />
                  </div>
                  <span className="text-xs text-fg-secondary w-24 text-right">{fmt(r.actual)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-brand-primary/40" />
            <span className="text-xs text-fg-secondary">Budgeted</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-brand-success/60" />
            <span className="text-xs text-fg-secondary">Actual (within budget)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-brand-danger/60" />
            <span className="text-xs text-fg-secondary">Actual (over budget)</span>
          </div>
        </div>
      </div>

      {/* Detail table */}
      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th scope="col" className="table-th">Category</th>
                <th scope="col" className="table-th text-right">Budgeted</th>
                <th scope="col" className="table-th text-right">Actual</th>
                <th scope="col" className="table-th text-right">Variance</th>
                <th scope="col" className="table-th text-right">%</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y">
              {data.rows.map((r) => (
                <tr key={r.categoryId ?? r.categoryName} className="table-row">
                  <td className="table-td font-medium">{r.categoryName}</td>
                  <td className="table-td text-right">{fmt(r.budgeted)}</td>
                  <td className="table-td text-right">{fmt(r.actual)}</td>
                  <td className={`table-td text-right font-medium ${r.variance >= 0 ? "text-brand-success" : "text-brand-danger"}`}>
                    {r.variance >= 0 ? "+" : ""}{fmt(r.variance)}
                  </td>
                  <td className={`table-td text-right text-sm ${r.variance >= 0 ? "text-brand-success" : "text-brand-danger"}`}>
                    {r.variancePercent > 0 ? "+" : ""}{r.variancePercent.toFixed(1)}%
                  </td>
                </tr>
              ))}
              <tr className="table-row font-bold bg-surface-elevated">
                <td className="table-td">Totals</td>
                <td className="table-td text-right">{fmt(data.totals.budgeted)}</td>
                <td className="table-td text-right">{fmt(data.totals.actual)}</td>
                <td className={`table-td text-right ${data.totals.variance >= 0 ? "text-brand-success" : "text-brand-danger"}`}>
                  {data.totals.variance >= 0 ? "+" : ""}{fmt(data.totals.variance)}
                </td>
                <td className={`table-td text-right ${data.totals.variance >= 0 ? "text-brand-success" : "text-brand-danger"}`}>
                  {data.totals.variancePercent > 0 ? "+" : ""}{data.totals.variancePercent.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ---- Shared components ----

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

function StatementRow({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={`text-sm ${bold ? "font-semibold text-fg-primary" : muted ? "text-fg-tertiary" : "text-fg-secondary"}`}>
        {label}
      </span>
      <span className={`text-sm ${bold ? "font-bold text-fg-primary" : muted ? "text-fg-tertiary" : "font-medium text-fg-primary"}`}>
        {value}
      </span>
    </div>
  );
}
