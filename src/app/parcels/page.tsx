"use client";

import { Package, Plus } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { Pagination } from "@/components/Pagination";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { sortByVillaNumber } from "@/utils/villaSort";
import { useConfirm } from "@/components/ConfirmDialog";
import { useParcels } from "@/hooks/useParcels";
import { useVillas } from "@/hooks/useVillas";
import { Parcel } from "@/types/parcel";
import { VillaOption } from "@/types/villa";

export default function ParcelsPage() {
  return (
    <Suspense fallback={<AppShell title="Parcels"><div className="loading-state"><div className="loading-spinner w-10 h-10" /></div></AppShell>}>
      <ParcelsPageInner />
    </Suspense>
  );
}

function ParcelsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  const [deletingParcelId, setDeletingParcelId] = useState<string | null>(null);
  const { confirm, ConfirmUI } = useConfirm();

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "PENDING" | "COLLECTED">("all");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [formData, setFormData] = useState({
    villaId: "",
    description: ""
  });

  const initialOffset = Number(searchParams.get("offset")) || 0;

  const queryParams = useMemo(() => {
    const p: Record<string, unknown> = { limit: 50, offset: initialOffset };
    if (debouncedSearch) p.search = debouncedSearch;
    if (statusFilter !== "all") p.status = statusFilter;
    return p;
  }, [initialOffset, debouncedSearch, statusFilter]);

  const { data: parcelData, isLoading: loading } = useParcels(queryParams);
  const parcels = parcelData?.parcels ?? [];
  const pgMeta = {
    total: parcelData?.total ?? 0,
    limit: parcelData?.limit ?? 50,
    offset: parcelData?.offset ?? 0,
  };

  const { data: villaData } = useVillas();
  const villas = useMemo(
    () => sortByVillaNumber(
      (villaData?.villas ?? []) as VillaOption[],
      (v) => v.villaNumber,
    ),
    [villaData?.villas],
  );

  const handlePageChange = (newOffset: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newOffset > 0) params.set("offset", String(newOffset));
    else params.delete("offset");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Counts derived from server-filtered results
  const pendingCount = parcels.filter(p => p.status === "PENDING").length;
  const collectedCount = parcels.filter(p => p.status === "COLLECTED").length;

  const handleOpenForm = () => {
    setEditingParcel(null);
    setFormData({ villaId: "", description: "" });
    setShowForm(true);
  };

  const handleEdit = (parcel: Parcel) => {
    setEditingParcel(parcel);
    setFormData({
      villaId: "", // Villa can't be changed for existing parcel
      description: parcel.description
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingParcel(null);
  };

  const handleDelete = async (parcelId: string) => {
    if (!(await confirm({ title: "Delete parcel", message: "Are you sure you want to delete this parcel record? This action cannot be undone.", confirmLabel: "Delete" }))) {
      return;
    }

    setDeletingParcelId(parcelId);
    try {
      await api.delete(`/parcels/${parcelId}`);
      showToast("Parcel deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["parcels"] });
    } catch (error: unknown) {
      const message = parseApiError(error, "Failed to delete parcel").message;
      showToast(message, "error");
    } finally {
      setDeletingParcelId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingParcel && !formData.villaId) {
      showToast("Please select a villa", "error");
      return;
    }

    if (!formData.description) {
      showToast("Please enter a description", "error");
      return;
    }

    setSubmitting(true);

    try {
      if (editingParcel) {
        await api.put(`/parcels/${editingParcel.id}`, { description: formData.description });
        showToast("Parcel updated successfully", "success");
      } else {
        await api.post("/parcels", formData);
        showToast("Parcel logged successfully", "success");
      }
      handleCloseForm();
      queryClient.invalidateQueries({ queryKey: ["parcels"] });
    } catch (error: unknown) {
      const message = parseApiError(error, editingParcel ? "Failed to update parcel" : "Failed to log parcel").message;
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Parcels">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Delivery desk"
          title="Parcels"
          description={`Track parcel deliveries, pending pickups, and collection history for residents from one queue.${pendingCount ? ` ${pendingCount} parcel(s) are still pending collection.` : ""}`}
          icon={<Package className="h-6 w-6" />}
          actions={
            <button onClick={handleOpenForm} className="btn btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Log Parcel
            </button>
          }
        />

        {/* Search and Filters */}
        <div className="filter-bar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search by villa or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input text-sm"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="input text-sm"
              >
                <option value="all">All Status ({parcels.length})</option>
                <option value="PENDING">Pending ({pendingCount})</option>
                <option value="COLLECTED">Collected ({collectedCount})</option>
              </select>
            </div>
          </div>
          <div className="mt-3 text-sm text-fg-secondary">
            Showing {parcels.length} of {pgMeta.total} parcels
          </div>
        </div>

        {showForm && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">{editingParcel ? "Edit Parcel" : "Log New Parcel"}</h2>
            </div>
            <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingParcel && (
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Villa *
                  </label>
                  <select
                    required
                    value={formData.villaId}
                    onChange={(e) => setFormData({ ...formData, villaId: e.target.value })}
                    className="input"
                  >
                    <option value="">Select villa</option>
                    {villas.map((villa) => (
                      <option key={villa.id} value={villa.id}>
                        Villa {villa.villaNumber} {villa.block && `- Block ${villa.block}`} ({villa.ownerName})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {editingParcel && (
                <div className="bg-surface-background p-3 rounded">
                  <p className="text-sm text-fg-secondary">
                    <span className="font-medium">Villa:</span> {editingParcel.villa.villaNumber}
                    {editingParcel.villa.block && ` (${editingParcel.villa.block})`}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  placeholder="e.g., Amazon package, Courier envelope"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? (editingParcel ? "Updating..." : "Logging...") : (editingParcel ? "Update Parcel" : "Log Parcel")}
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

        <div className="table-wrapper overflow-x-auto">
          {loading ? (
            <div className="loading-state"><div className="loading-spinner w-10 h-10"></div><p className="loading-state-text">Loading parcels...</p></div>
          ) : (
            <>
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th scope="col" className="table-th">Villa</th>
                    <th scope="col" className="table-th">Description</th>
                    <th scope="col" className="table-th">Status</th>
                    <th scope="col" className="table-th">Received</th>
                    <th scope="col" className="table-th">Collected</th>
                    <th scope="col" className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {parcels.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          <span className="empty-state-icon">📦</span>
                          <p className="empty-state-title">{searchQuery || statusFilter !== "all" ? "No matching parcels" : "No parcels found"}</p>
                          <p className="empty-state-text">{searchQuery || statusFilter !== "all" ? "No parcels match your search criteria." : "Click \"Log Parcel\" to add one."}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    parcels.map((parcel) => (
                      <tr key={parcel.id} className="table-row">
                        <td className="table-td">
                          {parcel.villa.villaNumber}
                          {parcel.villa.block ? ` (${parcel.villa.block})` : ""}
                        </td>
                        <td className="table-td">{parcel.description}</td>
                        <td className="table-td">
                          <span className={`badge ${parcel.status === "COLLECTED" ? "badge-success" : "badge-warning"}`}>
                            {parcel.status}
                          </span>
                        </td>
                        <td className="table-td text-xs">{new Date(parcel.receivedAt).toLocaleString()}</td>
                        <td className="table-td text-xs">
                          {parcel.collectedAt ? new Date(parcel.collectedAt).toLocaleString() : "-"}
                        </td>
                        <td className="table-td">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(parcel)}
                              className="p-1 text-brand-primary hover:bg-brand-primary-light rounded"
                              title="Edit parcel"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(parcel.id)}
                              disabled={deletingParcelId === parcel.id}
                              className="p-1 text-brand-danger hover:bg-denied-bg rounded disabled:opacity-50"
                              title="Delete parcel"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
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
