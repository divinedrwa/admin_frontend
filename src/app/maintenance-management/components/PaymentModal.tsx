"use client";

import { Modal } from "@/components/Modal";
import { PaymentMode, ResidentRow, formatCurrency } from "./types";

interface PaymentFormState {
  villaId: string;
  villaNumber: string;
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  transactionId: string;
  remarks: string;
}

interface RowEditState {
  villaId: string;
  villaNumber: string;
  expectedStr: string;
  paidStr: string;
}

interface PaymentModalProps {
  /* Mark Paid modal */
  showPaymentModal: boolean;
  onClosePaymentModal: () => void;
  paymentForm: PaymentFormState;
  onPaymentFormChange: (updater: (prev: PaymentFormState) => PaymentFormState) => void;
  onSubmitMarkPaid: (e: React.FormEvent) => void;
  residents: ResidentRow[];
  loading: boolean;

  /* Row Edit modal */
  showRowEditModal: boolean;
  onCloseRowEditModal: () => void;
  rowEdit: RowEditState | null;
  onRowEditChange: (updater: (prev: RowEditState | null) => RowEditState | null) => void;
  onSubmitRowEdit: (e: React.FormEvent) => void;
}

export function PaymentModal({
  showPaymentModal,
  onClosePaymentModal,
  paymentForm,
  onPaymentFormChange,
  onSubmitMarkPaid,
  residents,
  loading,
  showRowEditModal,
  onCloseRowEditModal,
  rowEdit,
  onRowEditChange,
  onSubmitRowEdit,
}: PaymentModalProps) {
  return (
    <>
      {/* ── Row Edit modal ── */}
      <Modal open={showRowEditModal && !!rowEdit} onClose={onCloseRowEditModal}>
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Edit villa row</h2>
            </div>
            <div className="card-body">
            <p className="text-sm text-fg-secondary mb-4">
              {rowEdit?.villaNumber} — adjust expected maintenance and recorded collected amount (manual correction).
              If collected is more than expected, the extra will carry forward as resident advance credit.
            </p>
            <form onSubmit={onSubmitRowEdit} className="space-y-3">
              <div>
                <label className="block text-sm text-fg-primary mb-1">Expected (₹)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={rowEdit?.expectedStr}
                  onChange={(e) => onRowEditChange((s) => (s ? { ...s, expectedStr: e.target.value } : s))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-fg-primary mb-1">Collected / paid toward cycle (₹)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={rowEdit?.paidStr}
                  onChange={(e) => onRowEditChange((s) => (s ? { ...s, paidStr: e.target.value } : s))}
                  className="input w-full"
                />
              </div>
              <p className="text-xs text-pending-fg bg-pending-bg border border-pending-bg rounded px-2 py-1.5">
                This updates the billing snapshot and resident billing ledger. It does not create or delete payment
                receipt rows; use that only when you need to correct totals already posted. Any collected amount above
                the expected cycle amount will remain as advance credit for this resident.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary flex-1 disabled:opacity-50"
                >
                  Save row
                </button>
                <button
                  type="button"
                  onClick={onCloseRowEditModal}
                  className="btn btn-ghost flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
      </Modal>

      {/* ── Mark Paid modal ── */}
      <Modal open={showPaymentModal} onClose={onClosePaymentModal}>
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Mark Payment as Paid</h2>
            </div>
            <div className="card-body">
            <form onSubmit={onSubmitMarkPaid} className="space-y-3">
              {(() => {
                const row = residents.find((r) => r.villaId === paymentForm.villaId);
                const credit = row?.advanceCredit ?? 0;
                return (
                  <>
                    <div className="text-sm text-fg-primary">Villa: {paymentForm.villaNumber}</div>
                    {credit > 0 && (
                      <p className="text-xs text-approved-fg bg-approved-bg border border-surface-border rounded px-2 py-1.5">
                        This villa has {formatCurrency(credit)} advance credit. Close this modal and click
                        the green credit badge to use it instead, or enter cash received below.
                      </p>
                    )}
                    <p className="text-xs text-info-fg bg-brand-primary-light border border-surface-border rounded px-2 py-1.5">
                      You can enter more than this month&apos;s amount. Any extra will automatically become
                      advance credit for future months.
                    </p>
                  </>
                );
              })()}
              <div>
                <label className="block text-sm text-fg-primary mb-1">Amount</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => onPaymentFormChange((p) => ({ ...p, amount: Number(e.target.value) }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-fg-primary mb-1">Payment date</label>
                <input
                  type="date"
                  required
                  value={paymentForm.paymentDate}
                  onChange={(e) => onPaymentFormChange((p) => ({ ...p, paymentDate: e.target.value }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-fg-primary mb-1">Mode</label>
                <select
                  value={paymentForm.paymentMode}
                  onChange={(e) =>
                    onPaymentFormChange((p) => ({ ...p, paymentMode: e.target.value as PaymentMode }))
                  }
                  className="input w-full"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-fg-primary mb-1">Transaction ID (optional)</label>
                <input
                  type="text"
                  value={paymentForm.transactionId}
                  onChange={(e) => onPaymentFormChange((p) => ({ ...p, transactionId: e.target.value }))}
                  className="input w-full"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary flex-1 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={onClosePaymentModal}
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

export type { PaymentFormState, RowEditState };
