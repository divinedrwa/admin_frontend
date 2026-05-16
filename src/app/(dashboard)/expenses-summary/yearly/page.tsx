'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { showToast } from '@/components/Toast';
import { parseApiError } from "@/utils/errorHandler";
import { lightTheme } from "@/theme/tokens";

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type FinancialYear = { id: string; label: string; startDate: string; endDate: string };

type MonthlySummaryRow = {
  month: number;
  year: number;
  totalExpenses: number;
  expenseCount: number;
};

type YearlyTotal = {
  totalExpenses: number;
  totalGST: number;
  totalTDS: number;
  netAmount: number;
  expenseCount: number;
};

type TopCategoryRow = {
  categoryName: string;
  categoryColor?: string;
  totalAmount: number;
  count: number;
};

export default function YearlySummaryPage() {
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [selectedFyId, setSelectedFyId] = useState('');
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummaryRow[]>([]);
  const [yearlyTotal, setYearlyTotal] = useState<YearlyTotal>({ totalExpenses: 0, totalGST: 0, totalTDS: 0, netAmount: 0, expenseCount: 0 });
  const [topCategories, setTopCategories] = useState<TopCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch FY list on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/v1/admin/financial-years');
        const fys: FinancialYear[] = r.data.financialYears ?? [];
        setFinancialYears(fys);

        const today = new Date();
        const matchedFy = fys.find(fy => {
          const start = new Date(fy.startDate);
          const end = new Date(fy.endDate);
          return today >= start && today <= end;
        });
        if (matchedFy) {
          setSelectedFyId(matchedFy.id);
        } else if (fys.length > 0) {
          const sorted = [...fys].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
          setSelectedFyId(sorted[0].id);
        }
      } catch (error: unknown) {
        console.error('Error fetching financial years:', error);
      }
    })();
  }, []);

  // FY months for table row rendering
  const fyMonths = useMemo(() => {
    const fy = financialYears.find(x => x.id === selectedFyId);
    if (!fy) return [];
    const start = new Date(fy.startDate);
    const end = new Date(fy.endDate);
    const rows: { month: number; year: number; label: string }[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      rows.push({
        month: cursor.getMonth() + 1,
        year: cursor.getFullYear(),
        label: `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return rows;
  }, [financialYears, selectedFyId]);

  const fetchData = useCallback(async () => {
    if (!selectedFyId) return;
    try {
      setLoading(true);

      const [summaryRes, topCatRes] = await Promise.all([
        api.get(`/expenses/summary/yearly?financialYearId=${selectedFyId}`),
        api.get(`/expenses/analytics/top-categories?financialYearId=${selectedFyId}&limit=10`),
      ]);

      setMonthlySummaries(summaryRes.data.monthlySummaries ?? []);
      setYearlyTotal(summaryRes.data.yearlyTotal ?? { totalExpenses: 0, totalGST: 0, totalTDS: 0, netAmount: 0, expenseCount: 0 });
      setTopCategories(topCatRes.data ?? []);
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      showToast(parseApiError(error, "Failed to fetch yearly expense summary").message, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedFyId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const selectedFyLabel = financialYears.find(fy => fy.id === selectedFyId)?.label ?? '';

  const exportYearlyReport = () => {
    const data = {
      financialYear: selectedFyLabel,
      yearlyTotal,
      monthlySummaries,
      topCategories
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yearly-expense-summary-${selectedFyLabel}.json`;
    a.click();
  };

  const maxMonthlyExpense = Math.max(...monthlySummaries.map((m) => m.totalExpenses), 1);

  const activeMonths = monthlySummaries.filter(m => m.expenseCount > 0);
  const avgPerMonth = activeMonths.length > 0 ? yearlyTotal.totalExpenses / activeMonths.length : 0;
  const highestMonth = activeMonths.length > 0
    ? activeMonths.reduce((max, m) => (m.totalExpenses > max.totalExpenses ? m : max), activeMonths[0])
    : null;
  const lowestMonth = activeMonths.length > 0
    ? activeMonths.reduce((min, m) => (m.totalExpenses < min.totalExpenses ? m : min), activeMonths[0])
    : null;

  if (loading && financialYears.length === 0) {
    return (
      <div className="loading-state">
        <div className="loading-spinner w-10 h-10"></div>
        <p className="loading-state-text">Loading yearly summary...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="page-action-bar mb-6">
        <div>
          <h1 className="text-3xl font-bold text-fg-primary">Yearly Expense Report</h1>
          <p className="text-fg-secondary mt-1">Comprehensive annual expense analysis</p>
        </div>
        <button
          onClick={exportYearlyReport}
          className="btn btn-success flex items-center gap-2"
        >
          <Download size={20} />
          Export Report
        </button>
      </div>

      {/* FY Selector */}
      <div className="filter-bar mb-6">
        <div className="flex items-center gap-4">
          <Calendar size={20} className="text-fg-secondary" />
          <span className="font-medium text-fg-primary">Financial Year:</span>
          <select
            value={selectedFyId}
            onChange={(e) => setSelectedFyId(e.target.value)}
            className="input"
          >
            <option value="">Select Financial Year</option>
            {[...financialYears]
              .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
              .map(fy => (
                <option key={fy.id} value={fy.id}>{fy.label}</option>
              ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner w-10 h-10"></div>
          <p className="loading-state-text">Loading yearly summary...</p>
        </div>
      ) : (
        <>
          {/* Yearly Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
            <div className="md:col-span-2 stat-card bg-gradient-to-br from-brand-primary to-brand-primary-hover text-white">
              <div className="stat-card-label opacity-90">Total Expenses ({selectedFyLabel})</div>
              <div className="stat-card-value text-4xl text-white">
                ₹{yearlyTotal.totalExpenses.toLocaleString()}
              </div>
              <div className="text-sm opacity-75">
                {yearlyTotal.expenseCount} entries across {activeMonths.length} months
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-label">Average/Month</div>
              <div className="stat-card-value">
                ₹{Math.round(avgPerMonth).toLocaleString()}
              </div>
              <div className="text-xs text-fg-secondary mt-2">
                {activeMonths.length} months with expenses
              </div>
            </div>

            <div className="stat-card bg-approved-bg">
              <div className="stat-card-label flex items-center gap-2 text-approved-solid">
                <TrendingUp size={16} />
                Highest Month
              </div>
              <div className="stat-card-value text-approved-fg text-xl">
                ₹{highestMonth?.totalExpenses?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-approved-solid mt-2">
                {highestMonth ? `${MONTHS[highestMonth.month - 1]} ${highestMonth.year}` : '-'}
              </div>
            </div>

            <div className="stat-card bg-brand-primary-light">
              <div className="stat-card-label flex items-center gap-2 text-brand-primary">
                <TrendingDown size={16} />
                Lowest Month
              </div>
              <div className="stat-card-value text-info-fg text-xl">
                ₹{lowestMonth?.totalExpenses?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-brand-primary mt-2">
                {lowestMonth ? `${MONTHS[lowestMonth.month - 1]} ${lowestMonth.year}` : '-'}
              </div>
            </div>
          </div>

          {/* Month-by-Month Breakdown */}
          <div className="card mb-6">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-fg-primary">
                Month-by-Month Breakdown ({selectedFyLabel})
              </h2>
            </div>
            <div className="card-body">
              {fyMonths.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon">📅</span>
                  <p className="empty-state-title">No financial year selected</p>
                  <p className="empty-state-text">Select a financial year to view the breakdown.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-head">
                      <tr>
                        <th className="table-th">Month</th>
                        <th className="table-th text-right">Total Expenses</th>
                        <th className="table-th text-right">vs Previous</th>
                        <th className="table-th text-right">Entries</th>
                        <th className="table-th text-right">Visual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {fyMonths.map((fm, index) => {
                        const monthData = monthlySummaries.find(
                          (m) => m.month === fm.month && m.year === fm.year
                        );
                        const prevFm = index > 0 ? fyMonths[index - 1] : null;
                        const prevMonthData = prevFm
                          ? monthlySummaries.find(m => m.month === prevFm.month && m.year === prevFm.year)
                          : null;

                        if (!monthData || monthData.expenseCount === 0) {
                          return (
                            <tr key={`${fm.month}-${fm.year}`} className="bg-surface-background">
                              <td className="table-td text-fg-secondary">{fm.label}</td>
                              <td colSpan={4} className="table-td text-center text-fg-tertiary">
                                No data
                              </td>
                            </tr>
                          );
                        }

                        const prevTotal = prevMonthData?.totalExpenses || 0;
                        const change = prevTotal > 0
                          ? ((monthData.totalExpenses - prevTotal) / prevTotal) * 100
                          : 0;
                        const barWidth = (monthData.totalExpenses / maxMonthlyExpense) * 100;

                        return (
                          <tr key={`${fm.month}-${fm.year}`} className="table-row">
                            <td className="table-td font-medium text-fg-primary">
                              {fm.label}
                            </td>
                            <td className="table-td text-right font-semibold text-fg-primary">
                              ₹{monthData.totalExpenses.toLocaleString()}
                            </td>
                            <td className="table-td text-right">
                              {prevTotal === 0 ? (
                                <span className="text-fg-tertiary">-</span>
                              ) : (
                                <span className={change >= 0 ? 'text-brand-danger' : 'text-approved-solid'}>
                                  {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                                </span>
                              )}
                            </td>
                            <td className="table-td text-right text-fg-secondary">
                              {monthData.expenseCount}
                            </td>
                            <td className="table-td">
                              <div className="w-full bg-surface-elevated rounded-full h-2">
                                <div
                                  className="bg-brand-primary h-2 rounded-full"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-surface-elevated font-semibold">
                      <tr>
                        <td className="table-td text-fg-primary">Total ({selectedFyLabel})</td>
                        <td className="table-td text-right text-fg-primary">
                          ₹{yearlyTotal.totalExpenses.toLocaleString()}
                        </td>
                        <td className="table-td text-right text-fg-secondary">-</td>
                        <td className="table-td text-right text-fg-primary">
                          {yearlyTotal.expenseCount}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Top Categories for the FY */}
          <div className="card mb-6">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-fg-primary">
                Top Categories ({selectedFyLabel})
              </h2>
            </div>
            <div className="card-body">
              {topCategories.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon">📊</span>
                  <p className="empty-state-title">No category data available</p>
                  <p className="empty-state-text">Add expenses to see category rankings.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topCategories.map((cat, index) => {
                    const percentage = ((cat.totalAmount / (yearlyTotal.totalExpenses || 1)) * 100).toFixed(1);
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="text-xl font-bold text-fg-tertiary w-8">
                              #{index + 1}
                            </div>
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: cat.categoryColor || lightTheme.brand.primary }}
                            />
                            <span className="font-medium text-fg-primary">{cat.categoryName}</span>
                            <span className="text-sm text-fg-secondary">({cat.count} entries)</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-fg-primary">
                              ₹{cat.totalAmount?.toLocaleString() || 0}
                            </div>
                            <div className="text-xs text-fg-secondary">{percentage}%</div>
                          </div>
                        </div>
                        <div className="w-full bg-surface-elevated rounded-full h-3">
                          <div
                            className="h-3 rounded-full"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: cat.categoryColor || lightTheme.brand.primary
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Link
          href="/expenses"
          className="text-brand-primary hover:text-brand-primary font-medium"
        >
          View All Expenses →
        </Link>
        <Link
          href="/expenses/add"
          className="text-brand-primary hover:text-brand-primary font-medium"
        >
          Add New Expense →
        </Link>
        <Link
          href="/expenses-summary"
          className="text-brand-primary hover:text-brand-primary font-medium"
        >
          View Monthly Summary →
        </Link>
        <Link
          href="/expense-categories"
          className="text-brand-primary hover:text-brand-primary font-medium"
        >
          Manage Categories →
        </Link>
      </div>
    </div>
  );
}
