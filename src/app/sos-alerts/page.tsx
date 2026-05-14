"use client";

import { TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { sortByVillaNumber } from "@/utils/villaSort";

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

  const loadAlerts = useCallback(() => {
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
  }, [filter]);

  const loadVillas = () => {
    api
      .get("/villas")
      .then((response) =>
        setVillas(
          sortByVillaNumber(
            (response.data.villas ?? []) as Villa[],
            (v) => v.villaNumber,
          ),
        ),
      )
      .catch(() => showToast("Failed to load villas", "error"));
  };

  useEffect(() => {
    loadAlerts();
    loadVillas();
    const interval = setInterval(loadAlerts, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadAlerts]);

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
    } catch (error: unknown) {
      const message = parseApiError(error, "Failed to create SOS alert").message;
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
        return "bg-denied-bg text-denied-fg animate-pulse";
      case "ACKNOWLEDGED":
        return "bg-pending-bg text-pending-fg";
      case "IN_PROGRESS":
        return "bg-pending-bg text-pending-fg";
      case "RESOLVED":
        return "bg-approved-bg text-approved-fg";
      case "CANCELLED":
        return "bg-surface-elevated text-fg-primary";
      default:
        return "bg-surface-elevated text-fg-primary";
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
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Emergency response"
          title="SOS emergency alerts"
          description="Monitor emergency alerts, filter active incidents, and coordinate acknowledgement or resolution with stronger visibility."
          icon={<TriangleAlert className="h-6 w-6" />}
        />

        {/* Alert Banner for Active SOS */}
        {activeCount > 0 && (
          <div className="bg-denied-bg border-l-4 border-brand-danger p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-danger/20 flex items-center justify-center">
                <span className="text-2xl animate-pulse">🚨</span>
              </div>
              <div>
                <p className="font-bold text-denied-fg text-lg">
                  {activeCount} Active Emergency Alert{activeCount > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-denied-fg/80">Immediate attention required</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="tabs">
            <button
              onClick={() => setFilter("all")}
              className={`tab ${filter === "all" ? "tab-active" : "tab-inactive"}`}
            >
              All Alerts
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`tab ${filter === "active" ? "tab-active" : "tab-inactive"}`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilter("resolved")}
              className={`tab ${filter === "resolved" ? "tab-active" : "tab-inactive"}`}
            >
              Resolved
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleOpenForm}
              className="btn btn-danger"
            >
              + Create Alert (Test)
            </button>
            <button
              onClick={loadAlerts}
              className="btn btn-ghost"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-bold text-fg-primary">Create SOS Alert (Test)</h2>
            </div>
            <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">
                  Emergency Type *
                </label>
                <select
                  value={formData.emergencyType}
                  onChange={(e) => setFormData({ ...formData, emergencyType: e.target.value })}
                  className="input"
                >
                  <option value="MEDICAL">🏥 Medical Emergency</option>
                  <option value="FIRE">🔥 Fire Emergency</option>
                  <option value="THEFT">🚨 Theft/Security</option>
                  <option value="ACCIDENT">⚠️ Accident</option>
                  <option value="OTHER">🆘 Other Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">
                  Message (Optional)
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="input"
                  placeholder="Provide details about the emergency..."
                  rows={3}
                />
              </div>

              <div className="bg-pending-bg border border-pending-bg rounded p-3 text-sm text-pending-fg">
                ⚠️ This creates a test SOS alert. In production, residents create alerts from their mobile app.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-danger"
                >
                  {submitting ? "Creating..." : "Create Alert"}
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

        {/* Alerts List */}
        <div className="space-y-4">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner w-10 h-10"></div>
              <p className="loading-state-text">Loading alerts...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="empty-state-icon">🛡️</span>
                <p className="empty-state-title">
                  No {filter === "active" ? "active" : filter === "resolved" ? "resolved" : ""} alerts
                </p>
                <p className="empty-state-text">Emergency alerts from residents will appear here in real-time.</p>
              </div>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`card p-5 ${
                  !isTerminal(alert.status) ? "border-2 border-brand-danger shadow-md" : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getEmergencyIcon(alert.emergencyType)}</span>
                      <div>
                        <h3 className="font-bold text-lg">{alert.emergencyType} EMERGENCY</h3>
                        <p className="text-sm text-fg-secondary">
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
                      <p className="text-fg-primary mb-2 ml-11">{alert.message}</p>
                    )}

                    <div className="flex gap-6 text-sm text-fg-secondary ml-11">
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
                        className="btn bg-pending-solid text-fg-inverse hover:opacity-90 text-sm"
                      >
                        Acknowledge
                      </button>
                    )}
                    {alert.status === "ACKNOWLEDGED" && (
                      <button
                        onClick={() => handleStart(alert.id)}
                        className="btn bg-pending-solid text-fg-inverse hover:opacity-90 text-sm"
                      >
                        Start Response
                      </button>
                    )}
                    {!isTerminal(alert.status) && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="btn btn-success text-sm"
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
