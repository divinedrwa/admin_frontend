"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
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
  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/complaint-analytics/summary?days=${dateFilter}`);
      setSummary(response.data.summary);
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to load summary").message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch category breakdown
  const fetchCategories = async () => {
    try {
      const response = await api.get(`/complaint-analytics/by-category?days=${dateFilter}`);
      setCategoryStats(response.data.categoryStats);
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to load categories").message, "error");
    }
  };

  // Fetch pending complaints
  const fetchPending = async () => {
    try {
      const response = await api.get("/complaint-analytics/pending-list?limit=20");
      setPendingComplaints(response.data.pendingComplaints);
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to load pending list").message, "error");
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchCategories();
    fetchPending();
  }, [dateFilter]);

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
      fetchSummary();
      fetchCategories();
      fetchPending();
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to update complaint").message, "error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    const styles = {
      OPEN: "bg-yellow-100 text-yellow-800",
      IN_PROGRESS: "bg-blue-100 text-blue-800",
      RESOLVED: "bg-green-100 text-green-800",
      CLOSED: "bg-gray-100 text-gray-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  const getUrgencyBadge = (level: string) => {
    const styles = {
      critical: "bg-red-100 text-red-800 border-red-300",
      high: "bg-orange-100 text-orange-800 border-orange-300",
      normal: "bg-blue-100 text-blue-800 border-blue-300",
    };
    return styles[level as keyof typeof styles] || styles.normal;
  };

  return (
    <AppShell title="Complaint Analytics Dashboard">
      {/* Date Filter */}
      <div className="mb-6 flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Period:</label>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="180">Last 6 Months</option>
        </select>
      </div>

      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <div className="text-sm text-blue-600">Total Complaints</div>
            <div className="text-2xl font-bold text-blue-900">{summary.totalComplaints}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <div className="text-sm text-green-600">Resolved</div>
            <div className="text-2xl font-bold text-green-900">{summary.resolvedCount}</div>
            <div className="text-xs text-green-700">{summary.resolutionRate}% rate</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <div className="text-sm text-blue-600">In Progress</div>
            <div className="text-2xl font-bold text-blue-900">{summary.inProgressCount}</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <div className="text-sm text-yellow-600">Pending</div>
            <div className="text-2xl font-bold text-yellow-900">{summary.pendingCount}</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded p-4">
            <div className="text-sm text-purple-600">Avg Resolution</div>
            <div className="text-2xl font-bold text-purple-900">{summary.avgResolutionTime}</div>
            <div className="text-xs text-purple-700">days</div>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Complaints by Category</h2>
        <div className="bg-white border border-gray-200 rounded overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Resolved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Pending
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Avg Resolution
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categoryStats.map((cat) => (
                <tr key={cat.category} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {cat.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cat.totalCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    {cat.resolvedCount} ({cat.resolutionRate}%)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                    {cat.pendingCount + cat.inProgressCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cat.avgResolutionTime} days
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {cat.performanceStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {categoryStats.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No complaints data available for this period
            </div>
          )}
        </div>
      </div>

      {/* Pending Complaints - Need Attention */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Pending Complaints <span className="text-sm text-gray-500">(Need Attention)</span>
        </h2>
        <div className="space-y-3">
          {pendingComplaints.map((complaint) => (
            <div
              key={complaint.id}
              className={`bg-white border-2 rounded p-4 ${getUrgencyBadge(complaint.urgencyLevel)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{complaint.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded ${getStatusBadge(complaint.status)}`}>
                      {complaint.status}
                    </span>
                    {complaint.urgencyLevel === "critical" && (
                      <span className="px-2 py-1 text-xs rounded bg-red-600 text-white font-bold">
                        🚨 CRITICAL
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{complaint.description}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
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
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Update Status
                  </button>
                </div>
              </div>
            </div>
          ))}

          {pendingComplaints.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded p-8 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-green-800 font-medium">All complaints are resolved!</p>
              <p className="text-green-600 text-sm">No pending complaints at this time.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Update Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Update Complaint Status</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status *
                </label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as ComplaintStatus)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Add any notes about the resolution..."
                  rows={3}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleQuickUpdate(selectedComplaint)}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Update"}
                </button>
                <button
                  onClick={() => {
                    setSelectedComplaint(null);
                    setAdminNotes("");
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && !selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">Loading...</p>
          </div>
        </div>
      )}
    </AppShell>
  );
}
