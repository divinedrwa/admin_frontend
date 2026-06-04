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
  Layers,
  CheckCircle2,
  AlertTriangle,
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

interface CycleReportRow {
  cycleId: string;
  title: string;
  periodMonth: number;
  periodYear: number;
  status: string;
  dueDate: string | null;
  totalExpected: number;
  totalCollected: number;
  pendingDues: number;
  collectionRate: number;
  totalExpense: number;
  net: number;
  paidCount: number;
  unpaidCount: number;
}

interface CycleReport {
  year: number;
  totalExpected: number;
  totalCollected: number;
  totalPending: number;
  collectionRate: number;
  totalExpenses: number;
  netPosition: number;
  totalPaid: number;
  totalUnpaid: number;
  cycles: CycleReportRow[];
}

interface CollectionCycleRow {
  cycleId: string;
  title: string;
  periodMonth: number;
  periodYear: number;
  status: string;
  totalExpected: number;
  totalCollected: number;
  totalExpense: number;
  net: number;
  paidCount: number;
  unpaidCount: number;
  collectionRate: number;
}

interface CollectionSummary {
  expectedAllTime: number;
  collectedAllTime: number;
  collectionRate: number;
  cycles: CollectionCycleRow[];
}

interface FundSegregation {
  maintenanceFund: {
    balance: number;
    spendable: number;
    advanceCredit: number;
    cashInflow: number;
    additionalMergedInflow: number;
    totalExpenses: number;
  };
  projectFunds: {
    total: number;
    projects: Array<{ id: string; title: string; collected: number; spent: number; balance: number; target: number }>;
  };
  separateFunds: {
    total: number;
    items: Array<{ id: string; title: string; amount: number; source: string | null; receivedDate: string }>;
  };
  computedBankBalance: number;
  outstandingDues: number;
  collectionSummary?: CollectionSummary;
}

