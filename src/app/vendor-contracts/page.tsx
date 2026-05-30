"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { Vendor } from "@/types/vendor";

type Contract = {
  id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  amount: string;
  paymentTerms: string | null;
  autoRenew: boolean;
  documentUrl: string | null;
  notes: string | null;
  description: string | null;
  vendor: Vendor;
  createdBy: { id: string; name: string };
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-surface-elevated text-fg-secondary",
  ACTIVE: "bg-approved-bg text-approved-fg",
  EXPIRED: "bg-denied-bg text-denied-fg",
  TERMINATED: "bg-pending-bg text-pending-fg",
  RENEWED: "bg-info-bg text-info-fg",
};

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default function VendorContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { confirm, ConfirmUI } = useConfirm();

  const [form, setForm] = useState({
    vendorId: "",
    title: "",
    description: "",
    status: "DRAFT",
    startDate: "",
    endDate: "",
    amount: "",
    paymentTerms: "",
    autoRenew: false,
    notes: "",
  });

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const limit = 20;
      const offset = (page - 1) * limit;
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (statusFilter) params.set("status", statusFilter);
      const { data } = await api.get(`/vendor-contracts?${params}`, { signal });
      setContracts(data.contracts);
      setTotalPages(Math.ceil((data.total || 1) / limit));
    } catch (error) {
      if ((error as { name?: string }).name === "CanceledError") return;
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    const controller = new AbortController();
    api.get("/vendors?limit=200", { signal: controller.signal }).then(({ data }) => setVendors(data.vendors || [])).catch((error) => {
      if ((error as { name?: string }).name === "CanceledError") return;
    });
    return () => controller.abort();
  }, []);

  const resetForm = () => {
    setForm({ vendorId: "", title: "", description: "", status: "DRAFT", startDate: "", endDate: "", amount: "", paymentTerms: "", autoRenew: false, notes: "" });
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (c: Contract) => {
    setForm({
      vendorId: c.vendor.id,
      title: c.title,
      description: c.description || "",
      status: c.status,
      startDate: c.startDate.slice(0, 10),
      endDate: c.endDate.slice(0, 10),
      amount: String(c.amount),
      paymentTerms: c.paymentTerms || "",
      autoRenew: c.autoRenew,
      notes: c.notes || "",
    });
    setEditing(c);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, amount: parseFloat(form.amount) || 0 };
      if (editing) {
        await api.patch(`/vendor-contracts/${editing.id}`, payload);
      } else {
        await api.post("/vendor-contracts", payload);
      }
      resetForm();
      load();
    } catch (error) {
      showToast(parseApiError(error, "Failed to save contract").message, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Delete contract", message: "Delete this contract?", confirmLabel: "Delete" }))) return;
    try {
      await api.delete(`/vendor-contracts/${id}`);
      load();
    } catch (error) {
      showToast(parseApiError(error, "Failed to delete contract").message, "error");
    }
  };

  return (
    <AppShell title="Vendor Contracts">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded border px-3 py-2 text-sm">
              <option value="">All statuses</option>
              {["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED", "RENEWED"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            <Plus size={16} /> New Contract
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="rounded border bg-white p-4 shadow space-y-3">
            <h3 className="font-semibold">{editing ? "Edit Contract" : "New Contract"}</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">Vendor *</label>
                <select required value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" disabled={!!editing}>
                  <option value="">Select vendor...</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.category})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Title *</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium">Start Date *</label>
                <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium">End Date *</label>
                <input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium">Amount *</label>
                <input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm">
                  {["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED", "RENEWED"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Payment Terms</label>
                <input value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" placeholder="e.g. Monthly, Quarterly" />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" checked={form.autoRenew} onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })} id="autoRenew" />
                <label htmlFor="autoRenew" className="text-sm">Auto-renew</label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Description</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium">Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">{editing ? "Update" : "Create"}</button>
              <button type="button" onClick={resetForm} className="rounded border px-4 py-2 text-sm">Cancel</button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : contracts.length === 0 ? (
          <p className="text-gray-500">No contracts found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Vendor</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Period</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Auto-renew</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">
                      {c.title}
                      {c.documentUrl && (
                        <a href={c.documentUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500"><ExternalLink size={12} className="inline" /></a>
                      )}
                    </td>
                    <td className="px-4 py-2">{c.vendor.name}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] || "bg-gray-100"}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{fmtDate(c.startDate)} - {fmtDate(c.endDate)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{fmt.format(Number(c.amount))}</td>
                    <td className="px-4 py-2">{c.autoRenew ? "Yes" : "No"}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(c)} className="rounded p-1 text-blue-600 hover:bg-blue-50"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(c.id)} className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-1 text-sm disabled:opacity-50">Previous</button>
            <span className="px-3 py-1 text-sm">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded border px-3 py-1 text-sm disabled:opacity-50">Next</button>
          </div>
        )}
      </div>
      {ConfirmUI}
    </AppShell>
  );
}
