"use client";

import { Modal } from "@/components/Modal";
import { ResidentRow } from "./types";

interface ExcludeModalProps {
  showExcludeModal: boolean;
  onCloseExcludeModal: () => void;
  excludeTarget: ResidentRow | null;
  excludeReason: string;
  onExcludeReasonChange: (value: string) => void;
  onSubmitExcludeVilla: (e: React.FormEvent) => void;
  loading: boolean;

  showUnpaidModal: boolean;
  onCloseUnpaidModal: () => void;
  unpaidTarget: ResidentRow | null;
  unpaidReason: string;
  onUnpaidReasonChange: (value: string) => void;
  onSubmitReversePayment: (e: React.FormEvent) => void;
}

export function ExcludeModal({
  showExcludeModal,
  onCloseExcludeModal,
  excludeTarget,
  excludeReason,
  onExcludeReasonChange,
  onSubmitExcludeVilla,
  loading,
  showUnpaidModal,
  onCloseUnpaidModal,
  unpaidTarget,
  unpaidReason,
  onUnpaidReasonChange,
  onSubmitReversePayment,
}: ExcludeModalProps) {
  return (
    <>
      {/* ── Exclude Villa modal ── */}
      <Modal open={showExcludeModal && !!excludeTarget} onClose={onCloseExcludeModal}>
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Exclude Villa from Cycle</h2>
            </div>
            <div className="card-body">
              <p className="text-sm text-fg-secondary mb-4">
                Exclude <strong>{excludeTarget?.villaNumber}</strong> ({excludeTarget?.ownerName}) from this billing cycle.
                The villa will show as EXCLUDED with ₹0 expected. It will be automatically included in the next cycle.
              </p>
              <form onSubmit={onSubmitExcludeVilla} className="space-y-3">
                <div>
                  <label className="block text-sm text-fg-primary mb-1">Reason (optional)</label>
                  <textarea
                    value={excludeReason}
                    onChange={(e) => onExcludeReasonChange(e.target.value)}
                    placeholder="e.g. Villa under renovation, vacant unit, courtesy waiver"
                    className="input w-full"
                    rows={2}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn bg-brand-danger text-white hover:opacity-90 flex-1 disabled:opacity-50"
                  >
                    Exclude Villa
                  </button>
                  <button
                    type="button"
                    onClick={onCloseExcludeModal}
                    className="btn btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
      </Modal>
      {/* ── Reverse Payment (Mark Unpaid) modal ── */}
      <Modal open={showUnpaidModal && !!unpaidTarget} onClose={onCloseUnpaidModal}>
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Reverse Payment</h2>
            </div>
            <div className="card-body">
              <div className="bg-denied-bg border border-denied-bg rounded-lg p-3 text-sm text-denied-fg mb-4">
                <p className="font-medium mb-1">This will delete all payment records for this cycle</p>
                <p className="text-xs">
                  Villa <strong>{unpaidTarget?.villaNumber}</strong> ({unpaidTarget?.ownerName}) will be reset
                  to PENDING/OVERDUE. Any overpayment credit from this cycle will also be removed.
                  This action cannot be undone — you will need to re-enter payments manually.
                </p>
              </div>
              <form onSubmit={onSubmitReversePayment} className="space-y-3">
                <div>
                  <label className="block text-sm text-fg-primary mb-1">Reason (optional)</label>
                  <textarea
                    value={unpaidReason}
                    onChange={(e) => onUnpaidReasonChange(e.target.value)}
                    placeholder="e.g. Payment bounced, incorrect entry, duplicate payment"
                    className="input w-full"
                    rows={2}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn bg-brand-danger text-white hover:opacity-90 flex-1 disabled:opacity-50"
                  >
                    Reverse Payment
                  </button>
                  <button
                    type="button"
                    onClick={onCloseUnpaidModal}
                    className="btn btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
      </Modal>
    </>
  );
}
