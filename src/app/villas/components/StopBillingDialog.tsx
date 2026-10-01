"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useMaintenanceEnrollmentPreview } from "@/hooks/useVillas";
import { formatPeriodLabel } from "./VillasTable";

const REASONS = ["Vacant", "Under construction", "Owner request", "Payment dispute", "Other"] as const;

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

interface StopBillingDialogProps {
  villaIds: string[];
  submitting: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/**
 * Confirms stopping maintenance billing: asks why, and shows per villa the dues already raised
 * (still payable), advance credit on record (kept for when billing resumes) and residents affected.
 */
export function StopBillingDialog({ villaIds, submitting, onConfirm, onCancel }: StopBillingDialogProps) {
  const [choice, setChoice] = useState<(typeof REASONS)[number] | "">("");
  const [details, setDetails] = useState("");
  const { data, isLoading, isError } = useMaintenanceEnrollmentPreview(villaIds);

  const reason = choice === "Other" ? details.trim() : [choice, details.trim()].filter(Boolean).join(" — ");
  const canSubmit = reason.length >= 2 && !submitting;
  const withDues = data?.villas.filter((v) => v.oldDues > 0) ?? [];
  const withCredit = data?.villas.filter((v) => v.advanceCredit > 0) ?? [];
  const residents = data?.villas.reduce((sum, v) => sum + v.residents, 0) ?? 0;
  const label = (v: { villaNumber: string; block: string | null }) =>
    v.block ? `${v.block}-${v.villaNumber}` : v.villaNumber;
  const count = villaIds.length === 1 ? "this villa" : `${villaIds.length} villas`;

  return (
    <Modal open onClose={onCancel} ariaLabel="Stop maintenance billing" maxWidth="max-w-lg">
      <form
        className="card p-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onConfirm(reason);
        }}
      >
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-fg-primary">Stop maintenance billing</h3>
          <p className="text-sm text-fg-secondary">
            {data
              ? `Stop billing ${count} from ${formatPeriodLabel(data.fromPeriod)} (the next cycle you create).`
              : `Stop billing ${count} from the next cycle you create.`}{" "}
            Guard and visitor features keep working.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-fg-primary" htmlFor="stop-reason">
            Reason *
          </label>
          <select
            id="stop-reason"
            className="input"
            value={choice}
            onChange={(e) => setChoice(e.target.value as typeof choice)}
          >
            <option value="">Choose a reason</option>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input
            className="input"
            maxLength={150}
            placeholder={choice === "Other" ? "Describe the reason" : "Details (optional)"}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-elevated p-3 text-sm space-y-2">
          {isLoading && <p className="text-fg-secondary">Checking dues and credit…</p>}
          {isError && <p className="text-fg-secondary">Could not load dues and credit. You can still continue.</p>}
          {data && (
            <>
              {withDues.length === 0 ? (
                <p className="text-fg-secondary">No unpaid dues.</p>
              ) : (
                <p className="text-fg-primary">
                  <span className="font-medium">Unpaid dues stay payable:</span>{" "}
                  {withDues.map((v) => `${label(v)} ${inr(v.oldDues)}`).join(", ")}. Residents keep the full app
                  and reminders until these are paid.
                </p>
              )}
              {withCredit.length > 0 && (
                <p className="text-fg-primary">
                  <span className="font-medium">Advance credit on record:</span>{" "}
                  {withCredit.map((v) => `${label(v)} ${inr(v.advanceCredit)}`).join(", ")}. It stays on the
                  account and is used when billing resumes; refund it outside the app if the owner asks.
                </p>
              )}
              <p className="text-fg-secondary">
                {residents === 0
                  ? "No active residents are affected."
                  : `${residents} resident${residents === 1 ? "" : "s"} will use the app for visitors only once dues are clear.`}
              </p>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-ghost text-sm" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-danger text-sm" disabled={!canSubmit}>
            {submitting ? "Processing..." : "Stop billing"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
