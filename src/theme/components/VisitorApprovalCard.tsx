"use client";

import type { ReactNode } from "react";

export type VisitorApprovalStatus = "approved" | "pending" | "denied" | "info";

interface Props {
  visitorName: string;
  unit: string;
  arrival: string;
  status: VisitorApprovalStatus;
  onAllowEntry?: () => void;
  onBlockVisitor?: () => void;
  onDetails?: () => void;
}

const STATUS_LABEL: Record<VisitorApprovalStatus, string> = {
  approved: "APPROVED",
  pending: "PENDING",
  denied: "DENIED",
  info: "INFO",
};

const STATUS_BG: Record<VisitorApprovalStatus, string> = {
  approved: "bg-approved-bg text-approved-fg",
  pending: "bg-pending-bg text-pending-fg",
  denied: "bg-denied-bg text-denied-fg",
  info: "bg-info-bg text-info-fg",
};

/**
 * Production-ready sample showing the web token system in action.
 *
 * Zero hex literals. Zero raw Tailwind palette classes (`bg-red-500`, etc.).
 * Looks correct in both themes because every colour resolves to a CSS
 * variable on `<html>` that the `ThemeProvider` swaps when the user toggles.
 */
export function VisitorApprovalCard({
  visitorName,
  unit,
  arrival,
  status,
  onAllowEntry,
  onBlockVisitor,
  onDetails,
}: Props) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface p-16">
      <div className="flex items-start justify-between gap-12">
        <h3 className="text-18 font-semibold text-fg-primary">
          Visitor: {visitorName}
        </h3>
        <StatusBadge status={status} />
      </div>
      <p className="mt-8 text-14 text-fg-secondary">
        {unit} · Arriving {arrival}
      </p>
      <div className="mt-16 flex gap-8">
        <Button onClick={onAllowEntry} kind="accent">
          Allow entry
        </Button>
        <Button onClick={onDetails} kind="outline">
          Details
        </Button>
      </div>
      {onBlockVisitor ? (
        <button
          type="button"
          onClick={onBlockVisitor}
          className="mt-8 text-14 font-medium text-brand-danger hover:underline"
        >
          Block visitor
        </button>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: VisitorApprovalStatus }) {
  return (
    <span
      className={`rounded-full px-12 py-4 text-12 font-bold tracking-wider ${STATUS_BG[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function Button({
  children,
  onClick,
  kind,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind: "accent" | "outline";
}) {
  const base =
    "flex-1 rounded-md px-16 py-12 text-14 font-semibold transition-colors";
  const variants: Record<"accent" | "outline", string> = {
    accent: "bg-brand-accent text-fg-inverse hover:opacity-90",
    outline:
      "border border-surface-border bg-surface text-fg-primary hover:bg-surface-elevated",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${variants[kind]}`}
    >
      {children}
    </button>
  );
}
