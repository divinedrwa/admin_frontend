"use client";

import { BarChart3 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { showToast } from "@/components/Toast";
import { AppShell } from "@/components/AppShell";
import { parseApiError } from "@/utils/errorHandler";

type ComplaintStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

type Summary = {
  totalComplaints: number;
  resolvedCount: number;
  inProgressCount: number;
  pendingCount: number;
  resolutionRate: number;
  avgResolutionTime: number;
};

type CategoryStat = {
  category: string;
  totalCount: number;
  resolvedCount: number;
  pendingCount: number;
  inProgressCount: number;
  avgResolutionTime: number;
  resolutionRate: number;
  performanceStatus: string;
};

type PendingComplaint = {
  id: string;
  title: string;
  description: string;
  status: ComplaintStatus;
  category: string | null;
  createdAt: string;
  daysPending: number;
  urgencyLevel: string;
  villa: {
    villaNumber: string;
    block: string;
    ownerName: string;
  };
};

export default function ComplaintAnalyticsPage() {
  const [dateFilter, setDateFilter] = useState("30");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [pendingComplaints, setPendingComplaints] = useState<PendingComplaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<ComplaintStatus>("IN_PROGRESS");
  const [adminNotes, setAdminNotes] = useState("");

  // Fetch summary data
  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/complaint-analytics/summary?days=${dateFilter}`);
      setSummary(response.data.summary);
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to load summary").message, "error");
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  // Fetch category breakdown
  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get(`/complaint-analytics/by-category?days=${dateFilter}`);
      setCategoryStats(response.data.categoryStats);
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to load categories").message, "error");
    }
  }, [dateFilter]);

  // Fetch pending complaints
  const fetchPending = useCallback(async () => {
    try {
      const response = await api.get("/complaint-analytics/pending-list?limit=20");
      setPendingComplaints(response.data.pendingComplaints);
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to load pending list").message, "error");
    }
  }, []);

  useEffect(() => {
    void fetchSummary();
    void fetchCategories();
    void fetchPending();
  }, [fetchCategories, fetchPending, fetchSummary]);

  const handleQuickUpdate = async (complaintId: string) => {
    try {
      setLoading(true);
      await api.patch(`/complaint-analytics/quick-update/${complaintId}`, {
        status: updateStatus,
        adminNotes: adminNotes || undefined,
      });
      
      showToast("Complaint updated successfully", "success");
      setSelectedComplaint(null);
      setAdminNotes("");
      
      // Refresh data
      void fetchSummary();
      void fetchCategories();
      void fetchPending();
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to update complaint").message, "error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    const styles = {
      OPEN: "bg-pending-bg text-pending-fg",
      IN_PROGRESS: "bg-info-bg text-info-fg",
      RESOLVED: "bg-approved-bg text-approved-fg",
      CLOSED: "bg-surface-elevated text-fg-primary",
    };
    return styles[status] || "bg-surface-elevated text-fg-primary";
  };

  const getUrgencyBadge = (level: string) => {
    const styles = {
      critical: "bg-denied-bg text-denied-fg border-denied-bg",
      high: "bg-pending-bg text-pending-fg border-pending-bg",
      normal: "bg-info-bg text-info-fg border-info-bg",
    };
    return styles[level as keyof typeof styles] || styles.normal;
  };

  return (
    <AppShell title="Complaint Analytics Dashboard">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Service performance"
          title="Complaint analytics dashboard"
          description="Track complaint volume, category breakdowns, urgency, and pending items that need quicker operational response."
          icon={<BarChart3 className="h-6 w-6" />}
        />

        {/* Date Filter */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-fg-primary">Period:</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="180">Last 6 Months</option>
          </select>
        </div>

        {/* Summary Statistics */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="stat-card">
              <div className="stat-card-label">Total Complaints</div>
              <div className="stat-card-value">{summary.totalComplaints}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Resolved</div>
              <div className="stat-card-value text-approved-solid">{summary.resolvedCount}</div>
              <div className="text-xs text-approved-fg mt-1">{summary.resolutionRate}% rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">In Progress</div>
              <div className="stat-card-value text-info-fg">{summary.inProgressCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Pending</div>
              <div className="stat-card-value text-pending-solid">{summary.pendingCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Avg Resolution</div>
              <div className="stat-card-value">{summary.avgResolutionTime}</div>
              <div className="text-xs text-fg-secondary mt-1">days</div>
            </div>
          </div>
        )}

      {/* Category Breakdown */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Complaints by Category</h2>
        <div className="table-wrapper">
          {categoryStats.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📊</span>
              <p className="empty-state-title">No data available</p>
              <p className="empty-state-text">No complaints data available for this period.</p>
            </div>
          ) : (
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th className="table-th">Category</th>
                  <th className="table-th">Total</th>
                  <th className="table-th">Resolved</th>
                  <th className="table-th">Pending</th>
                  <th className="table-th">Avg Resolution</th>
                  <th className="table-th">Performance</th>
                </tr>
              </thead>
              <tbody>
                {categoryStats.map((cat) => (
                  <tr key={cat.category} className="table-row">
                    <td className="table-td font-medium">{cat.category}</td>
                    <td className="table-td">{cat.totalCount}</td>
                    <td className="table-td text-approved-solid">
                      {cat.resolvedCount} ({cat.resolutionRate}%)
                    </td>
                    <td className="table-td text-pending-solid">
                      {cat.pendingCount + cat.inProgressCount}
                    </td>
                    <td className="table-td">{cat.avgResolutionTime} days</td>
                    <td className="table-td">{cat.performanceStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

        {/* Pending Complaints - Need Attention */}
        <div>
        <h2 className="text-lg font-semibold mb-3">
          Pending Complaints <span className="text-sm text-fg-secondary">(Need Attention)</span>
        </h2>
        <div className="space-y-3">
          {pendingComplaints.map((complaint) => (
            <div
              key={complaint.id}
              className={`bg-surface border-2 rounded p-4 ${getUrgencyBadge(complaint.urgencyLevel)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-semibold text-fg-primary">{complaint.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded ${getStatusBadge(complaint.status)}`}>
                      {complaint.status}
                    </span>
                    {complaint.urgencyLevel === "critical" && (
                      <span className="px-2 py-1 text-xs rounded bg-brand-danger text-white font-bold">
                        🚨 CRITICAL
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-fg-secondary mb-2">{complaint.description}</p>
                  <div className="flex items-center space-x-4 text-xs text-fg-secondary">
                    <span>
                      📍 {complaint.villa.villaNumber}
                      {complaint.villa.block && ` (Block ${complaint.villa.block})`}
                    </span>
                    <span>👤 {complaint.villa.ownerName}</span>
                    <span>📂 {complaint.category || "General"}</span>
                    <span className="font-medium">
                      ⏱️ {complaint.daysPending} days pending
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => setSelectedComplaint(complaint.id)}
                    className="btn btn-primary text-sm"
                  >
                    Update Status
                  </button>
                </div>
              </div>
            </div>
          ))}

          {pendingComplaints.length === 0 && (
            <div className="bg-approved-bg border border-approved-bg rounded p-8 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-approved-fg font-medium">All complaints are resolved!</p>
              <p className="text-approved-solid text-sm">No pending complaints at this time.</p>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Quick Update Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="card w-full max-w-md mx-4">
            <div className="card-header">
              <h2 className="text-xl font-bold text-fg-primary">Update Complaint Status</h2>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-2">
                  New Status *
                </label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as ComplaintStatus)}
                  className="input"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="input"
                  placeholder="Add any notes about the resolution..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleQuickUpdate(selectedComplaint)}
                  disabled={loading}
                  className="btn btn-primary flex-1"
                >
                  {loading ? "Updating..." : "Update"}
                </button>
                <button
                  onClick={() => {
                    setSelectedComplaint(null);
                    setAdminNotes("");
                  }}
                  className="btn btn-ghost flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && !selectedComplaint && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="card p-8">
            <div className="loading-state">
              <div className="loading-spinner w-10 h-10"></div>
              <p className="loading-state-text">Loading...</p>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