type TabKey = "pl" | "balance" | "cycles" | "funds";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "pl", label: "Income & Expenditure", icon: <BarChart3 className="h-4 w-4" /> },
  { key: "balance", label: "Financial Position", icon: <Scale className="h-4 w-4" /> },
  { key: "cycles", label: "Billing Cycles", icon: <ClipboardList className="h-4 w-4" /> },
  { key: "funds", label: "Fund Segregation", icon: <Layers className="h-4 w-4" /> },
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
  const [cycleReport, setCycleReport] = useState<CycleReport | null>(null);
  const [fundSegregation, setFundSegregation] = useState<FundSegregation | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const endpoints: Record<TabKey, string> = {
        pl: `/maintenance-management/profit-loss/${year}`,
        balance: `/maintenance-management/balance-sheet/${year}`,
        cycles: `/maintenance-management/cycle-report/${year}`,
        funds: `/maintenance-management/fund-segregation`,
      };
      const res = await api.get(endpoints[tab], { signal });
      switch (tab) {
        case "pl": setPlReport(res.data); break;
        case "balance": setBalanceSheet(res.data); break;
        case "cycles": setCycleReport(res.data); break;
        case "funds": setFundSegregation(res.data); break;
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
    cycles: null, // no PDF for billing cycles yet
    funds: null, // no PDF for fund segregation yet
  };

  return (
    <AppShell title="Financial Reports">
      <div className="space-y-6 p-6">
        <AdminPageHeader
          eyebrow="Management"
          title="Financial Reports"
          description="Income & expenditure, billing cycles, financial position, and fund segregation."
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
            {tab === "cycles" && cycleReport && <BillingCyclesTab data={cycleReport} />}
            {tab === "funds" && fundSegregation && <FundSegregationTab data={fundSegregation} />}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
          label="Total Income"
          value={fmt(report.totalIncome)}
          icon={<TrendingUp className="h-5 w-5 text-brand-success" />}
          subtitle={`Maintenance + other income in ${report.year}`}
        />
        <SummaryCard
          label="Total Expenses"
          value={fmt(report.totalExpenses)}
          icon={<TrendingDown className="h-5 w-5 text-brand-danger" />}
          subtitle={`All approved expenses in ${report.year}`}
        />
        <SummaryCard
          label={report.netSurplus >= 0 ? "Net Surplus" : "Net Deficit"}
          value={fmt(Math.abs(report.netSurplus))}
          icon={
            report.netSurplus >= 0
              ? <ArrowUpRight className="h-5 w-5 text-brand-success" />
              : <ArrowDownRight className="h-5 w-5 text-brand-danger" />
          }
          subtitle={`Income minus expenses for ${report.year}`}
          highlight={report.netSurplus >= 0 ? "success" : "danger"}
        />
        <SummaryCard
          label="Outstanding Dues"
          value={fmt(report.outstandingDues)}
          icon={<AlertTriangle className="h-5 w-5 text-brand-danger" />}
          subtitle="Total pending from all residents"
          highlight={report.outstandingDues > 0 ? "danger" : undefined}
        />
        <SummaryCard
          label="Bank Balance"
          value={fmt(report.currentFundBalance)}
          icon={<Wallet className="h-5 w-5 text-brand-primary" />}
          subtitle="All-time available funds"
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
                <th scope="col" className="table-th text-right">Other Income</th>
                <th scope="col" className="table-th text-right">Total Income</th>
                <th scope="col" className="table-th text-right">Expenses</th>
                <th scope="col" className="table-th text-right">Surplus / Deficit</th>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Bank Balance"
          value={fmt(data.assets.fundBalance)}
          icon={<Wallet className="h-5 w-5 text-brand-success" />}
          subtitle="Available funds in bank"
          highlight="success"
        />
        <SummaryCard
          label="Pending from Residents"
          value={fmt(data.assets.outstandingDues)}
          icon={<AlertTriangle className="h-5 w-5 text-brand-danger" />}
          subtitle="Dues yet to be collected"
          highlight={data.assets.outstandingDues > 0 ? "danger" : undefined}
        />
        <SummaryCard
          label="Advance Payments Held"
          value={fmt(data.liabilities.advanceCredit)}
          icon={<TrendingDown className="h-5 w-5 text-brand-primary" />}
          subtitle="Overpayments by residents"
        />
        <SummaryCard
          label="Society Net Worth"
          value={fmt(data.equity.accumulatedSurplus)}
          icon={<TrendingUp className="h-5 w-5 text-brand-primary" />}
          subtitle={`This year's surplus: ${fmt(data.equity.currentYearSurplus)}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* What Society Has */}
        <div className="card p-6">
          <h3 className="font-semibold text-fg-primary mb-4 flex items-center gap-2">
            <div className="h-3 w-1 rounded-full bg-brand-success" />
            What Society Has
          </h3>
          <div className="space-y-3">
            <StatementRow label="Bank Balance (Available Funds)" value={fmt(data.assets.fundBalance)} />
            <StatementRow label="Pending Dues from Residents" value={fmt(data.assets.outstandingDues)} />
            <div className="border-t border-border pt-3">
              <StatementRow label="Total" value={fmt(data.assets.totalAssets)} bold />
            </div>
          </div>
        </div>

        {/* What Society Owes + Net Worth */}
        <div className="card p-6">
          <h3 className="font-semibold text-fg-primary mb-4 flex items-center gap-2">
            <div className="h-3 w-1 rounded-full bg-brand-danger" />
            Obligations & Net Worth
          </h3>
          <div className="space-y-3">
            <StatementRow label="Advance Payments by Residents" value={fmt(data.liabilities.advanceCredit)} />
            <div className="border-t border-border pt-3">
              <StatementRow label="Total Obligations" value={fmt(data.liabilities.totalLiabilities)} bold />
            </div>
            <div className="pt-2">
              <StatementRow label="Society Net Worth" value={fmt(data.equity.accumulatedSurplus)} />
              <StatementRow label="This Year's Surplus" value={fmt(data.equity.currentYearSurplus)} muted />
            </div>
            <div className="border-t border-border pt-3">
              <StatementRow label="Total Obligations + Net Worth" value={fmt(data.totalLiabilitiesAndEquity)} bold />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <p className="text-xs text-fg-tertiary text-center">
          As of {new Date(data.asOf).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          {" "} | Bank Balance + Pending Dues = Obligations + Net Worth
        </p>
      </div>
    </>
  );
}

// ---- Billing Cycles Tab ----

function BillingCyclesTab({ data }: { data: CycleReport }) {
  if (data.cycles.length === 0) {
    return (
      <div className="empty-state p-12">
        <ClipboardList className="h-10 w-10 text-fg-tertiary mx-auto mb-3" />
        <p className="empty-state-title">No billing cycles for {data.year}</p>
        <p className="text-sm text-fg-tertiary mt-1">
          Billing cycles will appear here once maintenance collection is set up for this year.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
          label="Expected Collection"
          value={fmt(data.totalExpected)}
          icon={<Target className="h-5 w-5 text-brand-primary" />}
          subtitle={`Total due from ${data.totalPaid + data.totalUnpaid} villas`}
        />
        <SummaryCard
          label="Actual Collection"
          value={fmt(data.totalCollected)}
          icon={<TrendingUp className="h-5 w-5 text-brand-success" />}
          subtitle={`${data.totalPaid} paid across all cycles`}
          highlight="success"
        />
        <SummaryCard
          label="Pending Dues"
          value={fmt(data.totalPending)}
          icon={<AlertTriangle className="h-5 w-5 text-brand-danger" />}
          subtitle={`${data.totalUnpaid} unpaid across all cycles`}
          highlight={data.totalPending > 0 ? "danger" : undefined}
        />
        <SummaryCard
          label="Collection Rate"
          value={`${data.collectionRate}%`}
          icon={<BarChart3 className="h-5 w-5 text-brand-primary" />}
          subtitle={data.collectionRate >= 90 ? "Healthy" : data.collectionRate >= 70 ? "Needs attention" : "Low collection"}
          highlight={data.collectionRate >= 90 ? "success" : data.collectionRate < 70 ? "danger" : undefined}
        />
        <SummaryCard
          label="Total Expenses"
          value={fmt(data.totalExpenses)}
          icon={<TrendingDown className="h-5 w-5 text-brand-danger" />}
          subtitle={`Net position: ${data.netPosition >= 0 ? "+" : ""}${fmt(data.netPosition)}`}
        />
      </div>

      {/* Cycle detail table */}
      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th scope="col" className="table-th">Billing Cycle</th>
                <th scope="col" className="table-th text-center">Status</th>
                <th scope="col" className="table-th text-right">Expected</th>
                <th scope="col" className="table-th text-right">Collected</th>
                <th scope="col" className="table-th text-right">Pending</th>
                <th scope="col" className="table-th text-right">Rate</th>
                <th scope="col" className="table-th text-right">Expenses</th>
                <th scope="col" className="table-th text-right">Surplus / Deficit</th>
                <th scope="col" className="table-th text-right">Paid</th>
                <th scope="col" className="table-th text-right">Unpaid</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y">
              {data.cycles.map((c) => (
                <tr key={c.cycleId} className="table-row">
                  <td className="table-td font-medium whitespace-nowrap">{c.title}</td>
                  <td className="table-td text-center">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                      c.status === "CLOSED"
                        ? "bg-surface-elevated text-fg-tertiary"
                        : c.status === "ACTIVE"
                          ? "bg-brand-success/10 text-brand-success"
                          : "bg-brand-primary/10 text-brand-primary"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="table-td text-right">{fmt(c.totalExpected)}</td>
                  <td className="table-td text-right text-brand-success">{fmt(c.totalCollected)}</td>
                  <td className={`table-td text-right ${c.pendingDues > 0 ? "text-brand-danger font-medium" : "text-fg-tertiary"}`}>
                    {c.pendingDues > 0 ? fmt(c.pendingDues) : "—"}
                  </td>
                  <td className={`table-td text-right ${
                    c.collectionRate >= 90 ? "text-brand-success" : c.collectionRate < 70 ? "text-brand-danger" : "text-fg-primary"
                  }`}>
                    {c.collectionRate}%
                  </td>
                  <td className="table-td text-right">{c.totalExpense > 0 ? fmt(c.totalExpense) : "—"}</td>
                  <td className={`table-td text-right font-medium ${c.net >= 0 ? "text-brand-success" : "text-brand-danger"}`}>
                    {c.net >= 0 ? "+" : ""}{fmt(c.net)}
                  </td>
                  <td className="table-td text-right text-brand-success">{c.paidCount}</td>
                  <td className={`table-td text-right ${c.unpaidCount > 0 ? "text-brand-danger" : "text-fg-tertiary"}`}>
                    {c.unpaidCount > 0 ? c.unpaidCount : "—"}
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="table-row font-bold bg-surface-elevated">
                <td className="table-td">Total ({data.cycles.length} cycles)</td>
                <td className="table-td" />
                <td className="table-td text-right">{fmt(data.totalExpected)}</td>
                <td className="table-td text-right text-brand-success">{fmt(data.totalCollected)}</td>
                <td className={`table-td text-right ${data.totalPending > 0 ? "text-brand-danger" : ""}`}>
                  {data.totalPending > 0 ? fmt(data.totalPending) : "—"}
                </td>
                <td className="table-td text-right">{data.collectionRate}%</td>
                <td className="table-td text-right">{fmt(data.totalExpenses)}</td>
                <td className={`table-td text-right ${data.netPosition >= 0 ? "text-brand-success" : "text-brand-danger"}`}>
                  {data.netPosition >= 0 ? "+" : ""}{fmt(data.netPosition)}
                </td>
                <td className="table-td text-right text-brand-success">{data.totalPaid}</td>
                <td className={`table-td text-right ${data.totalUnpaid > 0 ? "text-brand-danger" : ""}`}>
                  {data.totalUnpaid > 0 ? data.totalUnpaid : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Contextual guidance */}
      {data.totalPending > 0 && (
        <div className="card p-4 border-l-4 border-l-brand-danger">
          <p className="text-sm text-fg-secondary">
            <strong>{fmt(data.totalPending)}</strong> in dues are still pending collection from <strong>{data.totalUnpaid}</strong> villa-cycle entries.
            {data.netPosition < 0 && (
              <> The society has a <strong>net deficit of {fmt(Math.abs(data.netPosition))}</strong> — expenses exceeded collections.</>
            )}
          </p>
        </div>
      )}
    </>
  );
}

// ---- Fund Segregation Tab ----

function FundSegregationTab({ data }: { data: FundSegregation }) {
  const { maintenanceFund, projectFunds, separateFunds, computedBankBalance, outstandingDues, collectionSummary: cs } = data;
  const isBalanced = Math.abs(
    computedBankBalance - (maintenanceFund.balance + projectFunds.total + separateFunds.total)
  ) < 1;

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Spendable Maintenance"
          value={fmt(maintenanceFund.spendable)}
          icon={<Wallet className="h-5 w-5 text-brand-success" />}
          subtitle="Maintenance fund minus advance credit"
          highlight={maintenanceFund.spendable >= 0 ? "success" : "danger"}
        />
        <SummaryCard
          label="Advance Credit (Liability)"
          value={fmt(maintenanceFund.advanceCredit)}
          icon={<TrendingDown className="h-5 w-5 text-brand-danger" />}
          subtitle="Credit owed to residents"
          highlight={maintenanceFund.advanceCredit > 0 ? "danger" : undefined}
        />
        {projectFunds.total > 0.5 && (
          <SummaryCard
            label="Project Funds"
            value={fmt(projectFunds.total)}
            icon={<Target className="h-5 w-5 text-brand-primary" />}
            subtitle={`${projectFunds.projects.length} active project${projectFunds.projects.length !== 1 ? "s" : ""}`}
          />
        )}
        {separateFunds.total > 0.5 && (
          <SummaryCard
            label="Separate / Earmarked"
            value={fmt(separateFunds.total)}
            icon={<Layers className="h-5 w-5 text-brand-primary" />}
            subtitle={`${separateFunds.items.length} fund${separateFunds.items.length !== 1 ? "s" : ""}`}
          />
        )}
      </div>

      {/* Collection Summary */}
      {cs && cs.cycles.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              label="Expected (Active FY)"
              value={fmt(cs.expectedAllTime)}
              icon={<Target className="h-5 w-5 text-brand-primary" />}
              subtitle="Total expected across cycles"
            />
            <SummaryCard
              label="Collected (Active FY)"
              value={fmt(cs.collectedAllTime)}
              icon={<TrendingUp className="h-5 w-5 text-brand-success" />}
              subtitle="Total collected across cycles"
              highlight={cs.collectedAllTime >= cs.expectedAllTime ? "success" : undefined}
            />
            <SummaryCard
              label="Collection Rate"
              value={`${cs.collectionRate}%`}
              icon={<BarChart3 className="h-5 w-5 text-brand-primary" />}
              subtitle={cs.collectionRate >= 90 ? "Healthy" : cs.collectionRate >= 70 ? "Needs attention" : "Low collection"}
              highlight={cs.collectionRate >= 90 ? "success" : cs.collectionRate < 70 ? "danger" : undefined}
            />
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-fg-primary mb-4 flex items-center gap-2">
              <div className="h-3 w-1 rounded-full bg-brand-primary" />
              Collection Summary by Cycle
            </h3>
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th scope="col" className="table-th">Cycle</th>
                    <th scope="col" className="table-th text-right">Expected</th>
                    <th scope="col" className="table-th text-right">Collected</th>
                    <th scope="col" className="table-th text-right">Expenses</th>
                    <th scope="col" className="table-th text-right">Net</th>
                    <th scope="col" className="table-th text-right">Rate</th>
                    <th scope="col" className="table-th text-right">Paid</th>
                    <th scope="col" className="table-th text-right">Unpaid</th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y">
                  {cs.cycles.map((c) => (
                    <tr key={c.cycleId} className="table-row">
                      <td className="table-td font-medium whitespace-nowrap">
                        {c.title}
                      </td>
                      <td className="table-td text-right">{fmt(c.totalExpected)}</td>
                      <td className="table-td text-right">{fmt(c.totalCollected)}</td>
                      <td className="table-td text-right">{fmt(c.totalExpense)}</td>
                      <td className={`table-td text-right font-medium ${c.net >= 0 ? "text-brand-success" : "text-brand-danger"}`}>
                        {c.net >= 0 ? "+" : ""}{fmt(c.net)}
                      </td>
                      <td className={`table-td text-right ${c.collectionRate >= 90 ? "text-brand-success" : c.collectionRate < 70 ? "text-brand-danger" : "text-fg-primary"}`}>
                        {c.collectionRate}%
                      </td>
                      <td className="table-td text-right text-brand-success">{c.paidCount}</td>
                      <td className="table-td text-right text-brand-danger">{c.unpaidCount}</td>
                    </tr>
                  ))}
                  <tr className="table-row font-bold bg-surface-elevated">
                    <td className="table-td">Total</td>
                    <td className="table-td text-right">{fmt(cs.expectedAllTime)}</td>
                    <td className="table-td text-right">{fmt(cs.collectedAllTime)}</td>
                    <td className="table-td text-right">
                      {fmt(cs.cycles.reduce((s, c) => s + c.totalExpense, 0))}
                    </td>
                    <td className={`table-td text-right ${cs.collectedAllTime - cs.cycles.reduce((s, c) => s + c.totalExpense, 0) >= 0 ? "text-brand-success" : "text-brand-danger"}`}>
                      {(() => { const net = cs.collectedAllTime - cs.cycles.reduce((s, c) => s + c.totalExpense, 0); return `${net >= 0 ? "+" : ""}${fmt(net)}`; })()}
                    </td>
                    <td className="table-td text-right">{cs.collectionRate}%</td>
                    <td className="table-td text-right text-brand-success">
                      {cs.cycles.reduce((s, c) => s + c.paidCount, 0)}
                    </td>
                    <td className="table-td text-right text-brand-danger">
                      {cs.cycles.reduce((s, c) => s + c.unpaidCount, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Maintenance Fund Details */}
      <div className="card p-6">
        <h3 className="font-semibold text-fg-primary mb-4 flex items-center gap-2">
          <div className="h-3 w-1 rounded-full bg-brand-success" />
          Maintenance Fund Breakdown
        </h3>
        <div className="space-y-3">
          <StatementRow label="Cash Inflow (Maintenance Payments)" value={fmt(maintenanceFund.cashInflow)} />
          <StatementRow label="Additional Funds (Merged)" value={fmt(maintenanceFund.additionalMergedInflow)} />
          <StatementRow label="Total Expenses" value={`- ${fmt(maintenanceFund.totalExpenses)}`} />
          <div className="border-t border-border pt-3">
            <StatementRow label="Maintenance Fund Balance" value={fmt(maintenanceFund.balance)} bold />
          </div>
          <StatementRow label="Less: Advance Credit (Liability)" value={`- ${fmt(maintenanceFund.advanceCredit)}`} muted />
          <div className="border-t border-border pt-3">
            <StatementRow label="Spendable Maintenance" value={fmt(maintenanceFund.spendable)} bold />
          </div>
        </div>
      </div>

      {/* Project Funds Table */}
      {projectFunds.projects.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-fg-primary mb-4 flex items-center gap-2">
            <div className="h-3 w-1 rounded-full bg-brand-primary" />
            Project Funds
          </h3>
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th scope="col" className="table-th">Project</th>
                  <th scope="col" className="table-th text-right">Collected</th>
                  <th scope="col" className="table-th text-right">Spent</th>
                  <th scope="col" className="table-th text-right">Balance</th>
                  <th scope="col" className="table-th text-right">Target</th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y">
                {projectFunds.projects.map((p) => (
                  <tr key={p.id} className="table-row">
                    <td className="table-td font-medium">{p.title}</td>
                    <td className="table-td text-right">{fmt(p.collected)}</td>
                    <td className="table-td text-right">{fmt(p.spent)}</td>
                    <td className="table-td text-right font-medium text-brand-success">{fmt(p.balance)}</td>
                    <td className="table-td text-right text-fg-secondary">{fmt(p.target)}</td>
                  </tr>
                ))}
                <tr className="table-row font-bold bg-surface-elevated">
                  <td className="table-td">Total</td>
                  <td className="table-td text-right">
                    {fmt(projectFunds.projects.reduce((s, p) => s + p.collected, 0))}
                  </td>
                  <td className="table-td text-right">
                    {fmt(projectFunds.projects.reduce((s, p) => s + p.spent, 0))}
                  </td>
                  <td className="table-td text-right text-brand-success">{fmt(projectFunds.total)}</td>
                  <td className="table-td text-right text-fg-secondary">
                    {fmt(projectFunds.projects.reduce((s, p) => s + p.target, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Separate / Earmarked Funds Table */}
      {separateFunds.items.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-fg-primary mb-4 flex items-center gap-2">
            <div className="h-3 w-1 rounded-full bg-pending-fg" />
            Separate / Earmarked Funds
          </h3>
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th scope="col" className="table-th">Title</th>
                  <th scope="col" className="table-th text-right">Amount</th>
                  <th scope="col" className="table-th">Source</th>
                  <th scope="col" className="table-th">Received</th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y">
                {separateFunds.items.map((f) => (
                  <tr key={f.id} className="table-row">
                    <td className="table-td font-medium">{f.title}</td>
                    <td className="table-td text-right">{fmt(f.amount)}</td>
                    <td className="table-td text-fg-secondary">{f.source ?? "—"}</td>
                    <td className="table-td text-fg-secondary">
                      {new Date(f.receivedDate).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
                <tr className="table-row font-bold bg-surface-elevated">
                  <td className="table-td">Total</td>
                  <td className="table-td text-right">{fmt(separateFunds.total)}</td>
                  <td className="table-td" colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bank Balance Validation */}
      <div className={`card p-5 border-l-4 ${isBalanced ? "border-l-brand-success" : "border-l-brand-danger"}`}>
        <div className="flex items-center gap-3 mb-4">
          {isBalanced
            ? <CheckCircle2 className="h-5 w-5 text-brand-success" />
            : <AlertTriangle className="h-5 w-5 text-brand-danger" />}
          <h3 className="font-semibold text-fg-primary">
            {isBalanced ? "Bank Balance Reconciliation" : "Balance Mismatch Detected"}
          </h3>
        </div>
        <div className="space-y-2">
          <StatementRow label="Maintenance Fund" value={fmt(maintenanceFund.balance)} />
          {projectFunds.total > 0.5 && (
            <StatementRow label="Project Funds" value={fmt(projectFunds.total)} />
          )}
          {separateFunds.total > 0.5 && (
            <StatementRow label="Separate / Earmarked Funds" value={fmt(separateFunds.total)} />
          )}
          <div className="border-t border-border pt-3">
            <StatementRow label="Computed Bank Balance" value={fmt(computedBankBalance)} bold />
          </div>
          {outstandingDues > 0 && (
            <div className="pt-2">
              <StatementRow label="Outstanding Dues (Receivable)" value={fmt(outstandingDues)} muted />
            </div>
          )}
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
