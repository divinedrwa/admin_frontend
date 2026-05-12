'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Download, Edit, Trash2, Eye, Calendar, ReceiptText } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { showToast } from '@/components/Toast';
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { parseApiError } from "@/utils/errorHandler";

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
  attachments: unknown[];
}

interface ExpenseCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
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

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/expenses/categories');
      setCategories(response.data ?? []);
    } catch (error: unknown) {
      console.error('Error fetching categories:', error);
      showToast(parseApiError(error, "Failed to fetch categories").message, 'error');
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
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
    } catch (error: unknown) {
      console.error('Error fetching expenses:', error);
      showToast(parseApiError(error, "Failed to fetch expenses").message, 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, selectedMonth, selectedPaymentMode, selectedStatus, selectedYear]);

  useEffect(() => {
    void fetchCategories();
    void fetchExpenses();
  }, [fetchCategories, fetchExpenses]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      await api.delete(`/expenses/${id}`);
      await fetchExpenses();
      showToast('Expense deleted', 'success');
    } catch (error: unknown) {
      console.error('Error deleting expense:', error);
      showToast(parseApiError(error, "Failed to delete expense").message, 'error');
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
      <div className="loading-state">
        <div className="loading-spinner w-10 h-10"></div>
        <p className="loading-state-text">Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        eyebrow="Finance operations"
        title="Monthly expenses"
        description="Track operational spending, export records, and review category-level expense activity from a consistent finance workspace."
        icon={<ReceiptText className="h-6 w-6" />}
        actions={
          <>
            <button
              onClick={exportToExcel}
              className="btn btn-success flex items-center gap-2"
            >
              <Download size={18} />
              Export
            </button>
            <Link
              href="/expenses/add"
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              Add Expense
            </Link>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="stat-card">
          <div className="stat-card-label">Total Expenses</div>
          <div className="stat-card-value">
            ₹{stats.total.toLocaleString()}
          </div>
          <div className="text-sm text-fg-secondary mt-1">{stats.count} entries</div>
        </div>

        <div className="stat-card bg-brand-primary-light">
          <div className="stat-card-label text-brand-primary">This Month</div>
          <div className="stat-card-value text-info-fg">
            ₹{stats.thisMonth.toLocaleString()}
          </div>
          <div className="text-sm text-brand-primary mt-1">
            {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}
          </div>
        </div>

        <div className="stat-card bg-approved-bg">
          <div className="stat-card-label text-approved-solid">This Year</div>
          <div className="stat-card-value text-approved-fg">
            ₹{stats.thisYear.toLocaleString()}
          </div>
          <div className="text-sm text-approved-solid mt-1">{new Date().getFullYear()}</div>
        </div>

        <div className="stat-card bg-brand-primary-light">
          <div className="stat-card-label text-brand-primary">Avg per Month</div>
          <div className="stat-card-value text-info-fg">
            ₹{stats.thisYear > 0 ? Math.round(stats.thisYear / new Date().getMonth() + 1).toLocaleString() : 0}
          </div>
          <div className="text-sm text-brand-primary mt-1">Current year</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-fg-secondary" />
          <span className="font-semibold text-fg-primary">Filters</span>
          {(searchTerm || selectedCategory || selectedMonth || selectedYear || selectedStatus || selectedPaymentMode) && (
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-brand-primary hover:text-brand-primary"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3 text-fg-tertiary" />
              <input
                type="text"
                placeholder="Search title, description, vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchExpenses()}
                className="input pl-10"
              />
            </div>
          </div>

          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input"
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
            className="input"
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
            className="input"
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
            className="input"
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
      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Category</th>
                <th className="table-th">Title</th>
                <th className="table-th">Paid To</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Payment</th>
                <th className="table-th">Attachments</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-surface-border">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="empty-state">
                      <span className="empty-state-icon">💰</span>
                      <p className="empty-state-title">No expenses found</p>
                      <p className="empty-state-text">Add your first expense to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="table-row">
                    <td className="table-td whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-fg-tertiary" />
                        <span className="text-sm text-fg-primary">
                          {new Date(expense.paymentDate).toLocaleDateString()}
                        </span>
                      </div>
                      {expense.month && expense.year && (
                        <div className="text-xs text-fg-secondary">
                          {MONTHS[expense.month - 1]} {expense.year}
                        </div>
                      )}
                    </td>
                    <td className="table-td whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-8 h-8 rounded flex items-center justify-center"
                          style={{ backgroundColor: expense.category.color + '20' }}
                        >
                          {expense.category.icon || '📋'}
                        </span>
                        <span className="text-sm text-fg-primary">
                          {expense.category.name}
                        </span>
                      </div>
                    </td>
                    <td className="table-td">
                      <div className="text-sm font-medium text-fg-primary">
                        {expense.title}
                      </div>
                      {expense.description && (
                        <div className="text-xs text-fg-secondary mt-1 max-w-xs truncate">
                          {expense.description}
                        </div>
                      )}
                    </td>
                    <td className="table-td whitespace-nowrap">
                      <div className="text-sm text-fg-primary">{expense.paidTo}</div>
                      {expense.receiptNumber && (
                        <div className="text-xs text-fg-secondary">
                          #{expense.receiptNumber}
                        </div>
                      )}
                    </td>
                    <td className="table-td whitespace-nowrap">
                      <div className="text-sm font-semibold text-fg-primary">
                        ₹{expense.amount.toLocaleString()}
                      </div>
                      {expense.netAmount !== expense.amount && (
                        <div className="text-xs text-fg-secondary">
                          Net: ₹{expense.netAmount.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="table-td whitespace-nowrap">
                      <span className={`badge ${
                        expense.paymentMode === 'UPI' ? 'badge-info' :
                        expense.paymentMode === 'CARD' ? 'badge-info' :
                        expense.paymentMode === 'CASH' ? 'badge-success' :
                        'badge-gray'
                      }`}>
                        {expense.paymentMode}
                      </span>
                    </td>
                    <td className="table-td whitespace-nowrap">
                      {expense.attachments.length > 0 ? (
                        <span className="text-sm text-brand-primary">
                          📎 {expense.attachments.length} file(s)
                        </span>
                      ) : (
                        <span className="text-sm text-fg-tertiary">-</span>
                      )}
                    </td>
                    <td className="table-td whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/expenses/${expense.id}`}
                          className="text-brand-primary hover:text-brand-primary"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          href={`/expenses/edit/${expense.id}`}
                          className="text-fg-secondary hover:text-fg-primary"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-brand-danger hover:text-brand-danger"
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
          className="text-brand-primary hover:text-brand-primary text-sm font-medium"
        >
          View Monthly Summary →
        </Link>
        <Link
          href="/expenses-summary/yearly"
          className="text-brand-primary hover:text-brand-primary text-sm font-medium"
        >
          View Yearly Summary →
        </Link>
        <Link
          href="/expense-categories"
          className="text-brand-primary hover:text-brand-primary text-sm font-medium"
        >
          Manage Categories →
        </Link>
      </div>
    </div>
  );
}
