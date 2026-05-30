"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { useConfirm } from "@/components/ConfirmDialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";

type Asset = {
  id: string;
  name: string;
  category: string;
  location: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  purchaseValue: string | null;
  currentValue: string | null;
  condition: string;
  warrantyExpiry: string | null;
  assignedTo: string | null;
  notes: string | null;
};

const CONDITION_COLORS: Record<string, string> = {
  NEW: "bg-approved-bg text-approved-fg",
  GOOD: "bg-info-bg text-info-fg",
  FAIR: "bg-pending-bg text-pending-fg",
  POOR: "bg-pending-bg text-pending-fg",
  DECOMMISSIONED: "bg-denied-bg text-denied-fg",
};

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [catFilter, setCatFilter] = useState("");
  const [condFilter, setCondFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { confirm, ConfirmUI } = useConfirm();

  const [form, setForm] = useState({
    name: "", category: "", location: "", serialNumber: "",
    purchaseDate: "", purchaseValue: "", currentValue: "",
    condition: "GOOD", warrantyExpiry: "", assignedTo: "", notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const limit = 20;
      const offset = (page - 1) * limit;
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (catFilter) params.set("category", catFilter);
      if (condFilter) params.set("condition", condFilter);
      const { data } = await api.get(`/assets?${params}`);
      setAssets(data.assets);
      setTotalPages(Math.ceil((data.total || 1) / limit));
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [page, catFilter, condFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get("/assets/categories").then(({ data }) => setCategories(data.categories || []));
  }, []);

  const resetForm = () => {
    setForm({ name: "", category: "", location: "", serialNumber: "", purchaseDate: "", purchaseValue: "", currentValue: "", condition: "GOOD", warrantyExpiry: "", assignedTo: "", notes: "" });
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (a: Asset) => {
    setForm({
      name: a.name, category: a.category, location: a.location || "", serialNumber: a.serialNumber || "",
      purchaseDate: a.purchaseDate?.slice(0, 10) || "", purchaseValue: a.purchaseValue ? String(a.purchaseValue) : "",
      currentValue: a.currentValue ? String(a.currentValue) : "", condition: a.condition,
      warrantyExpiry: a.warrantyExpiry?.slice(0, 10) || "", assignedTo: a.assignedTo || "", notes: a.notes || "",
    });
    setEditing(a);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        purchaseValue: form.purchaseValue ? parseFloat(form.purchaseValue) : undefined,
        currentValue: form.currentValue ? parseFloat(form.currentValue) : undefined,
        purchaseDate: form.purchaseDate || undefined,
        warrantyExpiry: form.warrantyExpiry || undefined,
        location: form.location || undefined,
        serialNumber: form.serialNumber || undefined,
        assignedTo: form.assignedTo || undefined,
        notes: form.notes || undefined,
      };
      if (editing) {
        await api.patch(`/assets/${editing.id}`, payload);
      } else {
        await api.post("/assets", payload);
      }
      resetForm();
      load();
      api.get("/assets/categories").then(({ data }) => setCategories(data.categories || []));
    } catch (error) {
      showToast(parseApiError(error, "Failed to save asset").message, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Delete asset", message: "Delete this asset?", confirmLabel: "Delete" }))) return;
    try {
      await api.delete(`/assets/${id}`);
      load();
    } catch (error) {
      showToast(parseApiError(error, "Failed to delete asset").message, "error");
    }
  };

  return (
    <AppShell title="Asset Inventory">
      <div className="space-y-4">
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button key={c.name} onClick={() => { setCatFilter(catFilter === c.name ? "" : c.name); setPage(1); }}
                className={`rounded-full px-3 py-1 text-xs font-medium ${catFilter === c.name ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                {c.name} ({c.count})
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <select value={condFilter} onChange={(e) => { setCondFilter(e.target.value); setPage(1); }} className="rounded border px-3 py-2 text-sm">
            <option value="">All conditions</option>
            {["NEW", "GOOD", "FAIR", "POOR", "DECOMMISSIONED"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            <Plus size={16} /> Add Asset
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="rounded border bg-white p-4 shadow space-y-3">
            <h3 className="font-semibold">{editing ? "Edit Asset" : "New Asset"}</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium">Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium">Category *</label>
                <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" placeholder="e.g. Electronics, Furniture" />
              </div>
              <div>
                <label className="block text-sm font-medium">Condition</label>
                <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm">
                  {["NEW", "GOOD", "FAIR", "POOR", "DECOMMISSIONED"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Location</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium">Serial Number</label>
                <input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium">Assigned To</label>
                <input value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium">Purchase Date</label>
                <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium">Purchase Value</label>
                <input type="number" step="0.01" value={form.purchaseValue} onChange={(e) => setForm({ ...form, purchaseValue: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium">Current Value</label>
                <input type="number" step="0.01" value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium">Warranty Expiry</label>
                <input type="date" value={form.warrantyExpiry} onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              </div>
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
        ) : assets.length === 0 ? (
          <p className="text-gray-500">No assets found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Location</th>
                  <th className="px-4 py-2">Condition</th>
                  <th className="px-4 py-2">Value</th>
                  <th className="px-4 py-2">Warranty</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {assets.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{a.name}</td>
                    <td className="px-4 py-2">{a.category}</td>
                    <td className="px-4 py-2">{a.location || "-"}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CONDITION_COLORS[a.condition] || "bg-gray-100"}`}>{a.condition}</span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{a.currentValue ? fmt.format(Number(a.currentValue)) : a.purchaseValue ? fmt.format(Number(a.purchaseValue)) : "-"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {a.warrantyExpiry ? (
                        <span className={new Date(a.warrantyExpiry) < new Date() ? "text-red-600" : "text-green-600"}>
                          {new Date(a.warrantyExpiry).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(a)} className="rounded p-1 text-blue-600 hover:bg-blue-50"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(a.id)} className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
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
