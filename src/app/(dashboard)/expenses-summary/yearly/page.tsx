'use client';

import { useState, useEffect } from 'react';
import { Download, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { showToast } from '@/components/Toast';
import { parseApiError } from "@/utils/errorHandler";

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function YearlySummaryPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<any>(null);
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [year]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch yearly summary
      const summaryRes = await api.get(`/expenses/summary/yearly?year=${year}`);
      const summaryData = summaryRes.data;
      setSummary(summaryData);

      // Fetch top categories
      const topCatRes = await api.get(`/expenses/analytics/top-categories?year=${year}&limit=10`);
      const topCatData = topCatRes.data ?? [];
      setTopCategories(topCatData);
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      showToast(parseApiError(error, "Failed to fetch yearly expense summary").message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportYearlyReport = () => {
    const data = {
      year,
      yearlyTotal: summary?.yearlyTotal,
      monthlySummaries: summary?.monthlySummaries,
      topCategories
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yearly-expense-summary-${year}.json`;
    a.click();
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner w-10 h-10"></div>
        <p className="loading-state-text">Loading yearly summary...</p>
      </div>
    );
  }

  const monthlySummaries = summary?.monthlySummaries || [];
  const yearlyTotal = summary?.yearlyTotal || {};
  const maxMonthlyExpense = Math.max(...monthlySummaries.map((m: any) => m.totalExpenses), 1);

  // Calculate comparisons
  const avgPerMonth = yearlyTotal.totalExpenses / Math.max(monthlySummaries.length, 1);
  const highestMonth = monthlySummaries.reduce(
    (max: any, m: any) => (m.totalExpenses > max.totalExpenses ? m : max),
    monthlySummaries[0] || { totalExpenses: 0, month: 1 }
  );
  const lowestMonth = monthlySummaries.reduce(
    (min: any, m: any) => (m.totalExpenses < min.totalExpenses ? m : min),
    monthlySummaries[0] || { totalExpenses: 0, month: 1 }
  );

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

      {/* Year Selector */}
      <div className="filter-bar mb-6">
        <div className="flex items-center gap-4">
          <Calendar size={20} className="text-fg-secondary" />
          <span className="font-medium text-fg-primary">Select Year:</span>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="input"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Yearly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <div className="md:col-span-2 stat-card bg-gradient-to-br from-brand-primary to-brand-primary-hover text-white">
          <div className="stat-card-label opacity-90">Total Expenses ({year})</div>
          <div className="stat-card-value text-4xl text-white">
            ₹{yearlyTotal.totalExpenses?.toLocaleString() || 0}
          </div>
          <div className="text-sm opacity-75">
            {yearlyTotal.expenseCount || 0} entries across {monthlySummaries.length} months
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">Average/Month</div>
          <div className="stat-card-value">
            ₹{Math.round(avgPerMonth).toLocaleString()}
          </div>
          <div className="text-xs text-fg-secondary mt-2">
            {monthlySummaries.length} months recorded
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
            {MONTHS[highestMonth?.month - 1]} {year}
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
            {MONTHS[lowestMonth?.month - 1]} {year}
          </div>
        </div>
      </div>

      {/* Month-by-Month Breakdown */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-fg-primary">
            Month-by-Month Breakdown ({year})
          </h2>
        </div>
        <div className="card-body">
          {monthlySummaries.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📅</span>
              <p className="empty-state-title">No expenses recorded</p>
              <p className="empty-state-text">No expenses recorded for {year}.</p>
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
                  {MONTHS.map((monthName, index) => {
                    const monthData = monthlySummaries.find((m: any) => m.month === index + 1);
                    const prevMonthData = monthlySummaries.find((m: any) => m.month === index);

                    if (!monthData) {
                      return (
                        <tr key={index} className="bg-surface-background">
                          <td className="table-td text-fg-secondary">{monthName}</td>
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
                      <tr key={index} className="table-row">
                        <td className="table-td font-medium text-fg-primary">
                          {monthName}
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
                    <td className="table-td text-fg-primary">Total ({year})</td>
                    <td className="table-td text-right text-fg-primary">
                      ₹{yearlyTotal.totalExpenses?.toLocaleString() || 0}
                    </td>
                    <td className="table-td text-right text-fg-secondary">-</td>
                    <td className="table-td text-right text-fg-primary">
                      {yearlyTotal.expenseCount || 0}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Top Categories for the Year */}
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-fg-primary">
            Top Categories ({year})
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
                          style={{ backgroundColor: cat.categoryColor || '#3B82F6' }}
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
                          backgroundColor: cat.categoryColor || '#3B82F6'
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
