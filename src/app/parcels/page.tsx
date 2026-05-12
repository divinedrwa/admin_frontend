"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";

type Parcel = {
  id: string;
  description: string;
  status: "PENDING" | "COLLECTED";
  receivedAt: string;
  collectedAt: string | null;
  villa: {
    villaNumber: string;
    block: string;
    ownerName: string;
  };
};

type Villa = {
  id: string;
  villaNumber: string;
  block: string;
  ownerName: string;
};

export default function ParcelsPage() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  const [deletingParcelId, setDeletingParcelId] = useState<string | null>(null);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "PENDING" | "COLLECTED">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [formData, setFormData] = useState({
    villaId: "",
    description: ""
  });

  const loadParcels = () => {
    setLoading(true);
    api
      .get("/parcels")
      .then((response) => setParcels(response.data.parcels ?? []))
      .catch(() => showToast("Failed to load parcels", "error"))
      .finally(() => setLoading(false));
  };

  const loadVillas = () => {
    api
      .get("/villas")
      .then((response) => setVillas(response.data.villas ?? []))
      .catch(() => showToast("Failed to load villas", "error"));
  };

  useEffect(() => {
    loadParcels();
    loadVillas();
  }, []);

  // Filter and search logic
  const filteredParcels = parcels.filter((parcel) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesVilla = parcel.villa.villaNumber.toLowerCase().includes(query);
      const matchesDesc = parcel.description.toLowerCase().includes(query);
      if (!matchesVilla && !matchesDesc) return false;
    }
    if (statusFilter !== "all" && parcel.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredParcels.length / itemsPerPage);
  const paginatedParcels = filteredParcels.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

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
    if (!window.confirm("Are you sure you want to delete this parcel record? This action cannot be undone.")) {
      return;
    }

    setDeletingParcelId(parcelId);
    try {
      await api.delete(`/parcels/${parcelId}`);
      showToast("Parcel deleted successfully", "success");
      loadParcels();
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
      loadParcels();
    } catch (error: unknown) {
      const message = parseApiError(error, editingParcel ? "Failed to update parcel" : "Failed to log parcel").message;
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Parcels">
      <div className="space-y-4">
        <div className="page-action-bar">
          <p className="text-fg-secondary">Track parcel deliveries and collections</p>
          <button
            onClick={handleOpenForm}
            className="btn btn-primary"
          >
            + Log Parcel
          </button>
        </div>

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
          <div className="mt-3 flex justify-between items-center text-sm">
            <span className="text-fg-secondary">Showing {paginatedParcels.length} of {filteredParcels.length} parcels</span>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
                <span>Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
              </div>
            )}
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
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th className="table-th">Villa</th>
                  <th className="table-th">Description</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Received</th>
                  <th className="table-th">Collected</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParcels.length === 0 ? (
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
                  paginatedParcels.map((parcel) => (
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
          )}
        </div>
      </div>
    </AppShell>
  );
}
