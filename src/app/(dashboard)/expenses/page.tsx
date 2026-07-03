'use client';

import { useState, Suspense } from 'react';
import { Plus, Search, Filter, Download, Edit, Trash2, Eye, Calendar, ReceiptText } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { showToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { parseApiError } from "@/utils/errorHandler";
import { useExpenses, useExpenseStats, useExpenseCategories, useFinancialYears } from '@/hooks/useExpenses';
import { Expense } from '@/types/expense';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function ExpensesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { confirm, ConfirmUI } = useConfirm();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFyId, setSelectedFyId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('APPROVED');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('');

  const initialOffset = Number(searchParams.get("offset")) || 0;

  const { data: categoriesData = [] } = useExpenseCategories();
  const categories = categoriesData;

  const { data: financialYears = [] } = useFinancialYears();

  const expensesParams = {
    limit: 50,
    offset: initialOffset,
    categoryId: selectedCategory || undefined,
    financialYearId: selectedFyId || undefined,
    month: selectedMonth || undefined,
    year: selectedYear || undefined,
    status: selectedStatus || undefined,
    paymentMode: selectedPaymentMode || undefined,
    search: searchTerm || undefined,
  };

  const { data: expensesData, isLoading: loading } = useExpenses(expensesParams);
  const expenses = expensesData?.expenses ?? [];
  const pgMeta = {
    total: expensesData?.total ?? 0,
    limit: expensesData?.limit ?? 50,
    offset: expensesData?.offset ?? 0,
  };

  // Server-side stats across all matching expenses (not just current page)
  const statsParams = {
    categoryId: selectedCategory || undefined,
    financialYearId: selectedFyId || undefined,
    month: selectedMonth || undefined,
    year: selectedYear || undefined,
    status: selectedStatus || undefined,
    paymentMode: selectedPaymentMode || undefined,
    search: searchTerm || undefined,
  };
  const { data: serverStats } = useExpenseStats(statsParams);
  const stats = {
    total: serverStats?.total ?? 0,
    count: serverStats?.count ?? pgMeta.total,
    thisMonth: serverStats?.thisMonth ?? 0,
    thisYear: serverStats?.thisYear ?? 0,
  };

  const handlePageChange = (newOffset: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newOffset > 0) params.set("offset", String(newOffset));
    else params.delete("offset");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: 'Delete expense', message: 'Are you sure you want to delete this expense?', confirmLabel: 'Delete' }))) return;

    try {
      await api.delete(`/expenses/${id}`);
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      showToast('Expense deleted', 'success');
    } catch (error: unknown) {
      console.error('Error deleting expense:', error);
      showToast(parseApiError(error, "Failed to delete expense").message, 'error');
    }
  };

  const exportToExcel = async () => {
    const escapeCsv = (v: unknown): string => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    try {
      // Fetch all matching expenses (not just current page)
      const qp: Record<string, string> = { limit: "10000" };
      if (selectedCategory) qp.categoryId = selectedCategory;
      if (selectedFyId) qp.financialYearId = selectedFyId;
      if (selectedMonth) qp.month = selectedMonth;
      if (selectedYear) qp.year = selectedYear;
      if (selectedStatus) qp.status = selectedStatus;
      if (selectedPaymentMode) qp.paymentMode = selectedPaymentMode;
      if (searchTerm) qp.search = searchTerm;

      const { data: allExpenses } = await api.get<Expense[]>("/expenses", { params: qp });

      const headers = ['Date', 'Category', 'Title', 'Paid To', 'Amount', 'Payment Mode', 'Status'];
      const rows = allExpenses.map(exp => [
        new Date(exp.paymentDate).toLocaleDateString("en-IN"),
        exp.category.name,
        exp.title,
        exp.paidTo,
        exp.amount,
        exp.paymentMode,
        exp.status
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCsv).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showToast(parseApiError(error, "Failed to export expenses").message, "error");
    }
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedFyId('');
    setSelectedMonth('');
    setSelectedYear('');
    setSelectedStatus('APPROVED');
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
    <div className="space-y-6">
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
            ₹{stats.total.toLocaleString("en-IN")}
          </div>
          <div className="text-sm text-fg-secondary mt-1">{stats.count} entries</div>
        </div>

        <div className="stat-card bg-brand-primary-light">
          <div className="stat-card-label text-brand-primary">This Month</div>
          <div className="stat-card-value text-info-fg">
            ₹{stats.thisMonth.toLocaleString("en-IN")}
          </div>
          <div className="text-sm text-brand-primary mt-1">
            {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}
          </div>
        </div>

        <div className="stat-card bg-approved-bg">
          <div className="stat-card-label text-approved-solid">This Year</div>
          <div className="stat-card-value text-approved-fg">
            ₹{stats.thisYear.toLocaleString("en-IN")}
          </div>
          <div className="text-sm text-approved-solid mt-1">{new Date().getFullYear()}</div>
        </div>

        <div className="stat-card bg-brand-primary-light">
          <div className="stat-card-label text-brand-primary">Avg per Month</div>
          <div className="stat-card-value text-info-fg">
            ₹{stats.thisYear > 0 ? Math.round(stats.thisYear / (new Date().getMonth() + 1)).toLocaleString("en-IN") : 0}
          </div>
          <div className="text-sm text-brand-primary mt-1">Current year</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-fg-secondary" />
          <span className="font-semibold text-fg-primary">Filters</span>
          {(searchTerm || selectedCategory || selectedFyId || selectedMonth || selectedYear || selectedStatus || selectedPaymentMode) && (
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-brand-primary hover:text-brand-primary"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3 text-fg-tertiary" />
              <input
                type="text"
                placeholder="Search title, description, vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && queryClient.invalidateQueries({ queryKey: ["expenses"] })}
                className="input pl-10"
                aria-label="Search expenses"
              />
            </div>
          </div>

          {/* Financial Year */}
          <select
            value={selectedFyId}
            onChange={(e) => setSelectedFyId(e.target.value)}
            className="input"
            aria-label="Filter by financial year"
          >
            <option value="">All Financial Years</option>
            {[...financialYears]
              .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
              .map(fy => (
                <option key={fy.id} value={fy.id}>{fy.label}</option>
              ))}
          </select>

          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input"
            aria-label="Filter by category"
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
            aria-label="Filter by month"
          >
            <option value="">All Months</option>
            {MONTHS.map((month, index) => (
              <option key={index} value={index + 1}>{month}</option>
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

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input"
          >
            <option value="APPROVED">Approved</option>
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th scope="col" className="table-th">Date</th>
                <th scope="col" className="table-th">Category</th>
                <th scope="col" className="table-th">Title</th>
                <th scope="col" className="table-th">Paid To</th>
                <th scope="col" className="table-th">Amount</th>
                <th scope="col" className="table-th">FY</th>
                <th scope="col" className="table-th">Payment</th>
                <th scope="col" className="table-th">Attachments</th>
                <th scope="col" className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-surface-border">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <EmptyState
                      icon={<ReceiptText className="h-12 w-12" />}
                      title="No expenses found"
                      description="Click &quot;Add Expense&quot; to record your first expense."
                    />
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="table-row">
                    <td className="table-td whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-fg-tertiary" />
                        <span className="text-sm text-fg-primary">
                          {new Date(expense.paymentDate).toLocaleDateString("en-IN")}
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
                          style={{ backgroundColor: expense.category.color ? `${expense.category.color}20` : 'var(--gp-surface-elevated)' }}
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
                        ₹{expense.amount.toLocaleString("en-IN")}
                      </div>
                      {expense.netAmount !== expense.amount && (
                        <div className="text-xs text-fg-secondary">
                          Net: ₹{expense.netAmount.toLocaleString("en-IN")}
                        </div>
                      )}
                    </td>
                    <td className="table-td whitespace-nowrap">
                      <span className="text-sm text-fg-secondary">
                        {expense.financialYear?.label ?? '—'}
                      </span>
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
                          aria-label={`View ${expense.title}`}
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          href={`/expenses/edit/${expense.id}`}
                          className="text-fg-secondary hover:text-fg-primary"
                          aria-label={`Edit ${expense.title}`}
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-brand-danger hover:text-brand-danger"
                          aria-label={`Delete ${expense.title}`}
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

      <Pagination
        total={pgMeta.total}
        limit={pgMeta.limit}
        offset={pgMeta.offset}
        onPageChange={handlePageChange}
      />

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
      {ConfirmUI}
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={<div className="loading-state"><div className="loading-spinner w-10 h-10" /><p className="loading-state-text">Loading expenses...</p></div>}>
      <ExpensesPageInner />
    </Suspense>
  );
}
