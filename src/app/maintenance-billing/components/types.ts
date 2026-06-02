export type BillingCycleRow = {
  id: string;
  cycleKey: string;
  month?: string;
  title: string;
  amount: number;
  status: string;
  storedStatus?: string;
  paymentWindow: string;
  paymentStartDate: string;
  paymentEndDate: string;
  paidUsersCount: number;
  pendingUsersCount: number;
  lateFee: number;
  gracePeriodDays: number;
  financialYearId?: string | null;
  financialYearLabel?: string | null;
  publishedAt?: string | null;
};

export type FinancialYearOption = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: string;
};

export type AuditRow = {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
};

export type ResidentRow = {
  id?: string;
  userId?: string;
  name?: string;
  flat?: string;
  cycleKey?: string;
  paymentStatus?: string;
  expectedAmount?: number;
  cashPaidAmount?: number;
  effectivePaidAmount?: number;
  paidAmount?: number;
  deltaAmount?: number;
  statusBadge?: string;
  [key: string]: unknown;
};

export type ResidentTotals = {
  totalExpected: number;
  totalCollected: number;
  totalShortfall: number;
  totalAdvanceCredit: number;
};

export type CycleFormData = {
  financialYearId: string;
  cycleMonth: string;
  title: string;
  amount: string;
  paymentStart: string;
  paymentEnd: string;
  lateFee: string;
  graceDays: string;
};

export type FyFormData = {
  label: string;
  startDate: string;
  endDate: string;
};

export function utcInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const fmtInr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

export function fmtDateOnly(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN");
}

export function paymentDeltaStyles(delta: number) {
  if (delta > 0) return "text-approved-fg font-semibold";
  if (delta < 0) return "text-denied-fg font-semibold";
  return "text-fg-primary font-semibold";
}

export function statusBadgeStyles(status: string) {
  if (status === "CREDIT") return "bg-approved-bg text-approved-fg border-approved-bg";
  if (status === "DUE") return "bg-denied-bg text-denied-fg border-denied-bg";
  if (status === "SETTLED") return "bg-surface-elevated text-fg-primary border-surface-border";
  return "bg-surface-elevated text-fg-primary border-surface-border";
}
