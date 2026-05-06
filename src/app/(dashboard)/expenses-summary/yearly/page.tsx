'use client';

import { useState, useEffect } from 'react';
import { Download, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { showToast } from '@/components/Toast';

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
    } catch (error: any) {
      console.error('Error fetching data:', error);
      showToast(error?.response?.data?.message ?? 'Failed to fetch yearly expense summary', 'error');
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading yearly summary...</div>
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Yearly Expense Report</h1>
          <p className="text-gray-600 mt-1">Comprehensive annual expense analysis</p>
        </div>
        <button
          onClick={exportYearlyReport}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Download size={20} />
          Export Report
        </button>
      </div>

      {/* Year Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <Calendar size={20} className="text-gray-600" />
          <span className="font-medium text-gray-900">Select Year:</span>
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

      {/* Yearly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <div className="md:col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-6">
          <div className="text-sm opacity-90 mb-2">Total Expenses ({year})</div>
          <div className="text-4xl font-bold mb-1">
            ₹{yearlyTotal.totalExpenses?.toLocaleString() || 0}
          </div>
          <div className="text-sm opacity-75">
            {yearlyTotal.expenseCount || 0} entries across {monthlySummaries.length} months
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-2">Average/Month</div>
          <div className="text-2xl font-bold text-gray-900">
            ₹{Math.round(avgPerMonth).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {monthlySummaries.length} months recorded
          </div>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
            <TrendingUp size={16} />
            Highest Month
          </div>
          <div className="text-xl font-bold text-green-900">
            ₹{highestMonth?.totalExpenses?.toLocaleString() || 0}
          </div>
          <div className="text-xs text-green-600 mt-2">
            {MONTHS[highestMonth?.month - 1]} {year}
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg shadow p-6">
          <div className="flex items-center gap-2 text-sm text-blue-600 mb-2">
            <TrendingDown size={16} />
            Lowest Month
          </div>
          <div className="text-xl font-bold text-blue-900">
            ₹{lowestMonth?.totalExpenses?.toLocaleString() || 0}
          </div>
          <div className="text-xs text-blue-600 mt-2">
            {MONTHS[lowestMonth?.month - 1]} {year}
          </div>
        </div>
      </div>

      {/* Month-by-Month Breakdown */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Month-by-Month Breakdown ({year})
        </h2>

        {monthlySummaries.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No expenses recorded for {year}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Month
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Total Expenses
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    vs Previous
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Entries
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Visual
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {MONTHS.map((monthName, index) => {
                  const monthData = monthlySummaries.find((m: any) => m.month === index + 1);
                  const prevMonthData = monthlySummaries.find((m: any) => m.month === index);
                  
                  if (!monthData) {
                    return (
                      <tr key={index} className="bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-500">{monthName}</td>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-400">
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
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {monthName}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                        ₹{monthData.totalExpenses.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {prevTotal === 0 ? (
                          <span className="text-gray-400">-</span>
                        ) : (
                          <span className={change >= 0 ? 'text-red-600' : 'text-green-600'}>
                            {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600">
                        {monthData.expenseCount}
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-100 font-semibold">
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">Total ({year})</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">
                    ₹{yearlyTotal.totalExpenses?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">-</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">
                    {yearlyTotal.expenseCount || 0}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Top Categories for the Year */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Top Categories ({year})
        </h2>

        {topCategories.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No category data available
          </div>
        ) : (
          <div className="space-y-3">
            {topCategories.map((cat, index) => {
              const percentage = ((cat.totalAmount / (yearlyTotal.totalExpenses || 1)) * 100).toFixed(1);
              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="text-xl font-bold text-gray-400 w-8">
                        #{index + 1}
                      </div>
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: cat.categoryColor || '#3B82F6' }}
                      />
                      <span className="font-medium text-gray-900">{cat.categoryName}</span>
                      <span className="text-sm text-gray-500">({cat.count} entries)</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        ₹{cat.totalAmount?.toLocaleString() || 0}
                      </div>
                      <div className="text-xs text-gray-500">{percentage}%</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
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
          href="/expenses-summary"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          View Monthly Summary →
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
