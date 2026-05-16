'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, Download, Calendar } from 'lucide-react';
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

interface CategoryBreakdown {
  categoryName: string;
  categoryColor: string;
  totalAmount: number;
  count: number;
}

interface MonthlySummary {
  totalExpenses: number;
  expenseCount: number;
  totalGST: number;
  totalTDS: number;
  netAmount: number;
}

interface TrendRow {
  month: number;
  year: number;
  totalExpenses: number;
  expenseCount: number;
}

export default function MonthlySummaryPage() {
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [selectedFyId, setSelectedFyId] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch FY list on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/v1/admin/financial-years');
        const fys: FinancialYear[] = r.data.financialYears ?? [];
        setFinancialYears(fys);

        // Auto-select FY that contains today
        const today = new Date();
        const matchedFy = fys.find(fy => {
          const start = new Date(fy.startDate);
          const end = new Date(fy.endDate);
          return today >= start && today <= end;
        });
        if (matchedFy) {
          setSelectedFyId(matchedFy.id);
        } else if (fys.length > 0) {
          // Pick the most recent FY
          const sorted = [...fys].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
          setSelectedFyId(sorted[0].id);
        }
      } catch (error: unknown) {
        console.error('Error fetching financial years:', error);
      }
    })();
  }, []);

  // Generate month options from selected FY's date range
  const monthOptions = useMemo(() => {
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
        label: cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return rows;
  }, [financialYears, selectedFyId]);

  // When FY changes, auto-select current month if it falls within FY, else first month
  useEffect(() => {
    if (monthOptions.length === 0) return;
    const now = new Date();
    const currentMatch = monthOptions.find(o => o.month === now.getMonth() + 1 && o.year === now.getFullYear());
    if (currentMatch) {
      setMonth(currentMatch.month);
      setYear(currentMatch.year);
    } else {
      setMonth(monthOptions[0].month);
      setYear(monthOptions[0].year);
    }
  }, [monthOptions]);

  const fetchData = useCallback(async () => {
    if (!selectedFyId) return;
    try {
      setLoading(true);

      const [summaryRes, breakdownRes, trendsRes] = await Promise.all([
        api.get(`/expenses/summary/monthly?month=${month}&year=${year}`),
        api.get(`/expenses/summary/category-breakdown?month=${month}&year=${year}&financialYearId=${selectedFyId}`),
        api.get(`/expenses/analytics/trends?financialYearId=${selectedFyId}`),
      ]);

      setSummary(summaryRes.data);
      setCategoryBreakdown(breakdownRes.data ?? []);
      setTrends(trendsRes.data ?? []);
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      showToast(parseApiError(error, "Failed to fetch expense summary").message, 'error');
    } finally {
      setLoading(false);
    }
  }, [month, year, selectedFyId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const selectedFyLabel = financialYears.find(fy => fy.id === selectedFyId)?.label ?? '';
  const selectedMonthLabel = monthOptions.find(o => o.month === month && o.year === year)?.label ?? `${MONTHS[month - 1]} ${year}`;

  const exportReport = () => {
    const data = {
      period: selectedMonthLabel,
      financialYear: selectedFyLabel,
      totalExpenses: summary?.totalExpenses || 0,
      categoryBreakdown
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-summary-${selectedFyLabel}-${month}-${year}.json`;
    a.click();
  };

  const maxTrendValue = Math.max(...trends.map(t => t.totalExpenses), 1);
  const summaryTotals = summary ?? { totalExpenses: 0, expenseCount: 0, totalGST: 0, totalTDS: 0, netAmount: 0 };

  if (loading && financialYears.length === 0) {
    return (
      <div className="loading-state">
        <div className="loading-spinner w-10 h-10"></div>
        <p className="loading-state-text">Loading summary...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="page-action-bar mb-6">
        <div>
          <h1 className="text-3xl font-bold text-fg-primary">Monthly Expense Summary</h1>
          <p className="text-fg-secondary mt-1">Detailed breakdown of society expenses</p>
        </div>
        <button
          onClick={exportReport}
          className="btn btn-success flex items-center gap-2"
        >
          <Download size={20} />
          Export Report
        </button>
      </div>

      {/* Period Selector — FY + Month */}
      <div className="filter-bar mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Calendar size={20} className="text-fg-secondary" />
          <span className="font-medium text-fg-primary">Select Period:</span>
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
          <select
            value={`${month}-${year}`}
            onChange={(e) => {
              const [m, y] = e.target.value.split('-').map(Number);
              setMonth(m);
              setYear(y);
            }}
            className="input"
            disabled={monthOptions.length === 0}
          >
            {monthOptions.map(opt => (
              <option key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner w-10 h-10"></div>
          <p className="loading-state-text">Loading summary...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="stat-card bg-gradient-to-br from-brand-primary to-brand-primary text-white">
              <div className="stat-card-label opacity-90">Total Expenses</div>
              <div className="stat-card-value text-3xl text-white">
                ₹{(summary?.totalExpenses || 0).toLocaleString()}
              </div>
              <div className="text-sm opacity-75 mt-2">
                {summary?.expenseCount || 0} entries
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-label">GST Paid</div>
              <div className="stat-card-value">
                ₹{(summary?.totalGST || 0).toLocaleString()}
              </div>
              <div className="text-xs text-fg-secondary mt-2">
                {summaryTotals.totalGST > 0 ? `${((summaryTotals.totalGST / Math.max(summaryTotals.totalExpenses, 1)) * 100).toFixed(1)}% of base` : '-'}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-label">TDS Deducted</div>
              <div className="stat-card-value">
                ₹{(summary?.totalTDS || 0).toLocaleString()}
              </div>
              <div className="text-xs text-fg-secondary mt-2">
                {summaryTotals.totalTDS > 0 ? `${((summaryTotals.totalTDS / Math.max(summaryTotals.totalExpenses, 1)) * 100).toFixed(1)}% of base` : '-'}
              </div>
            </div>

            <div className="stat-card bg-gradient-to-br from-approved-solid to-approved-solid text-white">
              <div className="stat-card-label opacity-90">Net Amount</div>
              <div className="stat-card-value text-white">
                ₹{(summary?.netAmount || 0).toLocaleString()}
              </div>
              <div className="text-xs opacity-75 mt-2">After GST & TDS</div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-fg-primary">
                  Category Breakdown ({selectedMonthLabel})
                </h2>
              </div>
              <div className="card-body">
                {categoryBreakdown.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-state-icon">📊</span>
                    <p className="empty-state-title">No expenses found</p>
                    <p className="empty-state-text">No expenses found for this period.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categoryBreakdown.map((cat, index) => {
                      const percentage = ((cat.totalAmount / (summary?.totalExpenses || 1)) * 100).toFixed(1);
                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-fg-primary">
                              {cat.categoryName}
                            </span>
                            <span className="text-sm text-fg-secondary">
                              ₹{cat.totalAmount.toLocaleString()} ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-surface-elevated rounded-full h-3">
                            <div
                              className="h-3 rounded-full transition-all"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: cat.categoryColor || lightTheme.brand.primary
                              }}
                            />
                          </div>
                          <div className="text-xs text-fg-secondary">
                            {cat.count} {cat.count === 1 ? 'entry' : 'entries'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-fg-primary">
                  Top Categories
                </h2>
              </div>
              <div className="card-body">
                {categoryBreakdown.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-state-icon">📋</span>
                    <p className="empty-state-title">No data available</p>
                    <p className="empty-state-text">Add expenses to see category rankings.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categoryBreakdown
                      .sort((a, b) => b.totalAmount - a.totalAmount)
                      .slice(0, 10)
                      .map((cat, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 hover:bg-surface-background rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-2xl font-bold text-fg-tertiary">
                              #{index + 1}
                            </div>
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cat.categoryColor || lightTheme.brand.primary }}
                            />
                            <div>
                              <div className="font-medium text-fg-primary">
                                {cat.categoryName}
                              </div>
                              <div className="text-xs text-fg-secondary">
                                {cat.count} {cat.count === 1 ? 'entry' : 'entries'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-fg-primary">
                              ₹{cat.totalAmount.toLocaleString()}
                            </div>
                            <div className="text-xs text-fg-secondary">
                              {((cat.totalAmount / (summary?.totalExpenses || 1)) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expense Trends (FY months) */}
          <div className="card mb-6">
            <div className="card-header">
              <div className="flex items-center justify-between w-full">
                <div>
                  <h2 className="text-lg font-semibold text-fg-primary">
                    Expense Trends
                  </h2>
                  <p className="text-sm text-fg-secondary">{selectedFyLabel} month-wise comparison</p>
                </div>
                <TrendingUp className="text-brand-primary" size={24} />
              </div>
            </div>
            <div className="card-body">
              {trends.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon">📈</span>
                  <p className="empty-state-title">No trend data available</p>
                  <p className="empty-state-text">Add expenses over multiple months to see trends.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {trends.map((trend, index) => {
                    const barWidth = (trend.totalExpenses / maxTrendValue) * 100;
                    const isCurrentMonth = trend.month === month && trend.year === year;

                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-4 p-2 rounded ${
                          isCurrentMonth ? 'bg-brand-primary-light' : ''
                        }`}
                      >
                        <div className="w-24 text-sm text-fg-secondary">
                          {MONTHS[trend.month - 1].substring(0, 3)} {trend.year}
                        </div>
                        <div className="flex-1">
                          <div className="w-full bg-surface-elevated rounded-full h-8 relative">
                            <div
                              className={`h-8 rounded-full transition-all ${
                                isCurrentMonth ? 'bg-brand-primary' : 'bg-info-solid'
                              }`}
                              style={{ width: `${barWidth}%` }}
                            >
                              {trend.totalExpenses > 0 && (
                                <span className="absolute left-2 top-1 text-sm font-medium text-white">
                                  ₹{trend.totalExpenses.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="w-16 text-right text-sm text-fg-secondary">
                          {trend.expenseCount}
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
          href="/expenses-summary/yearly"
          className="text-brand-primary hover:text-brand-primary font-medium"
        >
          View Yearly Summary →
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
