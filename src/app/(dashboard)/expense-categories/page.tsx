'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import { api } from '@/lib/api';
import { showToast } from '@/components/Toast';

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  type: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  isRecurring: boolean;
  defaultAmount?: number;
  _count: {
    expenses: number;
  };
}

export default function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'OTHER',
    icon: '',
    color: '#3B82F6',
    isRecurring: false,
    defaultAmount: 0
  });

  const expenseTypes = [
    { value: 'ELECTRICITY', label: 'Electricity', icon: '⚡', color: '#FCD34D' },
    { value: 'WATER', label: 'Water Bill', icon: '💧', color: '#3B82F6' },
    { value: 'GARBAGE_COLLECTION', label: 'Garbage Collection', icon: '🚮', color: '#10B981' },
    { value: 'SECURITY_SALARY', label: 'Security Salary', icon: '👮', color: '#6366F1' },
    { value: 'HOUSEKEEPING_SALARY', label: 'Housekeeping Salary', icon: '🧹', color: '#A855F7' },
    { value: 'GARDENING', label: 'Gardening', icon: '🌺', color: '#22C55E' },
    { value: 'LIFT_MAINTENANCE', label: 'Lift Maintenance', icon: '🛗', color: '#EF4444' },
    { value: 'GENERATOR_MAINTENANCE', label: 'Generator', icon: '⚙️', color: '#F59E0B' },
    { value: 'PEST_CONTROL', label: 'Pest Control', icon: '🐛', color: '#EC4899' },
    { value: 'COMMON_AREA_REPAIR', label: 'Common Area Repair', icon: '🔧', color: '#8B5CF6' },
    { value: 'INSURANCE', label: 'Insurance', icon: '🛡️', color: '#14B8A6' },
    { value: 'SOFTWARE_SUBSCRIPTION', label: 'Software', icon: '💻', color: '#06B6D4' },
    { value: 'OTHER', label: 'Other', icon: '📋', color: '#6B7280' },
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/expenses/categories');
      setCategories(response.data ?? []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      showToast(error?.response?.data?.message ?? 'Failed to fetch expense categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCategory) {
        await api.put(`/expenses/categories/${editingCategory.id}`, formData);
      } else {
        await api.post('/expenses/categories', formData);
      }
      await fetchCategories();
      closeModal();
      showToast(editingCategory ? 'Category updated' : 'Category created', 'success');
    } catch (error: any) {
      console.error('Error saving category:', error);
      showToast(error?.response?.data?.message ?? 'Failed to save category', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      await api.delete(`/expenses/categories/${id}`);
      await fetchCategories();
      showToast('Category deleted', 'success');
    } catch (error: any) {
      console.error('Error deleting category:', error);
      showToast(error?.response?.data?.message ?? 'Failed to delete category', 'error');
    }
  };

  const openModal = (category?: ExpenseCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        type: category.type,
        icon: category.icon || '',
        color: category.color || '#3B82F6',
        isRecurring: category.isRecurring,
        defaultAmount: category.defaultAmount || 0
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        type: 'OTHER',
        icon: '',
        color: '#3B82F6',
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expense Categories</h1>
          <p className="text-gray-600 mt-1">Manage expense categories for your society</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
          >
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
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <h3 className="font-semibold text-lg text-gray-900 mb-1">
              {category.name}
            </h3>
            
            {category.description && (
              <p className="text-sm text-gray-600 mb-4">{category.description}</p>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {category._count.expenses} entries
              </span>
              {category.isRecurring && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                  Recurring
                </span>
              )}
            </div>

            {category.defaultAmount && category.defaultAmount > 0 && (
              <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                Default: ₹{category.defaultAmount.toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      color: selectedType?.color || '#3B82F6',
                      name: formData.name || selectedType?.label || ''
                    });
                  }}
                  className="w-full p-2 border rounded-lg"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon (emoji)
                  </label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="⚡"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label htmlFor="isRecurring" className="text-sm text-gray-700">
                  Recurring expense (auto-create monthly)
                </label>
              </div>

              {formData.isRecurring && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">₹</span>
                    <input
                      type="number"
                      value={formData.defaultAmount}
                      onChange={(e) => setFormData({ ...formData, defaultAmount: parseFloat(e.target.value) })}
                      className="w-full p-2 pl-8 border rounded-lg"
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
