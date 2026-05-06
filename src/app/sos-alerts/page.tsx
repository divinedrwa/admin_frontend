"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

type SOSAlert = {
  id: string;
  emergencyType: string;
  message: string | null;
  status: string;
  villa: {
    villaNumber: string;
    ownerName: string;
    block: string | null;
  };
  user: {
    name: string;
    phone: string | null;
  };
  responseTime: number | null;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
};

type Villa = {
  id: string;
  villaNumber: string;
  block: string | null;
  ownerName: string;
};

export default function SOSAlertsPage() {
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    villaId: "",
    emergencyType: "MEDICAL",
    message: ""
  });

  const loadAlerts = () => {
    setLoading(true);
    const endpoint = filter === "active" ? "/sos-alerts/active" : "/sos-alerts";
    api
      .get(endpoint)
      .then((response) => setAlerts(response.data.alerts ?? []))
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load SOS alerts";
        showToast(message, "error");
      })
      .finally(() => setLoading(false));
  };

  const loadVillas = () => {
    api
      .get("/villas")
      .then((response) => setVillas(response.data.villas ?? []))
      .catch(() => showToast("Failed to load villas", "error"));
  };

  useEffect(() => {
    loadAlerts();
    loadVillas();
    const interval = setInterval(loadAlerts, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [filter]);

  const handleOpenForm = () => {
    setFormData({
      villaId: "",
      emergencyType: "MEDICAL",
      message: ""
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.villaId || !formData.emergencyType) {
      showToast("Please fill all required fields", "error");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        villaId: formData.villaId,
        emergencyType: formData.emergencyType,
        message: formData.message || undefined
      };

      await api.post("/sos-alerts", payload);
      showToast("SOS Alert created successfully", "success");
      handleCloseForm();
      loadAlerts();
    } catch (error: any) {
      const message = error.response?.data?.message ?? "Failed to create SOS alert";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.patch(`/sos-alerts/${alertId}/acknowledge`);
      showToast("Alert acknowledged", "success");
      loadAlerts();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to acknowledge alert";
      showToast(message, "error");
    }
  };

  const handleStart = async (alertId: string) => {
    try {
      await api.patch(`/sos-alerts/${alertId}/start`);
      showToast("Marked in progress", "success");
      loadAlerts();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to start response";
      showToast(message, "error");
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await api.patch(`/sos-alerts/${alertId}/resolve`);
      showToast("Alert resolved", "success");
      loadAlerts();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to resolve alert";
      showToast(message, "error");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CREATED":
      case "ACTIVE":
      case "PENDING":
        return "bg-red-100 text-red-800 animate-pulse";
      case "ACKNOWLEDGED":
        return "bg-yellow-100 text-yellow-800";
      case "IN_PROGRESS":
        return "bg-orange-100 text-orange-900";
      case "RESOLVED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-gray-200 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEmergencyIcon = (type: string) => {
    switch (type) {
      case "MEDICAL":
        return "🏥";
      case "FIRE":
        return "🔥";
      case "THEFT":
      case "SECURITY":
        return "🚨";
      case "ACCIDENT":
        return "⚠️";
      default:
        return "🆘";
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isTerminal = (s: string) => s === "RESOLVED" || s === "CANCELLED";

  const filteredAlerts =
    filter === "resolved"
      ? alerts.filter((a) => a.status === "RESOLVED")
      : filter === "active"
        ? alerts.filter((a) => !isTerminal(a.status))
        : alerts;

  const activeCount = alerts.filter((a) => !isTerminal(a.status)).length;

  return (
    <AppShell title="SOS Emergency Alerts">
      <div className="space-y-4">
        {/* Alert Banner for Active SOS */}
        {activeCount > 0 && (
          <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded">
            <div className="flex items-center">
              <span className="text-2xl mr-3 animate-pulse">🚨</span>
              <div>
                <p className="font-bold text-red-800">
                  {activeCount} ACTIVE EMERGENCY ALERT{activeCount > 1 ? "S" : ""}
                </p>
                <p className="text-sm text-red-700">Immediate attention required!</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300"
              }`}
            >
              All Alerts
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-4 py-2 rounded ${
                filter === "active"
                  ? "bg-red-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300"
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilter("resolved")}
              className={`px-4 py-2 rounded ${
                filter === "resolved"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300"
              }`}
            >
              Resolved
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleOpenForm}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              + Create Alert (Test)
            </button>
            <button
              onClick={loadAlerts}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">Create SOS Alert (Test)</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Villa *
                </label>
                <select
                  required
                  value={formData.villaId}
                  onChange={(e) => setFormData({ ...formData, villaId: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Select villa</option>
                  {villas.map((villa) => (
                    <option key={villa.id} value={villa.id}>
                      Villa {villa.villaNumber} {villa.block && `- Block ${villa.block}`} ({villa.ownerName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Type *
                </label>
                <select
                  value={formData.emergencyType}
                  onChange={(e) => setFormData({ ...formData, emergencyType: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="MEDICAL">🏥 Medical Emergency</option>
                  <option value="FIRE">🔥 Fire Emergency</option>
                  <option value="THEFT">🚨 Theft/Security</option>
                  <option value="ACCIDENT">⚠️ Accident</option>
                  <option value="OTHER">🆘 Other Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Provide details about the emergency..."
                  rows={3}
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                ⚠️ This creates a test SOS alert. In production, residents create alerts from their mobile app.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
                >
                  {submitting ? "Creating..." : "Create Alert"}
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

        {/* Alerts List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-gray-500">Loading alerts...</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="bg-white rounded border border-gray-200 p-8 text-center text-gray-500">
              No {filter === "active" ? "active" : filter === "resolved" ? "resolved" : ""} alerts
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-white rounded border-2 p-4 ${
                  !isTerminal(alert.status) ? "border-red-500" : "border-gray-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getEmergencyIcon(alert.emergencyType)}</span>
                      <div>
                        <h3 className="font-bold text-lg">{alert.emergencyType} EMERGENCY</h3>
                        <p className="text-sm text-gray-600">
                          Villa {alert.villa.villaNumber}
                          {alert.villa.block ? ` (Block ${alert.villa.block})` : ""} •{" "}
                          {alert.user.name}
                        </p>
                      </div>
                      <span className={`ml-auto px-3 py-1 rounded text-sm font-medium ${getStatusColor(alert.status)}`}>
                        {alert.status}
                      </span>
                    </div>

                    {alert.message && (
                      <p className="text-gray-700 mb-2 ml-11">{alert.message}</p>
                    )}

                    <div className="flex gap-6 text-sm text-gray-600 ml-11">
                      <div>
                        <span className="font-medium">Triggered:</span> {formatTime(alert.createdAt)}
                      </div>
                      {alert.user.phone && (
                        <div>
                          <span className="font-medium">Phone:</span> {alert.user.phone}
                        </div>
                      )}
                      {alert.responseTime && (
                        <div>
                          <span className="font-medium">Response Time:</span>{" "}
                          {Math.floor(alert.responseTime / 60)} min
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 ml-4">
                    {(alert.status === "CREATED" ||
                      alert.status === "ACTIVE" ||
                      alert.status === "PENDING") && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-sm"
                      >
                        Acknowledge
                      </button>
                    )}
                    {alert.status === "ACKNOWLEDGED" && (
                      <button
                        onClick={() => handleStart(alert.id)}
                        className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 text-sm"
                      >
                        Start
                      </button>
                    )}
                    {!isTerminal(alert.status) && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
