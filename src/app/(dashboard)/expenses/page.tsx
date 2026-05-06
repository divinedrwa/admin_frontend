'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Edit, Trash2, Eye, Calendar } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { showToast } from '@/components/Toast';

interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  netAmount: number;
  paymentDate: string;
  paymentMode: string;
  paidTo: string;
  receiptNumber?: string;
  month?: number;
  year?: number;
  status: string;
  category: {
    id: string;
    name: string;
    color?: string;
    icon?: string;
  };
  attachments: any[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    count: 0,
    thisMonth: 0,
    thisYear: 0
  });

  useEffect(() => {
    fetchCategories();
    fetchExpenses();
  }, [selectedCategory, selectedMonth, selectedYear, selectedStatus, selectedPaymentMode]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/expenses/categories');
      setCategories(response.data ?? []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      showToast(error?.response?.data?.message ?? 'Failed to fetch categories', 'error');
    }
  };

  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (selectedMonth) params.append('month', selectedMonth);
      if (selectedYear) params.append('year', selectedYear);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedPaymentMode) params.append('paymentMode', selectedPaymentMode);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/expenses?${params.toString()}`);
      const data = response.data ?? [];
      setExpenses(data);
      
      // Calculate stats
      const total = data.reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const thisMonth = data
        .filter((exp: Expense) => exp.month === currentMonth && exp.year === currentYear)
        .reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
      const thisYear = data
        .filter((exp: Expense) => exp.year === currentYear)
        .reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
      
      setStats({
        total,
        count: data.length,
        thisMonth,
        thisYear
      });
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      showToast(error?.response?.data?.message ?? 'Failed to fetch expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      await api.delete(`/expenses/${id}`);
      await fetchExpenses();
      showToast('Expense deleted', 'success');
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      showToast(error?.response?.data?.message ?? 'Failed to delete expense', 'error');
    }
  };

  const exportToExcel = () => {
    // Simple CSV export
    const headers = ['Date', 'Category', 'Title', 'Paid To', 'Amount', 'Payment Mode', 'Status'];
    const rows = expenses.map(exp => [
      new Date(exp.paymentDate).toLocaleDateString(),
      exp.category.name,
      exp.title,
      exp.paidTo,
      exp.amount,
      exp.paymentMode,
      exp.status
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedMonth('');
    setSelectedYear('');
    setSelectedStatus('');
    setSelectedPaymentMode('');
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading expenses...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Monthly Expenses</h1>
          <p className="text-gray-600 mt-1">Track all society operational expenses</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download size={20} />
            Export
          </button>
          <Link
            href="/expenses/add"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Add Expense
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Expenses</div>
          <div className="text-2xl font-bold text-gray-900">
            ₹{stats.total.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 mt-1">{stats.count} entries</div>
        </div>

        <div className="bg-blue-50 rounded-lg shadow p-6">
          <div className="text-sm text-blue-600 mb-1">This Month</div>
          <div className="text-2xl font-bold text-blue-900">
            ₹{stats.thisMonth.toLocaleString()}
          </div>
          <div className="text-sm text-blue-600 mt-1">
            {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-6">
          <div className="text-sm text-green-600 mb-1">This Year</div>
          <div className="text-2xl font-bold text-green-900">
            ₹{stats.thisYear.toLocaleString()}
          </div>
          <div className="text-sm text-green-600 mt-1">{new Date().getFullYear()}</div>
        </div>

        <div className="bg-purple-50 rounded-lg shadow p-6">
          <div className="text-sm text-purple-600 mb-1">Avg per Month</div>
          <div className="text-2xl font-bold text-purple-900">
            ₹{stats.thisYear > 0 ? Math.round(stats.thisYear / new Date().getMonth() + 1).toLocaleString() : 0}
          </div>
          <div className="text-sm text-purple-600 mt-1">Current year</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <span className="font-semibold text-gray-900">Filters</span>
          {(searchTerm || selectedCategory || selectedMonth || selectedYear || selectedStatus || selectedPaymentMode) && (
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-blue-600 hover:text-blue-700"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search title, description, vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchExpenses()}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>

          {/* Month */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Months</option>
            {MONTHS.map((month, index) => (
              <option key={index} value={index + 1}>{month}</option>
            ))}
          </select>

          {/* Year */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Years</option>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          {/* Payment Mode */}
          <select
            value={selectedPaymentMode}
            onChange={(e) => setSelectedPaymentMode(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Payment Modes</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CHEQUE">Cheque</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attachments
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No expenses found. Add your first expense to get started.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {new Date(expense.paymentDate).toLocaleDateString()}
                        </span>
                      </div>
                      {expense.month && expense.year && (
                        <div className="text-xs text-gray-500">
                          {MONTHS[expense.month - 1]} {expense.year}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-8 h-8 rounded flex items-center justify-center"
                          style={{ backgroundColor: expense.category.color + '20' }}
                        >
                          {expense.category.icon || '📋'}
                        </span>
                        <span className="text-sm text-gray-900">
                          {expense.category.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {expense.title}
                      </div>
                      {expense.description && (
                        <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                          {expense.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{expense.paidTo}</div>
                      {expense.receiptNumber && (
                        <div className="text-xs text-gray-500">
                          #{expense.receiptNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        ₹{expense.amount.toLocaleString()}
                      </div>
                      {expense.netAmount !== expense.amount && (
                        <div className="text-xs text-gray-500">
                          Net: ₹{expense.netAmount.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        expense.paymentMode === 'UPI' ? 'bg-purple-100 text-purple-800' :
                        expense.paymentMode === 'CARD' ? 'bg-blue-100 text-blue-800' :
                        expense.paymentMode === 'CASH' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {expense.paymentMode}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {expense.attachments.length > 0 ? (
                        <span className="text-sm text-blue-600">
                          📎 {expense.attachments.length} file(s)
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/expenses/${expense.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          href={`/expenses/edit/${expense.id}`}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-6 flex gap-4">
        <Link
          href="/expenses-summary"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          View Monthly Summary →
        </Link>
        <Link
          href="/expenses-summary/yearly"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          View Yearly Summary →
        </Link>
        <Link
          href="/expense-categories"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Manage Categories →
        </Link>
      </div>
    </div>
  );
}
