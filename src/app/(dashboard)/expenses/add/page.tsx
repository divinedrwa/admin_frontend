'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X, Plus } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { showToast } from '@/components/Toast';
import { parseApiError } from "@/utils/errorHandler";

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AddExpensePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formData, setFormData] = useState({
    categoryId: '',
    title: '',
    description: '',
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'UPI',
    paymentRef: '',
    paidTo: '',
    paidToContact: '',
    receiptNumber: '',
    invoiceNumber: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    gstPercentage: 0,
    gstAmount: 0,
    tdsPercentage: 0,
    tdsAmount: 0,
    notes: '',
    tags: [] as string[],
  });

  const [files, setFiles] = useState<File[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    // Auto-calculate GST amount
    if (formData.gstPercentage > 0) {
      const gst = (formData.amount * formData.gstPercentage) / 100;
      setFormData(prev => ({ ...prev, gstAmount: parseFloat(gst.toFixed(2)) }));
    }
  }, [formData.amount, formData.gstPercentage]);

  useEffect(() => {
    // Auto-calculate TDS amount
    if (formData.tdsPercentage > 0) {
      const tds = (formData.amount * formData.tdsPercentage) / 100;
      setFormData(prev => ({ ...prev, tdsAmount: parseFloat(tds.toFixed(2)) }));
    }
  }, [formData.amount, formData.tdsPercentage]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/expenses/categories');
      const data = response.data ?? [];
      setCategories(data.filter((cat: any) => cat.isActive));
      
      // Set first category as default
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, categoryId: data[0].id }));
      }
    } catch (error: unknown) {
      console.error('Error fetching categories:', error);
      showToast(parseApiError(error, "Failed to fetch categories").message, 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // For now, we'll skip file upload and just save expense data
      // In production, you'd upload files first and get URLs
      
      await api.post('/expenses', {
        ...formData,
        attachments: [] // Add file upload logic here
      });
      showToast('Expense created successfully', 'success');
      router.push('/expenses');
    } catch (error: unknown) {
      console.error('Error creating expense:', error);
      showToast(parseApiError(error, "Failed to create expense").message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const netAmount = formData.amount + formData.gstAmount - formData.tdsAmount;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/expenses"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Expenses
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Add New Expense</h1>
        <p className="text-gray-600 mt-1">Record a new expense with receipt</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full p-2 border rounded-lg"
              required
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
            <div className="mt-2">
              <Link href="/expense-categories" className="text-sm text-blue-600 hover:text-blue-700">
                + Add New Category
              </Link>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Electricity Bill - April 2026"
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full p-2 border rounded-lg"
              placeholder="Additional details about this expense..."
            />
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">₹</span>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 pl-8 border rounded-lg"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Mode *
              </label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className="w-full p-2 border rounded-lg"
                required
              >
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            {/* Payment Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Reference
              </label>
              <input
                type="text"
                value={formData.paymentRef}
                onChange={(e) => setFormData({ ...formData, paymentRef: e.target.value })}
                placeholder="Transaction ID, Cheque Number, etc."
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Paid To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paid To *
              </label>
              <input
                type="text"
                value={formData.paidTo}
                onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                placeholder="Vendor/Person name"
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>

            {/* Contact */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact (Phone/Email)
              </label>
              <input
                type="text"
                value={formData.paidToContact}
                onChange={(e) => setFormData({ ...formData, paidToContact: e.target.value })}
                placeholder="Phone or Email"
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Receipt Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receipt Number
              </label>
              <input
                type="text"
                value={formData.receiptNumber}
                onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {/* Invoice Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {/* Month/Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month/Year
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                  className="flex-1 p-2 border rounded-lg"
                >
                  {MONTHS.map((month, index) => (
                    <option key={index} value={index + 1}>{month.substring(0, 3)}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-20 p-2 border rounded-lg"
                  min="2020"
                  max="2030"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Receipts/Attachments */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Receipts & Documents</h2>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <label className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700 font-medium">
                  Upload files
                </span>
                <span className="text-gray-600"> or drag and drop</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-sm text-gray-500 mt-2">
                PNG, JPG, PDF up to 10MB each
              </p>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {file.type.includes('image') ? '📷' : '📄'}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{file.name}</div>
                      <div className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Advanced Options */}
        <div className="bg-white rounded-lg shadow p-6">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-left"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Advanced Options (GST, TDS, Notes)
            </h2>
            <span className="text-gray-500">{showAdvanced ? '▼' : '▶'}</span>
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4">
              {/* GST */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST %
                  </label>
                  <input
                    type="number"
                    value={formData.gstPercentage}
                    onChange={(e) => setFormData({ ...formData, gstPercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border rounded-lg"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">₹</span>
                    <input
                      type="number"
                      value={formData.gstAmount}
                      onChange={(e) => setFormData({ ...formData, gstAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 pl-8 border rounded-lg bg-gray-50"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* TDS */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TDS %
                  </label>
                  <input
                    type="number"
                    value={formData.tdsPercentage}
                    onChange={(e) => setFormData({ ...formData, tdsPercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border rounded-lg"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TDS Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">₹</span>
                    <input
                      type="number"
                      value={formData.tdsAmount}
                      onChange={(e) => setFormData({ ...formData, tdsAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 pl-8 border rounded-lg bg-gray-50"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* Net Amount Display */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900">Net Amount Paid:</span>
                  <span className="text-2xl font-bold text-blue-900">
                    ₹{netAmount.toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Base: ₹{formData.amount.toLocaleString()} + GST: ₹{formData.gstAmount.toLocaleString()} - TDS: ₹{formData.tdsAmount.toLocaleString()}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Any additional notes or comments..."
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add tag (press Enter)"
                    className="flex-1 p-2 border rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-blue-900"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <Link
            href="/expenses"
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-center hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      </form>
    </div>
  );
}
