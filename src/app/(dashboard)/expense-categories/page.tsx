'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, FolderOpen, Tags } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AdminPageHeader } from '@/components/AdminPageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { useConfirm } from '@/components/ConfirmDialog';
import { showToast } from '@/components/Toast';
import { parseApiError } from "@/utils/errorHandler";
import { lightTheme } from "@/theme/tokens";
import { useExpenseCategoriesFull } from '@/hooks/useExpenses';
import { ExpenseCategory } from '@/types/expense';

const DEFAULT_CATEGORY_COLOR = lightTheme.state.info.solid;

const expenseTypes = [
  { value: 'ELECTRICITY', label: 'Electricity', icon: '⚡', color: lightTheme.state.pending.solid },
  { value: 'WATER', label: 'Water Bill', icon: '💧', color: lightTheme.state.info.solid },
  { value: 'GARBAGE_COLLECTION', label: 'Garbage Collection', icon: '🚮', color: lightTheme.brand.accent },
  { value: 'SECURITY_SALARY', label: 'Security Salary', icon: '👮', color: lightTheme.brand.primaryHover },
  { value: 'HOUSEKEEPING_SALARY', label: 'Housekeeping Salary', icon: '🧹', color: lightTheme.text.tertiary },
  { value: 'GARDENING', label: 'Gardening', icon: '🌺', color: lightTheme.state.approved.solid },
  { value: 'LIFT_MAINTENANCE', label: 'Lift Maintenance', icon: '🛗', color: lightTheme.brand.danger },
  { value: 'GENERATOR_MAINTENANCE', label: 'Generator', icon: '⚙️', color: lightTheme.state.pending.fg },
  { value: 'PEST_CONTROL', label: 'Pest Control', icon: '🐛', color: lightTheme.sidebar.activeBg },
  { value: 'COMMON_AREA_REPAIR', label: 'Common Area Repair', icon: '🔧', color: lightTheme.sidebar.mutedText },
  { value: 'INSURANCE', label: 'Insurance', icon: '🛡️', color: lightTheme.text.secondary },
  { value: 'SOFTWARE_SUBSCRIPTION', label: 'Software', icon: '💻', color: lightTheme.brand.primary },
  { value: 'OTHER', label: 'Other', icon: '📋', color: lightTheme.text.secondary },
];

export default function ExpenseCategoriesPage() {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading: loading } = useExpenseCategoriesFull();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const { confirm, ConfirmUI } = useConfirm();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'OTHER',
    icon: '',
    color: DEFAULT_CATEGORY_COLOR,
    isRecurring: false,
    defaultAmount: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCategory) {
        await api.put(`/expenses/categories/${editingCategory.id}`, formData);
      } else {
        await api.post('/expenses/categories', formData);
      }
      queryClient.invalidateQueries({ queryKey: ["expenseCategoriesFull"] });
      queryClient.invalidateQueries({ queryKey: ["expenseCategories"] });
      closeModal();
      showToast(editingCategory ? 'Category updated' : 'Category created', 'success');
    } catch (error: unknown) {
      console.error('Error saving category:', error);
      showToast(parseApiError(error, "Failed to save category").message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: 'Delete category', message: 'Are you sure you want to delete this category?', confirmLabel: 'Delete' }))) return;

    try {
      await api.delete(`/expenses/categories/${id}`);
      queryClient.invalidateQueries({ queryKey: ["expenseCategoriesFull"] });
      queryClient.invalidateQueries({ queryKey: ["expenseCategories"] });
      showToast('Category deleted', 'success');
    } catch (error: unknown) {
      console.error('Error deleting category:', error);
      showToast(parseApiError(error, "Failed to delete category").message, 'error');
    }
  };

  const normalizeDefaultAmount = (v: unknown): number => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const openModal = (category?: ExpenseCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        type: category.type,
        icon: category.icon || '',
        color: category.color || DEFAULT_CATEGORY_COLOR,
        isRecurring: category.isRecurring,
        defaultAmount: normalizeDefaultAmount(category.defaultAmount),
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        type: 'OTHER',
        icon: '',
        color: DEFAULT_CATEGORY_COLOR,
        isRecurring: false,
        defaultAmount: 0
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner w-10 h-10"></div>
        <p className="loading-state-text">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Finance operations"
        title="Expense categories"
        description="Manage the expense categories used to organize and report on your society's spending."
        icon={<Tags className="h-6 w-6" />}
        actions={
          <button
            onClick={() => openModal()}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Add Category
          </button>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title="No categories found"
          description="Create your first expense category to organize your expenses."
          action={
            <button
              onClick={() => openModal()}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              Add Category
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              className="card hover:shadow-lg transition-shadow"
            >
              <div className="card-body">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    {category.icon || '📋'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(category)}
                      className="text-brand-primary hover:text-brand-primary"
                      aria-label={`Edit ${category.name}`}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-brand-danger hover:text-brand-danger"
                      aria-label={`Delete ${category.name}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-lg text-fg-primary mb-1">
                  {category.name}
                </h3>

                {category.description && (
                  <p className="text-sm text-fg-secondary mb-4">{category.description}</p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-fg-secondary">
                    {category._count.expenses} entries
                  </span>
                  {category.isRecurring && (
                    <span className="badge badge-info">
                      Recurring
                    </span>
                  )}
                </div>

                {category.defaultAmount && category.defaultAmount > 0 && (
                  <div className="mt-3 pt-3 border-t text-sm text-fg-secondary">
                    Default: ₹{category.defaultAmount.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={closeModal}>
        <div className="card">
          <div className="card-header">
            <h2 className="text-2xl font-bold">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Category Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const selectedType = expenseTypes.find(t => t.value === e.target.value);
                      setFormData({
                        ...formData,
                        type: e.target.value,
                        icon: selectedType?.icon || '',
                        color: selectedType?.color || DEFAULT_CATEGORY_COLOR,
                        name: formData.name || selectedType?.label || ''
                      });
                    }}
                    className="input"
                    required
                  >
                    {expenseTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-1">
                      Icon (emoji)
                    </label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="input"
                      placeholder="⚡"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-10 border rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="isRecurring" className="text-sm text-fg-primary">
                    Recurring expense (auto-create monthly)
                  </label>
                </div>

                {formData.isRecurring && (
                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-1">
                      Default Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-fg-secondary">₹</span>
                      <input
                        type="number"
                        value={
                          Number.isFinite(formData.defaultAmount)
                            ? String(formData.defaultAmount)
                            : ''
                        }
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            setFormData({ ...formData, defaultAmount: 0 });
                            return;
                          }
                          const n = parseFloat(raw);
                          setFormData({
                            ...formData,
                            defaultAmount: Number.isFinite(n) ? n : 0,
                          });
                        }}
                        className="input pl-8"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                  >
                    {editingCategory ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
      </Modal>
      {ConfirmUI}
    </div>
  );
}
