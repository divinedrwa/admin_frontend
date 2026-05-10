"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";

type Incident = {
  id: string;
  title: string;
  description: string;
  severity: string;
  location?: string;
  photoUrl?: string;
  resolvedAt?: string;
  createdAt: string;
  guard: {
    name: string;
  };
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [deletingIncidentId, setDeletingIncidentId] = useState<string | null>(null);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    severity: "MEDIUM",
    location: "",
    photoUrl: ""
  });

  const loadIncidents = () => {
    setLoading(true);
    api
      .get("/incidents")
      .then((response) => setIncidents(response.data.incidents ?? []))
      .catch(() => showToast("Failed to load incidents", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  // Filter and search logic
  const filteredIncidents = incidents.filter((incident) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = incident.title.toLowerCase().includes(query);
      const matchesDesc = incident.description.toLowerCase().includes(query);
      if (!matchesTitle && !matchesDesc) return false;
    }
    if (severityFilter !== "all" && incident.severity !== severityFilter) return false;
    return true;
  });

  const severityCounts = {
    LOW: incidents.filter(i => i.severity === "LOW").length,
    MEDIUM: incidents.filter(i => i.severity === "MEDIUM").length,
    HIGH: incidents.filter(i => i.severity === "HIGH").length,
    CRITICAL: incidents.filter(i => i.severity === "CRITICAL").length,
  };

  const handleOpenForm = () => {
    setEditingIncident(null);
    setFormData({
      title: "",
      description: "",
      severity: "MEDIUM",
      location: "",
      photoUrl: ""
    });
    setShowForm(true);
  };

  const handleEdit = (incident: Incident) => {
    setEditingIncident(incident);
    setFormData({
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      location: incident.location || "",
      photoUrl: incident.photoUrl || ""
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingIncident(null);
  };

  const handleDelete = async (incidentId: string) => {
    if (!window.confirm("Are you sure you want to delete this incident? This action cannot be undone.")) {
      return;
    }

    setDeletingIncidentId(incidentId);
    try {
      await api.delete(`/incidents/${incidentId}`);
      showToast("Incident deleted successfully", "success");
      loadIncidents();
    } catch (error: unknown) {
      const message = parseApiError(error, "Failed to delete incident").message;
      showToast(message, "error");
    } finally {
      setDeletingIncidentId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description) {
      showToast("Please fill all required fields", "error");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        location: formData.location || undefined,
        photoUrl: formData.photoUrl || undefined
      };

      if (editingIncident) {
        await api.put(`/incidents/${editingIncident.id}`, payload);
        showToast("Incident updated successfully", "success");
      } else {
        await api.post("/incidents", payload);
        showToast("Incident reported successfully", "success");
      }

      handleCloseForm();
      loadIncidents();
    } catch (error: unknown) {
      const message = parseApiError(error, editingIncident ? "Failed to update incident" : "Failed to report incident").message;
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSeverityBadge = (severity: string) => {
    const badges: Record<string, string> = {
      LOW: "bg-green-100 text-green-800",
      MEDIUM: "bg-yellow-100 text-yellow-800",
      HIGH: "bg-orange-100 text-orange-800",
      CRITICAL: "bg-red-100 text-red-800",
    };
    return badges[severity] || "bg-gray-100 text-gray-800";
  };

  return (
    <AppShell title="Security Incidents">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Track and manage security incidents</p>
          <button
            onClick={handleOpenForm}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            + Report Incident
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="all">All Severities</option>
                <option value="LOW">Low ({severityCounts.LOW})</option>
                <option value="MEDIUM">Medium ({severityCounts.MEDIUM})</option>
                <option value="HIGH">High ({severityCounts.HIGH})</option>
                <option value="CRITICAL">Critical ({severityCounts.CRITICAL})</option>
              </select>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredIncidents.length} of {incidents.length} incidents
          </div>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">{editingIncident ? "Edit Incident" : "Report New Incident"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Incident Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="e.g., Suspicious activity near gate"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Provide detailed description of the incident..."
                  rows={4}
                  minLength={10}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity *
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="e.g., Main Gate, Block A"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.photoUrl}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
                >
                  {submitting ? (editingIncident ? "Updating..." : "Reporting...") : (editingIncident ? "Update Incident" : "Report Incident")}
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

        <div className="space-y-4">
          {loading ? (
            <p className="text-gray-500">Loading incidents...</p>
          ) : filteredIncidents.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded p-8 text-center">
              <p className="text-gray-500">
                {searchQuery || severityFilter !== "all" ? "No incidents match your search criteria." : "No incidents reported. Click \"Report Incident\" to add one."}
              </p>
            </div>
          ) : (
            filteredIncidents.map((incident) => (
              <div
                key={incident.id}
                className="bg-white border border-gray-200 rounded p-6 border-l-4 border-red-600"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{incident.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded ${getSeverityBadge(incident.severity)}`}>
                        {incident.severity}
                      </span>
                      {incident.resolvedAt && (
                        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                          RESOLVED
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-3">{incident.description}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(incident)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit incident"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(incident.id)}
                      disabled={deletingIncidentId === incident.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      title="Delete incident"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t pt-3">
                  <div>
                    <span className="text-gray-500">Reported By:</span>
                    <p className="font-medium">{incident.guard?.name || "Admin"}</p>
                  </div>
                  {incident.location && (
                    <div>
                      <span className="text-gray-500">Location:</span>
                      <p className="font-medium">{incident.location}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Reported:</span>
                    <p className="font-medium">{formatDateTime(incident.createdAt)}</p>
                  </div>
                  {incident.resolvedAt && (
                    <div>
                      <span className="text-gray-500">Resolved:</span>
                      <p className="font-medium">{formatDateTime(incident.resolvedAt)}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
