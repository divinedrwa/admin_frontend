'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Download, Calendar } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { showToast } from '@/components/Toast';
import { parseApiError } from "@/utils/errorHandler";

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface CategoryBreakdown {
  categoryName: string;
  categoryColor: string;
  totalAmount: number;
  count: number;
}

export default function MonthlySummaryPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<any>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch monthly summary
      const summaryRes = await api.get(`/expenses/summary/monthly?month=${month}&year=${year}`);
      const summaryData = summaryRes.data;
      setSummary(summaryData);
      
      // Fetch category breakdown
      const breakdownRes = await api.get(`/expenses/summary/category-breakdown?month=${month}&year=${year}`);
      const breakdownData = breakdownRes.data ?? [];
      setCategoryBreakdown(breakdownData);
      
      // Fetch trends (last 12 months)
      const trendsRes = await api.get('/expenses/analytics/trends');
      const trendsData = trendsRes.data ?? [];
      setTrends(trendsData);
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      showToast(parseApiError(error, "Failed to fetch expense summary").message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const data = {
      period: `${MONTHS[month - 1]} ${year}`,
      totalExpenses: summary?.totalExpenses || 0,
      categoryBreakdown
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-summary-${year}-${month}.json`;
    a.click();
  };

  const maxTrendValue = Math.max(...trends.map(t => t.totalExpenses), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading summary...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Monthly Expense Summary</h1>
          <p className="text-gray-600 mt-1">Detailed breakdown of society expenses</p>
        </div>
        <button
          onClick={exportReport}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Download size={20} />
          Export Report
        </button>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <Calendar size={20} className="text-gray-600" />
          <span className="font-medium text-gray-900">Select Period:</span>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg"
          >
            {MONTHS.map((m, index) => (
              <option key={index} value={index + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6">
          <div className="text-sm opacity-90 mb-1">Total Expenses</div>
          <div className="text-3xl font-bold">
            ₹{(summary?.totalExpenses || 0).toLocaleString()}
          </div>
          <div className="text-sm opacity-75 mt-2">
            {summary?.expenseCount || 0} entries
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">GST Paid</div>
          <div className="text-2xl font-bold text-gray-900">
            ₹{(summary?.totalGST || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {summary?.totalGST > 0 ? `${((summary.totalGST / summary.totalExpenses) * 100).toFixed(1)}% of base` : '-'}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">TDS Deducted</div>
          <div className="text-2xl font-bold text-gray-900">
            ₹{(summary?.totalTDS || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {summary?.totalTDS > 0 ? `${((summary.totalTDS / summary.totalExpenses) * 100).toFixed(1)}% of base` : '-'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-6">
          <div className="text-sm opacity-90 mb-1">Net Amount</div>
          <div className="text-2xl font-bold">
            ₹{(summary?.netAmount || 0).toLocaleString()}
          </div>
          <div className="text-xs opacity-75 mt-2">After GST & TDS</div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pie Chart (Visual) */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Category Breakdown ({MONTHS[month - 1]} {year})
          </h2>

          {categoryBreakdown.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              No expenses found for this period
            </div>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((cat, index) => {
                const percentage = ((cat.totalAmount / (summary?.totalExpenses || 1)) * 100).toFixed(1);
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">
                        {cat.categoryName}
                      </span>
                      <span className="text-sm text-gray-600">
                        ₹{cat.totalAmount.toLocaleString()} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: cat.categoryColor || '#3B82F6'
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      {cat.count} {cat.count === 1 ? 'entry' : 'entries'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Categories Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Top Categories
          </h2>

          {categoryBreakdown.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              No data available
            </div>
          ) : (
            <div className="space-y-2">
              {categoryBreakdown
                .sort((a, b) => b.totalAmount - a.totalAmount)
                .slice(0, 10)
                .map((cat, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-gray-400">
                        #{index + 1}
                      </div>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.categoryColor || '#3B82F6' }}
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {cat.categoryName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {cat.count} {cat.count === 1 ? 'entry' : 'entries'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        ₹{cat.totalAmount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {((cat.totalAmount / (summary?.totalExpenses || 1)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Expense Trends (Last 12 Months) */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Expense Trends
            </h2>
            <p className="text-sm text-gray-600">Last 12 months comparison</p>
          </div>
          <TrendingUp className="text-blue-600" size={24} />
        </div>

        {trends.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No trend data available
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
                    isCurrentMonth ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="w-24 text-sm text-gray-600">
                    {MONTHS[trend.month - 1].substring(0, 3)} {trend.year}
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-8 relative">
                      <div
                        className={`h-8 rounded-full transition-all ${
                          isCurrentMonth ? 'bg-blue-600' : 'bg-blue-400'
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
                  <div className="w-16 text-right text-sm text-gray-600">
                    {trend.expenseCount}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Link
          href="/expenses"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          View All Expenses →
        </Link>
        <Link
          href="/expenses/add"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Add New Expense →
        </Link>
        <Link
          href="/expenses-summary/yearly"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          View Yearly Summary →
        </Link>
        <Link
          href="/expense-categories"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Manage Categories →
        </Link>
      </div>
    </div>
  );
}
