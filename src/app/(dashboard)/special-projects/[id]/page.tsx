'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, CheckCircle, XCircle, Briefcase, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { showToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { AdminPageHeader } from '@/components/AdminPageHeader';
import { Modal } from '@/components/Modal';
import { parseApiError } from '@/utils/errorHandler';

interface Villa { id: string; villaNumber: string; ownerName: string }
interface Payment {
  id: string;
  amount: number;
  method: string;
  reference?: string;
  paidAt: string;
  markedBy?: { id: string; name: string };
}
interface Contribution {
  id: string;
  villa: Villa;
  amount: number;
  paidAmount: number;
  status: string;
  dueDate?: string;
  payments: Payment[];
  _count?: { payments: number };
}
interface Expense {
  id: string;
  description: string;
  amount: number;
  vendor?: string;
  receiptUrl?: string;
  expenseDate: string;
  createdBy?: { id: string; name: string };
}
interface ProjectSummary {
  targetAmount: number;
  totalCollected: number;
  totalExpenses: number;
  balance: number;
  contributionCount: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
}
interface Project {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  targetAmount: number;
  totalCollected: number;
  totalExpenses: number;
  createdAt: string;
  createdBy?: { id: string; name: string };
  contributions: Contribution[];
  expenses: Expense[];
  _count?: { contributions: number; expenses: number };
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-approved-bg text-approved-fg',
  COMPLETED: 'bg-info-bg text-info-fg',
  CANCELLED: 'bg-denied-bg text-denied-fg',
};

