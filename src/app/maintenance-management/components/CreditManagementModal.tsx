"use client";

import { Modal } from "@/components/Modal";
import { CycleRow, ResidentRow, MONTHS, formatCurrency } from "./types";

interface CreditManagementModalProps {
  showCreditModal: boolean;
  onCloseCreditModal: () => void;
  creditRow: ResidentRow | null;
  creditAction: "apply" | "add" | "deduct";
  onCreditActionChange: (action: "apply" | "add" | "deduct") => void;
  creditAmount: string;
  onCreditAmountChange: (value: string) => void;
  creditRemarks: string;
  onCreditRemarksChange: (value: string) => void;
  onSubmitCreditAction: (e: React.FormEvent) => void;
  selectedCycle: CycleRow | null;
  loading: boolean;
}

export function CreditManagementModal({
  showCreditModal,
  onCloseCreditModal,
  creditRow,
  creditAction,
  onCreditActionChange,
  creditAmount,
  onCreditAmountChange,
  creditRemarks,
  onCreditRemarksChange,
  onSubmitCreditAction,
  selectedCycle,
  loading,
}: CreditManagementModalProps) {
  return (
    <Modal open={showCreditModal && !!creditRow} onClose={onCloseCreditModal}>
        <div className="card">
          {/* Header with balance */}
          <div className="card-header">
            <h2 className="text-lg font-semibold text-fg-primary">
              Advance Credit — Villa {creditRow?.villaNumber}
            </h2>
            <p className="text-sm text-fg-secondary mt-0.5">{creditRow?.ownerName}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-approved-fg">
                {formatCurrency(creditRow?.advanceCredit ?? 0)}
              </span>
              <span className="text-sm text-fg-secondary">available balance</span>
            </div>
          </div>

          {/* Action tabs */}
          <div className="px-5 pt-4">
            <div className="flex rounded-lg bg-surface-elevated p-1 gap-1">
              {(creditRow?.advanceCredit ?? 0) > 0 && creditRow?.status !== "PAID" && (
                <button
                  type="button"
                  onClick={() => onCreditActionChange("apply")}
                  className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    creditAction === "apply"
                      ? "bg-surface text-approved-fg shadow-sm"
                      : "text-fg-secondary hover:text-fg-primary"
                  }`}
                >
                  Use for this month
                </button>
              )}
              <button
                type="button"
                onClick={() => onCreditActionChange("add")}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  creditAction === "add"
                    ? "bg-surface text-brand-primary shadow-sm"
                    : "text-fg-secondary hover:text-fg-primary"
                }`}
              >
                Add credit
              </button>
              {(creditRow?.advanceCredit ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => onCreditActionChange("deduct")}
                  className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    creditAction === "deduct"
                      ? "bg-surface text-denied-fg shadow-sm"
                      : "text-fg-secondary hover:text-fg-primary"
                  }`}
                >
                  Deduct
                </button>
              )}
            </div>
          </div>

          {/* Action content */}
          <form onSubmit={onSubmitCreditAction} className="p-5 space-y-4">
            {creditAction === "apply" && (
              <>
                <div className="bg-approved-bg border border-approved-bg rounded-lg p-3 text-sm text-fg-primary">
                  <p className="font-medium mb-1">Use credit to settle this month</p>
                  <p className="text-approved-fg text-xs">
                    The system will apply up to {formatCurrency(creditRow?.advanceCredit ?? 0)} from the
                    available balance toward the {formatCurrency(Math.max(0, (creditRow?.amount ?? 0) - (creditRow?.paidTowardCycle ?? 0)))} remaining
                    due for {selectedCycle ? `${MONTHS[selectedCycle.periodMonth - 1]} ${selectedCycle.periodYear}` : "this month"}.
                    Any leftover credit stays in the balance for future months.
                  </p>
                </div>
              </>
            )}

            {creditAction === "add" && (
              <>
                <div className="bg-brand-primary-light border border-surface-border rounded-lg p-3 text-xs text-info-fg">
                  Record advance money received outside the system. This amount will be added to the
                  credit balance and can be used to settle future months.
                </div>
                <div>
                  <label className="block text-sm text-fg-primary mb-1">Amount to add (₹)</label>
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    required
                    value={creditAmount}
                    onChange={(e) => onCreditAmountChange(e.target.value)}
                    placeholder="e.g. 5000"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-fg-primary mb-1">Reason</label>
                  <input
                    type="text"
                    required
                    value={creditRemarks}
                    onChange={(e) => onCreditRemarksChange(e.target.value)}
                    placeholder="e.g. Advance cash received for 3 months"
                    className="input w-full"
                  />
                </div>
              </>
            )}

            {creditAction === "deduct" && (
              <>
                <div className="bg-denied-bg border border-denied-bg rounded-lg p-3 text-xs text-denied-fg">
                  Remove credit from this villa&apos;s balance. Use this to correct a mistake or reverse
                  an incorrect entry. You cannot deduct more than the available {formatCurrency(creditRow?.advanceCredit ?? 0)}.
                </div>
                <div>
                  <label className="block text-sm text-fg-primary mb-1">Amount to deduct (₹)</label>
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    max={creditRow?.advanceCredit ?? 0}
                    required
                    value={creditAmount}
                    onChange={(e) => onCreditAmountChange(e.target.value)}
                    placeholder={`Max ${formatCurrency(creditRow?.advanceCredit ?? 0)}`}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-fg-primary mb-1">Reason</label>
                  <input
                    type="text"
                    required
                    value={creditRemarks}
                    onChange={(e) => onCreditRemarksChange(e.target.value)}
                    placeholder="e.g. Reversing duplicate credit entry"
                    className="input w-full"
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 text-white px-4 py-2 rounded font-medium disabled:opacity-50 ${
                  creditAction === "apply"
                    ? "bg-approved-solid hover:bg-approved-solid hover:opacity-90"
                    : creditAction === "add"
                      ? "bg-brand-primary hover:bg-brand-primary-hover"
                      : "bg-brand-danger hover:bg-brand-danger hover:opacity-90"
                }`}
              >
                {creditAction === "apply"
                  ? "Apply credit now"
                  : creditAction === "add"
                    ? "Add to balance"
                    : "Deduct from balance"}
              </button>
              <button
                type="button"
                onClick={onCloseCreditModal}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
    </Modal>
  );
}
