"use client";

import { useState, useEffect, useMemo, useRef, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Plus, Upload, X } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";

type FinancialYear = { id: string; label: string; startDate: string; endDate: string };

type FormState = {
  categoryId: string;
  title: string;
  description: string;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  paymentRef: string;
  paidTo: string;
  paidToContact: string;
  receiptNumber: string;
  invoiceNumber: string;
  financialYearId: string;
  month: number;
  year: number;
  gstPercentage: number;
  gstAmount: number;
  tdsPercentage: number;
  tdsAmount: number;
  notes: string;
  tags: string[];
};

type ApiError = {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
};

export default function EditExpensePage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [categories, setCategories] = useState<{ id: string; name: string; icon?: string; isActive?: boolean }[]>([]);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [loadingExpense, setLoadingExpense] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formData, setFormData] = useState<FormState>({
    categoryId: "",
    title: "",
    description: "",
    amount: 0,
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMode: "UPI",
    paymentRef: "",
    paidTo: "",
    paidToContact: "",
    receiptNumber: "",
    invoiceNumber: "",
    financialYearId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    gstPercentage: 0,
    gstAmount: 0,
    tdsPercentage: 0,
    tdsAmount: 0,
    notes: "",
    tags: [],
  });

  const [tagInput, setTagInput] = useState("");

  type ExistingAttachment = { id: string; fileName: string; fileUrl: string; fileType: string; fileSize: number };
  const [existingAttachments, setExistingAttachments] = useState<ExistingAttachment[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Track whether the user manually changed paymentDate (vs initial load)
  const initialLoadDone = useRef(false);
  const userChangedDate = useRef(false);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      setLoadingExpense(true);
      setLoadError(null);
      try {
        const [catRes, expRes, fyRes] = await Promise.all([
          api.get(`/expenses/categories`),
          api.get(`/expenses/${id}`),
          api.get('/v1/admin/financial-years'),
        ]);

        const cats = catRes.data ?? [];
        const exp = expRes.data;
        const fys: FinancialYear[] = fyRes.data.financialYears ?? [];

        if (cancelled) return;

        setCategories((cats as { id: string; name: string; icon?: string; isActive?: boolean }[]).filter((c) => c.isActive !== false));
        setFinancialYears(fys);

        const pd = exp.paymentDate
          ? new Date(exp.paymentDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];

        setFormData({
          categoryId: exp.categoryId || "",
          title: exp.title || "",
          description: exp.description || "",
          amount: typeof exp.amount === "number" ? exp.amount : 0,
          paymentDate: pd,
          paymentMode: exp.paymentMode || "UPI",
          paymentRef: exp.paymentRef || "",
          paidTo: exp.paidTo || "",
          paidToContact: exp.paidToContact || "",
          receiptNumber: exp.receiptNumber || "",
          invoiceNumber: exp.invoiceNumber || "",
          financialYearId: exp.financialYear?.id || exp.financialYearId || "",
          month: typeof exp.month === "number" ? exp.month : new Date().getMonth() + 1,
          year: typeof exp.year === "number" ? exp.year : new Date().getFullYear(),
          gstPercentage: typeof exp.gstPercentage === "number" ? exp.gstPercentage : 0,
          gstAmount: typeof exp.gstAmount === "number" ? exp.gstAmount : 0,
          tdsPercentage: typeof exp.tdsPercentage === "number" ? exp.tdsPercentage : 0,
          tdsAmount: typeof exp.tdsAmount === "number" ? exp.tdsAmount : 0,
          notes: exp.notes || "",
          tags: Array.isArray(exp.tags) ? exp.tags : [],
        });

        if (
          (typeof exp.gstPercentage === "number" && exp.gstPercentage > 0) ||
          (typeof exp.tdsPercentage === "number" && exp.tdsPercentage > 0) ||
          (exp.notes && String(exp.notes).length > 0) ||
          (Array.isArray(exp.tags) && exp.tags.length > 0)
        ) {
          setShowAdvanced(true);
        }

        if (Array.isArray(exp.attachments)) {
          setExistingAttachments(
            exp.attachments.map((a: ExistingAttachment) => ({
              id: a.id,
              fileName: a.fileName,
              fileUrl: a.fileUrl,
              fileType: a.fileType || '',
              fileSize: typeof a.fileSize === 'number' ? a.fileSize : 0,
            }))
          );
        }

        // Mark initial load complete so auto-sync doesn't overwrite saved values
        initialLoadDone.current = true;
      } catch (err: unknown) {
        const apiError = err as ApiError;
        if (!cancelled) {
          setLoadError(
            apiError.response?.status === 404 ? "Expense not found." : "Could not load expense."
          );
        }
      } finally {
        if (!cancelled) setLoadingExpense(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (formData.gstPercentage > 0) {
      const gst = (formData.amount * formData.gstPercentage) / 100;
      setFormData((prev) => ({ ...prev, gstAmount: parseFloat(gst.toFixed(2)) }));
    }
  }, [formData.amount, formData.gstPercentage]);

  useEffect(() => {
    if (formData.tdsPercentage > 0) {
      const tds = (formData.amount * formData.tdsPercentage) / 100;
      setFormData((prev) => ({ ...prev, tdsAmount: parseFloat(tds.toFixed(2)) }));
    }
  }, [formData.amount, formData.tdsPercentage]);

  const monthOptions = useMemo(() => {
    const fy = financialYears.find(x => x.id === formData.financialYearId);
    if (!fy) return [];
    const start = new Date(fy.startDate);
    const end = new Date(fy.endDate);
    const rows: { month: number; year: number; label: string }[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      rows.push({
        month: cursor.getMonth() + 1,
        year: cursor.getFullYear(),
        label: cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return rows;
  }, [financialYears, formData.financialYearId]);

  // Auto-sync: paymentDate → FY + Month (only when user changes the date, not on initial load)
  useEffect(() => {
    if (!formData.paymentDate || financialYears.length === 0) return;
    if (!userChangedDate.current) return;

    const date = new Date(formData.paymentDate + 'T00:00:00');
    if (isNaN(date.getTime())) return;

    const matchedFy = financialYears.find(fy => {
      const start = new Date(fy.startDate);
      const end = new Date(fy.endDate);
      return date >= start && date <= end;
    });

    setFormData(prev => ({
      ...prev,
      financialYearId: matchedFy?.id ?? '',
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    }));
  }, [formData.paymentDate, financialYears]);

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const incoming = Array.from(e.target.files);
      const valid: File[] = [];
      for (const f of incoming) {
        if (f.size > 10 * 1024 * 1024) {
          showToast(`"${f.name}" exceeds 10 MB limit`, "error");
          continue;
        }
        valid.push(f);
      }
      const total = existingAttachments.length + newFiles.length + valid.length;
      if (total > 20) {
        showToast("Too many files. Maximum 20 attachments allowed.", "error");
        return;
      }
      setNewFiles((prev) => [...prev, ...valid]);
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!id) return;
    try {
      await api.delete(`/expenses/${id}/attachments/${attachmentId}`);
      setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      showToast("Attachment deleted", "success");
    } catch (err: unknown) {
      showToast(parseApiError(err, "Failed to delete attachment").message, "error");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await api.put(`/expenses/${id}`, {
        categoryId: formData.categoryId,
        title: formData.title,
        description: formData.description || undefined,
        amount: formData.amount,
        paymentDate: formData.paymentDate,
        paymentMode: formData.paymentMode,
        paymentRef: formData.paymentRef || undefined,
        paidTo: formData.paidTo,
        paidToContact: formData.paidToContact || undefined,
        receiptNumber: formData.receiptNumber || undefined,
        invoiceNumber: formData.invoiceNumber || undefined,
        financialYearId: formData.financialYearId || undefined,
        month: formData.month,
        year: formData.year,
        gstAmount: formData.gstAmount,
        gstPercentage: formData.gstPercentage,
        tdsAmount: formData.tdsAmount,
        tdsPercentage: formData.tdsPercentage,
        notes: formData.notes || undefined,
        tags: formData.tags,
      });

      // Upload new files and attach to expense
      if (newFiles.length > 0) {
        setUploading(true);
        type AttachmentMeta = { fileName: string; fileUrl: string; fileType: string; fileSize: number };
        const uploadedAttachments: AttachmentMeta[] = [];

        for (let i = 0; i < newFiles.length; i += 5) {
          const batch = newFiles.slice(i, i + 5);
          const fd = new FormData();
          batch.forEach((f) => fd.append("files", f));
          const uploadRes = await api.post("/expenses/upload-attachment", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          uploadedAttachments.push(...(uploadRes.data.attachments as AttachmentMeta[]));
        }

        await api.post(`/expenses/${id}/attachments`, {
          attachments: uploadedAttachments,
        });
        setUploading(false);
      }

      showToast("Expense updated", "success");
      router.push(`/expenses/${id}`);
    } catch (err: unknown) {
      showToast(parseApiError(err, "Failed to update expense").message, "error");
    } finally {
      setUploading(false);
      setSaving(false);
    }
  }

  const netAmount = formData.amount + formData.gstAmount - formData.tdsAmount;

  if (!id) {
    return (
      <div className="p-6">
        <p className="text-fg-secondary">Invalid expense link.</p>
        <Link href="/expenses" className="text-brand-primary mt-2 inline-block">
          Back to expenses
        </Link>
      </div>
    );
  }

  if (loadingExpense) {
    return (
      <div className="loading-state">
        <div className="loading-spinner w-10 h-10"></div>
        <p className="loading-state-text">Loading expense...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 max-w-lg">
        <Link href="/expenses" className="inline-flex items-center gap-2 text-brand-primary mb-4">
          <ArrowLeft size={18} /> Back to expenses
        </Link>
        <div className="card">
          <div className="card-body">
            <p className="text-fg-primary font-medium">{loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href={`/expenses/${id}`} className="flex items-center gap-2 text-fg-secondary hover:text-fg-primary mb-4">
          <ArrowLeft size={20} />
          Back to expense
        </Link>
        <h1 className="text-3xl font-bold text-fg-primary">Edit expense</h1>
        <p className="text-fg-secondary mt-1">Update details and save changes</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-fg-primary">Basic information</h2>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Category *</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="input"
                required
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="input"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-fg-secondary">₹</span>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="input pl-8"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">Payment date *</label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => {
                    userChangedDate.current = true;
                    setFormData({ ...formData, paymentDate: e.target.value });
                  }}
                  className="input"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-fg-primary">Payment details</h2>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">Payment mode *</label>
                <select
                  value={formData.paymentMode}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                  className="input"
                  required
                >
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="ONLINE">Online</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">Payment reference</label>
                <input
                  type="text"
                  value={formData.paymentRef}
                  onChange={(e) => setFormData({ ...formData, paymentRef: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">Paid to *</label>
                <input
                  type="text"
                  value={formData.paidTo}
                  onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">Contact</label>
                <input
                  type="text"
                  value={formData.paidToContact}
                  onChange={(e) => setFormData({ ...formData, paidToContact: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">Receipt number</label>
                <input
                  type="text"
                  value={formData.receiptNumber}
                  onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">Invoice number</label>
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            {/* Financial Period */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">Financial Year *</label>
                <select
                  value={formData.financialYearId}
                  onChange={(e) => setFormData({ ...formData, financialYearId: e.target.value })}
                  className="input"
                >
                  <option value="">Select Financial Year</option>
                  {[...financialYears]
                    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                    .map(fy => (
                      <option key={fy.id} value={fy.id}>{fy.label}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">Billing Month *</label>
                <select
                  value={monthOptions.length > 0 ? `${formData.month}-${formData.year}` : ''}
                  onChange={(e) => {
                    const [m, y] = e.target.value.split('-').map(Number);
                    setFormData(prev => ({ ...prev, month: m, year: y }));
                  }}
                  className="input"
                  disabled={!formData.financialYearId || monthOptions.length === 0}
                >
                  <option value="">Select Month</option>
                  {monthOptions.map(opt => (
                    <option key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-fg-secondary -mt-2">
              Auto-selected from payment date. Change manually if needed.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-left"
            >
              <h2 className="text-lg font-semibold text-fg-primary">GST, TDS, notes & tags</h2>
              <span className="text-fg-secondary">{showAdvanced ? "▼" : "▶"}</span>
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-1">GST %</label>
                    <input
                      type="number"
                      value={formData.gstPercentage}
                      onChange={(e) => setFormData({ ...formData, gstPercentage: parseFloat(e.target.value) || 0 })}
                      className="input"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-1">GST amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-fg-secondary">₹</span>
                      <input
                        type="number"
                        value={formData.gstAmount}
                        onChange={(e) => setFormData({ ...formData, gstAmount: parseFloat(e.target.value) || 0 })}
                        className="input pl-8 bg-surface-background"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-1">TDS %</label>
                    <input
                      type="number"
                      value={formData.tdsPercentage}
                      onChange={(e) => setFormData({ ...formData, tdsPercentage: parseFloat(e.target.value) || 0 })}
                      className="input"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-1">TDS amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-fg-secondary">₹</span>
                      <input
                        type="number"
                        value={formData.tdsAmount}
                        onChange={(e) => setFormData({ ...formData, tdsAmount: parseFloat(e.target.value) || 0 })}
                        className="input pl-8 bg-surface-background"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-brand-primary-light p-4 rounded-lg flex justify-between items-center">
                  <span className="text-sm font-medium text-info-fg">Net amount</span>
                  <span className="text-xl font-bold text-info-fg">₹{netAmount.toLocaleString()}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      className="input flex-1"
                    />
                    <button type="button" onClick={addTag} className="btn btn-ghost">
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="badge badge-info inline-flex items-center gap-1"
                      >
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-info-fg">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Receipts & Documents */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-fg-primary">Receipts & Documents</h2>
          </div>
          <div className="card-body space-y-4">
            {/* Existing attachments */}
            {existingAttachments.length > 0 && (
              <div className="space-y-2">
                {existingAttachments.map((a) => {
                  const isImage = a.fileType?.startsWith("image/");
                  return (
                    <div key={a.id} className="flex items-center justify-between bg-surface-background p-3 rounded">
                      <div className="flex items-center gap-3 min-w-0">
                        {isImage ? (
                          <img src={a.fileUrl} alt={a.fileName} className="w-10 h-10 object-cover rounded shrink-0" />
                        ) : (
                          <FileText size={24} className="text-fg-tertiary shrink-0" />
                        )}
                        <div className="min-w-0">
                          <a
                            href={a.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-brand-primary hover:underline truncate block"
                          >
                            {a.fileName}
                          </a>
                          {a.fileSize > 0 && (
                            <div className="text-xs text-fg-secondary">
                              {a.fileSize < 1024 * 1024
                                ? `${(a.fileSize / 1024).toFixed(1)} KB`
                                : `${(a.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(a.id)}
                        className="text-brand-danger hover:text-brand-danger shrink-0 ml-2"
                        title="Remove attachment"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upload new files */}
            <div className="border-2 border-dashed border-surface-border rounded-lg p-6">
              <div className="text-center">
                <Upload size={48} className="mx-auto text-fg-tertiary mb-4" />
                <label className="cursor-pointer">
                  <span className="text-brand-primary hover:text-brand-primary font-medium">
                    Upload files
                  </span>
                  <span className="text-fg-secondary"> or drag and drop</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-fg-secondary mt-2">
                  PNG, JPG, PDF up to 10MB each
                </p>
              </div>
            </div>

            {/* New files queued */}
            {newFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-fg-secondary uppercase">New files to upload</p>
                {newFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-surface-background p-3 rounded">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {file.type.startsWith("image/") ? "📷" : "📄"}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-fg-primary">{file.name}</div>
                        <div className="text-xs text-fg-secondary">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewFiles((prev) => prev.filter((_, i) => i !== index))}
                      className="text-brand-danger hover:text-brand-danger"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <Link href={`/expenses/${id}`} className="btn btn-ghost flex-1 text-center">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || uploading}
            className="btn btn-primary flex-1 disabled:bg-fg-tertiary"
          >
            {uploading ? "Uploading files..." : saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
