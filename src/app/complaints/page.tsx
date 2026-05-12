"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

type Complaint = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  villa: {
    villaNumber: string;
    block: string;
    ownerName: string;
  };
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/complaints")
      .then((response) => setComplaints(response.data.complaints ?? []))
      .catch(async (error: unknown) => {
        const { showToast } = await import("@/components/Toast");
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load complaints";
        showToast(message, "error");
      })
      .finally(() => setLoading(false));
  }, []);

  const openCount = complaints.filter((c) => c.status !== "RESOLVED" && c.status !== "CLOSED").length;

  return (
    <AppShell title="Complaints">
      <div className="space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="stat-card-value">{complaints.length}</div>
            <div className="stat-card-label">Total complaints</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value text-pending-fg">{openCount}</div>
            <div className="stat-card-label">Open / In progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value text-approved-fg">{complaints.length - openCount}</div>
            <div className="stat-card-label">Resolved</div>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner w-10 h-10"></div>
              <p className="loading-state-text">Loading complaints...</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📋</span>
              <p className="empty-state-title">No complaints yet</p>
              <p className="empty-state-text">When residents submit complaints, they will appear here for review and resolution.</p>
            </div>
          ) : (
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th className="table-th">Villa</th>
                  <th className="table-th">Title</th>
                  <th className="table-th">Description</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Created</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((complaint) => (
                  <tr key={complaint.id} className="table-row">
                    <td className="table-td">
                      <div className="font-medium">{complaint.villa.villaNumber}</div>
                      {complaint.villa.block && (
                        <div className="text-xs text-fg-secondary">Block {complaint.villa.block}</div>
                      )}
                    </td>
                    <td className="table-td font-medium">{complaint.title}</td>
                    <td className="table-td text-fg-secondary max-w-xs truncate">{complaint.description}</td>
                    <td className="table-td">
                      <span
                        className={`badge ${
                          complaint.status === "RESOLVED" || complaint.status === "CLOSED"
                            ? "badge-success"
                            : complaint.status === "IN_PROGRESS"
                            ? "badge-primary"
                            : "badge-warning"
                        }`}
                      >
                        {complaint.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="table-td text-fg-secondary">
                      {new Date(complaint.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