const CONTRIB_BADGE: Record<string, string> = {
  PAID: 'bg-approved-bg text-approved-fg',
  PARTIALLY_PAID: 'bg-pending-bg text-pending-fg',
  UNPAID: 'bg-denied-bg text-denied-fg',
};

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function SpecialProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { confirm, ConfirmUI } = useConfirm();

  // Payment modal
  const [paymentModal, setPaymentModal] = useState<{ contribId: string; villaNumber: string } | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, method: 'CASH', reference: '' });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Expense modal
  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: 0, vendor: '', expenseDate: new Date().toISOString().split('T')[0] });
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Status modal
  const [statusModal, setStatusModal] = useState<string | null>(null);

  // Expandable payment history rows
  const [expandedContrib, setExpandedContrib] = useState<string | null>(null);

  // Edit project modal
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', type: 'OTHER' });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const openEditModal = () => {
    if (!project) return;
    setEditForm({
      title: project.title,
      description: project.description || '',
      type: project.type,
    });
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!editForm.title.trim()) return;
    setSubmittingEdit(true);
    try {
      await api.patch(`/special-projects/${projectId}`, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        type: editForm.type,
      });
      showToast('Project updated', 'success');
      setEditModal(false);
      fetchProject();
    } catch (error: unknown) {
      showToast(parseApiError(error, 'Failed to update project').message, 'error');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/special-projects/${projectId}`);
      setProject(res.data.project);
      setSummary(res.data.summary);
    } catch (error: unknown) {
      showToast(parseApiError(error, 'Failed to load project').message, 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const recordPayment = async () => {
    if (!paymentModal || paymentForm.amount <= 0) return;
    setSubmittingPayment(true);
    try {
      await api.post(`/special-projects/${projectId}/contributions/${paymentModal.contribId}/payments`, {
        amount: paymentForm.amount,
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        idempotencyKey: `proj_${projectId}_${paymentModal.contribId}_${Date.now()}`,
      });
      showToast('Payment recorded', 'success');
      setPaymentModal(null);
      setPaymentForm({ amount: 0, method: 'CASH', reference: '' });
      fetchProject();
    } catch (error: unknown) {
      showToast(parseApiError(error, 'Failed to record payment').message, 'error');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const deletePayment = async (contribId: string, paymentId: string) => {
    if (!(await confirm({ title: 'Remove payment', message: 'Remove this payment?', confirmLabel: 'Remove' }))) return;
    try {
      await api.delete(`/special-projects/${projectId}/contributions/${contribId}/payments/${paymentId}`);
      showToast('Payment removed', 'success');
      fetchProject();
    } catch (error: unknown) {
      showToast(parseApiError(error, 'Failed to remove payment').message, 'error');
    }
  };

  const addExpense = async () => {
    if (!expenseForm.description || expenseForm.amount <= 0) return;
    setSubmittingExpense(true);
    try {
      await api.post(`/special-projects/${projectId}/expenses`, {
        description: expenseForm.description,
        amount: expenseForm.amount,
        vendor: expenseForm.vendor || undefined,
        expenseDate: new Date(expenseForm.expenseDate).toISOString(),
      });
      showToast('Expense added', 'success');
      setExpenseModal(false);
      setExpenseForm({ description: '', amount: 0, vendor: '', expenseDate: new Date().toISOString().split('T')[0] });
      fetchProject();
    } catch (error: unknown) {
      showToast(parseApiError(error, 'Failed to add expense').message, 'error');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const deleteExpense = async (expId: string) => {
    if (!(await confirm({ title: 'Delete expense', message: 'Delete this expense?', confirmLabel: 'Delete' }))) return;
    try {
      await api.delete(`/special-projects/${projectId}/expenses/${expId}`);
      showToast('Expense deleted', 'success');
      fetchProject();
    } catch (error: unknown) {
      showToast(parseApiError(error, 'Failed to delete expense').message, 'error');
    }
  };

  const changeStatus = async (status: string) => {
    try {
      await api.patch(`/special-projects/${projectId}/status`, { status });
      showToast(`Project marked as ${status.toLowerCase()}`, 'success');
      setStatusModal(null);
      fetchProject();
    } catch (error: unknown) {
      showToast(parseApiError(error, 'Failed to update status').message, 'error');
    }
  };

  const deleteProject = async () => {
    if (!(await confirm({ title: 'Delete project', message: 'Delete this project? This cannot be undone.', confirmLabel: 'Delete' }))) return;
    try {
      await api.delete(`/special-projects/${projectId}`);
      showToast('Project deleted', 'success');
      router.push('/special-projects');
    } catch (error: unknown) {
      showToast(parseApiError(error, 'Failed to delete project').message, 'error');
    }
  };

  if (loading) return <div className="py-12 text-center text-fg-secondary">Loading...</div>;
  if (!project) return <div className="py-12 text-center text-fg-secondary">Project not found.</div>;

  const progress = project.targetAmount > 0 ? Math.round((project.totalCollected / project.targetAmount) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link href="/special-projects" className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg-primary">
        <ArrowLeft className="h-4 w-4" /> Back to projects
      </Link>

      <AdminPageHeader
        title={project.title}
        description={project.description || 'No description'}
        icon={<Briefcase className="h-6 w-6" />}
        actions={
          project.status === 'ACTIVE' ? (
            <div className="flex gap-2">
              <button onClick={openEditModal} className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-secondary transition-colors">
                <Pencil className="h-4 w-4 text-fg-secondary" /> Edit
              </button>
              <button onClick={() => setStatusModal('COMPLETED')} className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-secondary transition-colors">
                <CheckCircle className="h-4 w-4 text-approved-fg" /> Complete
              </button>
              <button onClick={() => setStatusModal('CANCELLED')} className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-secondary transition-colors">
                <XCircle className="h-4 w-4 text-denied-fg" /> Cancel
              </button>
            </div>
          ) : (
            <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${STATUS_BADGE[project.status] ?? 'bg-surface-secondary text-fg-secondary'}`}>{project.status}</span>
          )
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Target', value: fmtCurrency(project.targetAmount) },
          { label: 'Collected', value: fmtCurrency(project.totalCollected), sub: `${progress}%` },
          { label: 'Spent', value: fmtCurrency(project.totalExpenses) },
          { label: 'Balance', value: fmtCurrency(project.totalCollected - project.totalExpenses) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
            <p className="text-xs text-fg-tertiary">{stat.label}</p>
            <p className="mt-1 text-lg font-bold text-fg-primary">{stat.value}</p>
            {stat.sub && <p className="text-xs text-fg-secondary">{stat.sub}</p>}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
        <div className="flex justify-between text-sm text-fg-secondary mb-2">
          <span>Collection Progress</span>
          <span>{summary?.paidCount ?? 0} paid / {summary?.contributionCount ?? 0} total</span>
        </div>
        <div className="h-3 rounded-full bg-surface-secondary overflow-hidden">
          <div className="h-full rounded-full bg-brand-primary transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </div>

      {/* Contributions Table */}
      <div className="rounded-xl border border-surface-border bg-surface shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-border">
          <h2 className="text-base font-semibold text-fg-primary">Contributions</h2>
          <div className="flex gap-2 text-xs text-fg-tertiary">
            <span className="px-2 py-0.5 rounded-full bg-approved-bg text-approved-fg">{summary?.paidCount ?? 0} Paid</span>
            <span className="px-2 py-0.5 rounded-full bg-pending-bg text-pending-fg">{summary?.partialCount ?? 0} Partial</span>
            <span className="px-2 py-0.5 rounded-full bg-denied-bg text-denied-fg">{summary?.unpaidCount ?? 0} Unpaid</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-secondary text-fg-secondary text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Villa</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {project.contributions.map((contrib) => {
                const isExpanded = expandedContrib === contrib.id;
                const hasPayments = contrib.payments && contrib.payments.length > 0;
                return (
                  <tr key={contrib.id} className="group">
                    <td colSpan={6} className="p-0">
                      {/* Main row */}
                      <div
                        className={`flex items-center hover:bg-surface-secondary/50 cursor-pointer ${isExpanded ? 'bg-surface-secondary/30' : ''}`}
                        onClick={() => hasPayments && setExpandedContrib(isExpanded ? null : contrib.id)}
                      >
                        <div className="px-4 py-3 w-8">
                          {hasPayments && (
                            isExpanded
                              ? <ChevronDown className="h-3.5 w-3.5 text-fg-tertiary" />
                              : <ChevronRight className="h-3.5 w-3.5 text-fg-tertiary" />
                          )}
                        </div>
                        <div className="px-2 py-3 font-medium text-fg-primary w-20">{contrib.villa.villaNumber}</div>
                        <div className="px-2 py-3 text-fg-secondary flex-1">{contrib.villa.ownerName}</div>
                        <div className="px-4 py-3 text-right w-28">{fmtCurrency(contrib.amount)}</div>
                        <div className="px-4 py-3 text-right w-28">{fmtCurrency(contrib.paidAmount)}</div>
                        <div className="px-4 py-3 text-center w-32">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CONTRIB_BADGE[contrib.status] ?? 'bg-surface-secondary text-fg-secondary'}`}>
                            {contrib.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="px-4 py-3 text-center w-28" onClick={(e) => e.stopPropagation()}>
                          {project.status === 'ACTIVE' && (
                            <button
                              onClick={() => setPaymentModal({ contribId: contrib.id, villaNumber: contrib.villa.villaNumber })}
                              className="text-xs font-medium text-brand-primary hover:underline"
                            >
                              + Payment
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Expanded payment history */}
                      {isExpanded && hasPayments && (
                        <div className="bg-surface-secondary/20 border-t border-surface-border px-6 py-2">
                          <p className="text-xs font-medium text-fg-tertiary uppercase tracking-wider mb-2">Payment History</p>
                          <div className="space-y-1.5">
                            {contrib.payments.map((pay) => (
                              <div key={pay.id} className="flex items-center gap-3 text-xs bg-surface rounded-lg px-3 py-2 border border-surface-border">
                                <span className="font-medium text-fg-primary">{fmtCurrency(pay.amount)}</span>
                                <span className="px-1.5 py-0.5 rounded bg-surface-secondary text-fg-secondary">{pay.method.replace('_', ' ')}</span>
                                {pay.reference && <span className="text-fg-tertiary truncate max-w-[160px]">Ref: {pay.reference}</span>}
                                <span className="text-fg-tertiary ml-auto">{new Date(pay.paidAt).toLocaleDateString('en-IN')}</span>
                                {pay.markedBy && <span className="text-fg-tertiary">by {pay.markedBy.name}</span>}
                                {project.status === 'ACTIVE' && (
                                  <button
                                    onClick={() => deletePayment(contrib.id, pay.id)}
                                    className="text-denied-fg hover:opacity-80 ml-1"
                                    title="Remove payment"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expenses Section */}
      <div className="rounded-xl border border-surface-border bg-surface shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-border">
          <h2 className="text-base font-semibold text-fg-primary">Expenses</h2>
          {project.status === 'ACTIVE' && (
            <button
              onClick={() => setExpenseModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary-hover transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Expense
            </button>
          )}
        </div>
        {project.expenses.length === 0 ? (
          <p className="p-4 text-sm text-fg-secondary">No expenses recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-secondary text-fg-secondary text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Vendor</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {project.expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-surface-secondary/50">
                    <td className="px-4 py-3 text-fg-primary">{exp.description}</td>
                    <td className="px-4 py-3 text-fg-secondary">{exp.vendor || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmtCurrency(exp.amount)}</td>
                    <td className="px-4 py-3 text-fg-secondary">{new Date(exp.expenseDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => deleteExpense(exp.id)} className="text-denied-fg hover:opacity-80">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete project button */}
      {project.status !== 'COMPLETED' && (
        <div className="flex justify-end">
          <button onClick={deleteProject} className="text-sm text-denied-fg hover:opacity-80 hover:underline">
            Delete project
          </button>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal open={!!paymentModal} onClose={() => setPaymentModal(null)} ariaLabel="Record payment">
        <div className="rounded-2xl bg-surface p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-fg-primary">Record Payment — Villa {paymentModal?.villaNumber}</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Amount</label>
              <input type="number" min={1} value={paymentForm.amount || ''} onChange={(e) => setPaymentForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Method</label>
              <select value={paymentForm.method} onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))} className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary">
                {['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE'].map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Reference (optional)</label>
              <input type="text" value={paymentForm.reference} onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))} className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary" />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setPaymentModal(null)} className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium hover:bg-surface-secondary transition-colors">Cancel</button>
            <button onClick={recordPayment} disabled={submittingPayment || paymentForm.amount <= 0} className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-50 transition-colors">
              {submittingPayment ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Expense Modal */}
      <Modal open={expenseModal} onClose={() => setExpenseModal(false)} ariaLabel="Add expense">
        <div className="rounded-2xl bg-surface p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-fg-primary">Add Expense</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Description</label>
              <input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Amount</label>
              <input type="number" min={1} value={expenseForm.amount || ''} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Vendor (optional)</label>
              <input type="text" value={expenseForm.vendor} onChange={(e) => setExpenseForm((f) => ({ ...f, vendor: e.target.value }))} className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Date</label>
              <input type="date" value={expenseForm.expenseDate} onChange={(e) => setExpenseForm((f) => ({ ...f, expenseDate: e.target.value }))} className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary" />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setExpenseModal(false)} className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium hover:bg-surface-secondary transition-colors">Cancel</button>
            <button onClick={addExpense} disabled={submittingExpense || !expenseForm.description || expenseForm.amount <= 0} className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-50 transition-colors">
              {submittingExpense ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Status Change Modal */}
      <Modal open={!!statusModal} onClose={() => setStatusModal(null)} ariaLabel="Change status">
        <div className="rounded-2xl bg-surface p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-fg-primary">
            {statusModal === 'COMPLETED' ? 'Complete Project?' : 'Cancel Project?'}
          </h3>
          <p className="mt-2 text-sm text-fg-secondary">
            {statusModal === 'COMPLETED'
              ? 'This will mark the project as completed. No more payments or expenses can be recorded.'
              : 'This will cancel the project. No more payments or expenses can be recorded.'}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setStatusModal(null)} className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium hover:bg-surface-secondary transition-colors">
              Go Back
            </button>
            <button
              onClick={() => statusModal && changeStatus(statusModal)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors ${statusModal === 'COMPLETED' ? 'bg-brand-primary hover:bg-brand-primary-hover' : 'bg-brand-primary hover:bg-brand-primary-hover'}`}
            >
              {statusModal === 'COMPLETED' ? 'Yes, Complete' : 'Yes, Cancel'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Project Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} ariaLabel="Edit project">
        <div className="rounded-2xl bg-surface p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-fg-primary">Edit Project</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Title *</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Description</label>
              <textarea
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Type</label>
              <select
                value={editForm.type}
                onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                {[['REPAIR', 'Repair'], ['UPGRADE', 'Upgrade'], ['PURCHASE', 'Purchase'], ['EVENT', 'Event'], ['OTHER', 'Other']].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setEditModal(false)} className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium hover:bg-surface-secondary transition-colors">
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={submittingEdit || !editForm.title.trim()}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-50 transition-colors"
            >
              {submittingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
      {ConfirmUI}
    </div>
  );
}
