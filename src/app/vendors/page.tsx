"use client";

import { Plus, Wrench } from "lucide-react";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { Pagination } from "@/components/Pagination";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { useConfirm } from "@/components/ConfirmDialog";
import { useVendors } from "@/hooks/useVendors";
import { Vendor, VendorForm, VendorCategoryId } from "@/types/vendor";

export default function VendorsPage() {
  return (
    <Suspense fallback={<AppShell title="Vendors Management"><div className="loading-state"><div className="loading-spinner w-10 h-10" /></div></AppShell>}>
      <VendorsPageInner />
    </Suspense>
  );
}

function VendorsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<VendorForm>({
    name: "",
    category: "PLUMBER",
    phone: "",
    email: "",
    description: "",
    isApproved: true
  });
  const [submitting, setSubmitting] = useState(false);
  const { confirm, ConfirmUI } = useConfirm();

  const initialOffset = Number(searchParams.get("offset")) || 0;

  const { data: vendorData, isLoading: loading } = useVendors({ limit: 50, offset: initialOffset });
  const vendors = vendorData?.vendors ?? [];
  const pgMeta = {
    total: vendorData?.total ?? 0,
    limit: vendorData?.limit ?? 50,
    offset: vendorData?.offset ?? 0,
  };

  const handlePageChange = (newOffset: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newOffset > 0) params.set("offset", String(newOffset));
    else params.delete("offset");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleOpenForm = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({
        name: vendor.name,
        category: vendor.category,
        phone: vendor.phone,
        email: vendor.email || "",
        description: vendor.description || "",
        isApproved: vendor.isApproved === true,
      });
    } else {
      setEditingVendor(null);
      setFormData({
        name: "",
        category: "PLUMBER",
        phone: "",
        email: "",
        description: "",
        isApproved: true
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingVendor(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        phone: formData.phone,
        email: formData.email || null,
        description: formData.description || null,
        isApproved: formData.isApproved
      };

      if (editingVendor) {
        await api.patch(`/vendors/${editingVendor.id}`, payload);
        showToast("Vendor updated successfully", "success");
      } else {
        await api.post("/vendors", payload);
        showToast("Vendor added successfully", "success");
      }

      handleCloseForm();
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { message?: string; issues?: { path?: (string | number)[]; message?: string }[] } } })?.response?.data;
      let message = data?.message ?? "Failed to save vendor";
      const firstIssue = data?.issues?.[0];
      if (firstIssue?.path?.length && firstIssue.message) {
        message = `${message}: ${firstIssue.path.join(".")} — ${firstIssue.message}`;
      }
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (vendorId: string) => {
    if (!(await confirm({ title: "Delete vendor", message: "Are you sure you want to delete this vendor?", confirmLabel: "Delete" }))) return;

    try {
      await api.delete(`/vendors/${vendorId}`);
      showToast("Vendor deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    } catch (error: unknown) {
      const message = parseApiError(error, "Failed to delete vendor").message;
      showToast(message, "error");
    }
  };

  return (
    <AppShell title="Vendors Management">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Service network"
          title="Vendors management"
          description="Manage approved vendors and service providers so admins can maintain a cleaner, more trusted supplier directory."
          icon={<Wrench className="h-6 w-6" />}
          actions={
            <button onClick={() => handleOpenForm()} className="btn btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Vendor
            </button>
          }
        />

        {showForm && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">
                {editingVendor ? "Edit Vendor" : "Add New Vendor"}
              </h2>
            </div>
            <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="Vendor name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as VendorCategoryId,
                      })
                    }
                    className="input"
                  >
                    <option value="PLUMBER">Plumber</option>
                    <option value="ELECTRICIAN">Electrician</option>
                    <option value="CARPENTER">Carpenter</option>
                    <option value="PAINTER">Painter</option>
                    <option value="SECURITY">Security</option>
                    <option value="CLEANER">Cleaning</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    maxLength={24}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input"
                    placeholder="+91 9876543210"
                  />
                  <p className="text-xs text-fg-secondary mt-1">8–24 characters (digits / + / spaces).</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Services offered, experience, etc."
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isApproved ?? false}
                    onChange={(e) => setFormData({ ...formData, isApproved: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-fg-primary">Approved Vendor</span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? "Saving..." : editingVendor ? "Update" : "Add Vendor"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        )}

        <div className="table-wrapper">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner w-10 h-10"></div>
              <p className="loading-state-text">Loading vendors...</p>
            </div>
          ) : vendors.length === 0 && pgMeta.total === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🔧</span>
              <p className="empty-state-title">No vendors found</p>
              <p className="empty-state-text">Click &quot;Add Vendor&quot; to add your first vendor.</p>
            </div>
          ) : (
            <>
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th scope="col" className="table-th">Name</th>
                    <th scope="col" className="table-th">Category</th>
                    <th scope="col" className="table-th">Phone</th>
                    <th scope="col" className="table-th">Email</th>
                    <th scope="col" className="table-th">Status</th>
                    <th scope="col" className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <tr key={vendor.id} className="table-row">
                      <td className="table-td font-medium">{vendor.name}</td>
                      <td className="table-td">{vendor.category}</td>
                      <td className="table-td">{vendor.phone}</td>
                      <td className="table-td">{vendor.email || "-"}</td>
                      <td className="table-td">
                        <span
                          className={`badge ${
                            vendor.isApproved === true
                              ? "badge-success"
                              : "badge-warning"
                          }`}
                        >
                          {vendor.isApproved === true ? "Approved" : "Pending"}
                        </span>
                      </td>
                      <td className="table-td">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenForm(vendor)}
                            className="text-brand-primary hover:text-info-fg text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(vendor.id)}
                            className="text-brand-danger hover:text-denied-fg text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                total={pgMeta.total}
                limit={pgMeta.limit}
                offset={pgMeta.offset}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </div>
      {ConfirmUI}
    </AppShell>
  );
}
