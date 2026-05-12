"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";

type VisitorVilla = {
  villa: {
    villaNumber: string;
    block: string;
  };
};

type Visitor = {
  id: string;
  name: string;
  phone: string;
  purpose: string;
  visitorType: string;
  vehicleNumber: string | null;
  checkInAt: string;
  checkOutAt: string | null;
  villaVisits: VisitorVilla[];
  gate: {
    name: string;
  } | null;
};

type Villa = {
  id: string;
  villaNumber: string;
  block: string;
  ownerName: string;
};

type Gate = {
  id: string;
  name: string;
  location: string;
};

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active">("all");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingVisitorId, setDeletingVisitorId] = useState<string | null>(null);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    purpose: "",
    visitorType: "GUEST",
    vehicleNumber: "",
    villaIds: [] as string[],
    gateId: ""
  });

  const loadVisitors = () => {
    setLoading(true);
    const endpoint = filter === "active" ? "/visitors/active/list" : "/visitors";
    api
      .get(endpoint)
      .then((response) => setVisitors(response.data.visitors ?? []))
      .catch(() => showToast("Failed to load visitors", "error"))
      .finally(() => setLoading(false));
  };

  const loadVillas = () => {
    api
      .get("/villas")
      .then((response) => setVillas(response.data.villas ?? []))
      .catch(() => showToast("Failed to load villas", "error"));
  };

  const loadGates = () => {
    api
      .get("/gates")
      .then((response) => setGates(response.data.gates ?? []))
      .catch(() => showToast("Failed to load gates", "error"));
  };

  useEffect(() => {
    loadVisitors();
    loadVillas();
    loadGates();
  }, [filter]);

  const handleOpenForm = () => {
    setFormData({
      name: "",
      phone: "",
      purpose: "",
      visitorType: "GUEST",
      vehicleNumber: "",
      villaIds: [],
      gateId: gates[0]?.id || ""
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  const handleDelete = async (visitorId: string) => {
    if (!window.confirm("Are you sure you want to delete this visitor record? This action cannot be undone.")) {
      return;
    }

    setDeletingVisitorId(visitorId);
    try {
      await api.delete(`/visitors/${visitorId}`);
      showToast("Visitor record deleted successfully", "success");
      loadVisitors();
    } catch (error: unknown) {
      const message = parseApiError(error, "Failed to delete visitor").message;
      showToast(message, "error");
    } finally {
      setDeletingVisitorId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.purpose) {
      showToast("Please fill all required fields", "error");
      return;
    }

    if (formData.villaIds.length === 0) {
      showToast("Please select at least one villa", "error");
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        name: formData.name,
        phone: formData.phone,
        purpose: formData.purpose,
        visitorType: formData.visitorType,
        villaIds: formData.villaIds
      };

      // Only include optional fields if they have values
      if (formData.vehicleNumber && formData.vehicleNumber.trim()) {
        payload.vehicleNumber = formData.vehicleNumber.trim();
      }
      
      if (formData.gateId && formData.gateId.trim()) {
        payload.gateId = formData.gateId.trim();
      }

      await api.post("/visitors", payload);
      showToast("Visitor checked in successfully", "success");
      handleCloseForm();
      loadVisitors();
    } catch (error: unknown) {
      const message = parseApiError(error, "Failed to check in visitor").message;
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getVisitorTypeColor = (type: string) => {
    switch (type) {
      case "SERVICE_PROVIDER":
        return "bg-info-bg text-info-fg";
      case "DELIVERY":
        return "bg-info-bg text-info-fg";
      case "VENDOR":
        return "bg-orange-100 text-orange-800";
      case "CONTRACTOR":
        return "bg-pending-bg text-pending-fg";
      case "GUEST":
        return "bg-approved-bg text-approved-fg";
      default:
        return "bg-surface-elevated text-fg-primary";
    }
  };

  const activeCount = visitors.filter((v) => !v.checkOutAt).length;

  // Filter and search logic
  const filteredVisitors = visitors.filter((visitor) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = visitor.name.toLowerCase().includes(query);
      const matchesPhone = visitor.phone.toLowerCase().includes(query);
      if (!matchesName && !matchesPhone) return false;
    }

    // Type filter
    if (typeFilter !== "all" && visitor.visitorType !== typeFilter) {
      return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredVisitors.length / itemsPerPage);
  const paginatedVisitors = filteredVisitors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, filter]);

  return (
    <AppShell title="Visitor Management">
      <div className="space-y-4">
        <div className="page-action-bar">
          <div>
            <p className="text-fg-secondary">Track visitor entry and exit</p>
            <p className="text-sm text-fg-tertiary mt-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 bg-approved-solid rounded-full animate-pulse"></span>
                {activeCount} visitor(s) currently in society
              </span>
            </p>
          </div>
          <button
            onClick={handleOpenForm}
            className="btn btn-primary"
          >
            + Check-In Visitor
          </button>
        </div>

        {/* Search and Filters */}
        <div className="filter-bar">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input text-sm"
              />
            </div>
            <div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as "all" | "active")}
                className="input text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
              </select>
            </div>
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input text-sm"
              >
                <option value="all">All Types</option>
                <option value="GUEST">Guest</option>
                <option value="DELIVERY">Delivery</option>
                <option value="SERVICE_PROVIDER">Service Provider</option>
                <option value="CONTRACTOR">Contractor</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center text-sm">
            <span className="text-fg-secondary">
              Showing {paginatedVisitors.length} of {filteredVisitors.length} visitors
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-ghost text-sm px-3 py-1.5 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-fg-secondary font-medium">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-ghost text-sm px-3 py-1.5 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {showForm && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-bold text-fg-primary">Check-In Visitor</h2>
            </div>
            <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Visitor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="Enter visitor name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">
                  Visiting Villas * (Select one or more)
                </label>
                <select
                  multiple
                  value={formData.villaIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setFormData({ ...formData, villaIds: selected });
                  }}
                  className="w-full border border-surface-border rounded px-3 py-2 h-32"
                >
                  {villas.map((villa) => (
                    <option key={villa.id} value={villa.id}>
                      Villa {villa.villaNumber} {villa.block ? `- Block ${villa.block}` : ""} ({villa.ownerName})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-fg-secondary mt-1">Hold Ctrl/Cmd to select multiple villas</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Visitor Type *
                  </label>
                  <select
                    value={formData.visitorType}
                    onChange={(e) => setFormData({ ...formData, visitorType: e.target.value })}
                    className="input"
                  >
                    <option value="GUEST">Guest</option>
                    <option value="DELIVERY">Delivery</option>
                    <option value="SERVICE_PROVIDER">Service Provider</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="CONTRACTOR">Contractor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Gate
                  </label>
                  <select
                    value={formData.gateId}
                    onChange={(e) => setFormData({ ...formData, gateId: e.target.value })}
                    className="input"
                  >
                    <option value="">Select gate (optional)</option>
                    {gates.map((gate) => (
                      <option key={gate.id} value={gate.id}>
                        {gate.name} - {gate.location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">
                  Purpose *
                </label>
                <input
                  type="text"
                  required
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="input"
                  placeholder="e.g., Personal visit, Delivery, Maintenance"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">
                  Vehicle Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  className="input"
                  placeholder="e.g., MH01AB1234"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? "Checking In..." : "Check-In Visitor"}
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
              <p className="loading-state-text">Loading visitors...</p>
            </div>
          ) : (
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th className="table-th">Name</th>
                  <th className="table-th">Type</th>
                  <th className="table-th">Visiting Villas</th>
                  <th className="table-th">Gate</th>
                  <th className="table-th">Vehicle</th>
                  <th className="table-th">Purpose</th>
                  <th className="table-th">Check In</th>
                  <th className="table-th">Check Out</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="table-td">
                      <div className="empty-state">
                        <span className="empty-state-icon">👋</span>
                        <p className="empty-state-title">
                          {searchQuery || typeFilter !== "all" ? "No matches" : "No visitors yet"}
                        </p>
                        <p className="empty-state-text">
                          {searchQuery || typeFilter !== "all"
                            ? "Try adjusting your search or filters."
                            : "Click \"Check-In Visitor\" to log the first entry."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedVisitors.map((visitor) => (
                    <tr key={visitor.id} className="table-row">
                      <td className="table-td">
                        <div>
                          <div className="font-medium">{visitor.name}</div>
                          <div className="text-xs text-fg-secondary mt-0.5">{visitor.phone}</div>
                        </div>
                      </td>
                      <td className="table-td">
                        <span
                          className={`badge ${getVisitorTypeColor(visitor.visitorType)}`}
                        >
                          {visitor.visitorType.replace("_", " ")}
                        </span>
                      </td>
                      <td className="table-td text-sm">
                        {visitor.villaVisits.map((vv, idx) => (
                          <div key={idx}>
                            {vv.villa.villaNumber} {vv.villa.block && `- ${vv.villa.block}`}
                          </div>
                        ))}
                      </td>
                      <td className="table-td text-fg-secondary">{visitor.gate?.name || "-"}</td>
                      <td className="table-td text-fg-secondary">{visitor.vehicleNumber || "-"}</td>
                      <td className="table-td text-fg-secondary max-w-xs truncate">{visitor.purpose}</td>
                      <td className="table-td text-fg-secondary">{formatDateTime(visitor.checkInAt)}</td>
                      <td className="table-td">
                        {visitor.checkOutAt ? (
                          <span className="text-fg-secondary">{formatDateTime(visitor.checkOutAt)}</span>
                        ) : (
                          <span className="badge badge-success">Active</span>
                        )}
                      </td>
                      <td className="table-td">
                        <button
                          onClick={() => handleDelete(visitor.id)}
                          disabled={deletingVisitorId === visitor.id}
                          className="btn btn-ghost text-brand-danger p-1.5 disabled:opacity-50"
                          title="Delete visitor record"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
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
