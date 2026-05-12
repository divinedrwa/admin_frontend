"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { parseApiError } from "@/utils/errorHandler";

type PreApprovedVisitor = {
  id: string;
  name: string;
  phone: string;
  purpose?: string | null;
  validUntil?: string | null;
  villa?: {
    villaNumber: string;
  } | null;
};

export default function PreApprovedVisitorsPage() {
  const [visitors, setVisitors] = useState<PreApprovedVisitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchVisitors();
  }, []);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/pre-approved-visitors");
      setVisitors(response.data.visitors || response.data);
    } catch (err: unknown) {
      setError(parseApiError(err, "Failed to fetch pre-approved visitors").message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this pre-approved visitor?")) return;
    
    try {
      await api.delete(`/pre-approved-visitors/${id}`);
      showToast("Pre-approved visitor removed", "success");
      void fetchVisitors();
    } catch (err: unknown) {
      showToast(parseApiError(err, "Failed to remove visitor").message, "error");
    }
  };

  return (
    <div className="min-h-screen bg-surface-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="page-action-bar">
          <div>
            <h1 className="text-3xl font-bold text-fg-primary">Pre-Approved Visitors</h1>
            <p className="text-fg-secondary">Manage pre-approved visitors for quick entry</p>
          </div>
        </div>

        {error && (
          <div className="bg-denied-bg border border-brand-danger text-denied-fg px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner w-10 h-10"></div>
            <p className="loading-state-text">Loading visitors...</p>
          </div>
        ) : visitors.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">👥</span>
            <p className="empty-state-title">No pre-approved visitors found</p>
            <p className="empty-state-text">Pre-approved visitors will appear here once residents add them.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visitors.map((visitor) => (
              <div key={visitor.id} className="card">
                <div className="card-body">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-fg-primary">{visitor.name}</h3>
                    <p className="text-sm text-fg-secondary">{visitor.phone}</p>
                  </div>
                  <span className="badge badge-success">
                    Approved
                  </span>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <p><span className="text-fg-secondary">Villa:</span> <span className="font-medium">{visitor.villa?.villaNumber || "N/A"}</span></p>
                  <p><span className="text-fg-secondary">Valid Until:</span> <span className="font-medium">{visitor.validUntil ? new Date(visitor.validUntil).toLocaleDateString() : "Indefinite"}</span></p>
                  {visitor.purpose && <p><span className="text-fg-secondary">Purpose:</span> {visitor.purpose}</p>}
                </div>
                <button
                  onClick={() => handleDelete(visitor.id)}
                  className="btn btn-danger w-full text-sm"
                >
                  Remove Approval
                </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
