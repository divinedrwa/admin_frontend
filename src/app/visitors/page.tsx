"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

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
    } catch (error: any) {
      const message = error.response?.data?.message ?? "Failed to delete visitor";
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
    } catch (error: any) {
      const message = error.response?.data?.message ?? "Failed to check in visitor";
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
        return "bg-purple-100 text-purple-800";
      case "DELIVERY":
        return "bg-blue-100 text-blue-800";
      case "VENDOR":
        return "bg-orange-100 text-orange-800";
      case "CONTRACTOR":
        return "bg-yellow-100 text-yellow-800";
      case "GUEST":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
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
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600">Track visitor entry and exit</p>
            <p className="text-sm text-gray-500">
              {activeCount} visitor(s) currently in society
            </p>
          </div>
          <button
            onClick={handleOpenForm}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Check-In Visitor
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as "all" | "active")}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="all">All Types</option>
                <option value="GUEST">Guest</option>
                <option value="DELIVERY">Delivery</option>
                <option value="SERVICE_PROVIDER">Service Provider</option>
                <option value="CONTRACTOR">Contractor</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-3 flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Showing {paginatedVisitors.length} of {filteredVisitors.length} visitors
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">Check-In Visitor</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visitor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Enter visitor name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visiting Villas * (Select one or more)
                </label>
                <select
                  multiple
                  value={formData.villaIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setFormData({ ...formData, villaIds: selected });
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2 h-32"
                >
                  {villas.map((villa) => (
                    <option key={villa.id} value={villa.id}>
                      Villa {villa.villaNumber} {villa.block ? `- Block ${villa.block}` : ""} ({villa.ownerName})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple villas</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visitor Type *
                  </label>
                  <select
                    value={formData.visitorType}
                    onChange={(e) => setFormData({ ...formData, visitorType: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="GUEST">Guest</option>
                    <option value="DELIVERY">Delivery</option>
                    <option value="SERVICE_PROVIDER">Service Provider</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="CONTRACTOR">Contractor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gate
                  </label>
                  <select
                    value={formData.gateId}
                    onChange={(e) => setFormData({ ...formData, gateId: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose *
                </label>
                <input
                  type="text"
                  required
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="e.g., Personal visit, Delivery, Maintenance"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="e.g., MH01AB1234"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submitting ? "Checking In..." : "Check-In Visitor"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="bg-gray-200 text-gray-800 px-6 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded bg-white border border-gray-200 p-4 overflow-x-auto">
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Name</th>
                  <th>Type</th>
                  <th>Visiting Villas</th>
                  <th>Gate</th>
                  <th>Vehicle</th>
                  <th>Purpose</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      {searchQuery || typeFilter !== "all" 
                        ? "No visitors match your search criteria." 
                        : "No visitors found. Click \"Check-In Visitor\" to add one."}
                    </td>
                  </tr>
                ) : (
                  paginatedVisitors.map((visitor) => (
                    <tr key={visitor.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        <div>
                          <div className="font-medium">{visitor.name}</div>
                          <div className="text-xs text-gray-500">{visitor.phone}</div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`px-2 py-1 text-xs rounded ${getVisitorTypeColor(
                            visitor.visitorType
                          )}`}
                        >
                          {visitor.visitorType.replace("_", " ")}
                        </span>
                      </td>
                      <td className="text-xs">
                        {visitor.villaVisits.map((vv, idx) => (
                          <div key={idx}>
                            {vv.villa.villaNumber} {vv.villa.block && `- ${vv.villa.block}`}
                          </div>
                        ))}
                      </td>
                      <td className="text-xs">{visitor.gate?.name || "-"}</td>
                      <td className="text-xs">{visitor.vehicleNumber || "-"}</td>
                      <td className="text-xs max-w-xs truncate">{visitor.purpose}</td>
                      <td className="text-xs">{formatDateTime(visitor.checkInAt)}</td>
                      <td className="text-xs">
                        {visitor.checkOutAt ? (
                          formatDateTime(visitor.checkOutAt)
                        ) : (
                          <span className="text-green-600 font-medium">Active</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(visitor.id)}
                          disabled={deletingVisitorId === visitor.id}
                          className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                          title="Delete visitor record"
                        >
                          🗑️
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
