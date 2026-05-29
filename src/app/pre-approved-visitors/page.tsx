"use client";

import { ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { showToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { api } from "@/lib/api";
import { parseApiError } from "@/utils/errorHandler";
import { usePreApprovedVisitors } from "@/hooks/useVisitors";
import { PreApprovedVisitor } from "@/types/visitor";

export default function PreApprovedVisitorsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading: loading, error: queryError } = usePreApprovedVisitors();
  const visitors = (data ?? []) as PreApprovedVisitor[];
  const error = queryError ? String(queryError) : "";
  const { confirm, ConfirmUI } = useConfirm();

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Remove visitor", message: "Remove this pre-approved visitor?", confirmLabel: "Remove" }))) return;

    try {
      await api.delete(`/pre-approved-visitors/${id}`);
      showToast("Pre-approved visitor removed", "success");
      queryClient.invalidateQueries({ queryKey: ["preApprovedVisitors"] });
    } catch (err: unknown) {
      showToast(parseApiError(err, "Failed to remove visitor").message, "error");
    }
  };

  return (
    <AppShell title="Pre-Approved Visitors">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Visitor management"
          title="Pre-approved visitors"
          description="Residents can pre-approve visitors via the app. Guards verify them at entry using OTP or QR scan."
          icon={<ShieldCheck className="h-6 w-6" />}
        />

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
      {ConfirmUI}
    </AppShell>
  );
}
