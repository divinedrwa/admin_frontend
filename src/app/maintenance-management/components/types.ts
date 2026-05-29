export type PaymentMode = "CASH" | "UPI" | "CHEQUE" | "BANK_TRANSFER";
export type PaymentStatus = "PAID" | "PENDING" | "OVERDUE" | "PARTIAL";

export type FinancialYear = { id: string; label: string; status?: string };
export type CycleRow = {
  billingCycleId: string;
  maintenanceCollectionCycleId?: string;
  cycleKey: string;
  title: string;
  periodMonth: number;
  periodYear: number;
  dueDate?: string;
  status: string;
};
export type VillaBasic = {
  id: string;
  villaNumber: string;
  ownerName: string;
  monthlyMaintenance: number;
};
export type GridSummary = {
  totalVillas: number;
  paidCount: number;
  unpaidCount: number;
  overdueCount: number;
  partialCount?: number;
  excludedCount?: number;
  totalAmount: number;
  collectedAmount: number;
  pendingAmount: number;
  collectionRate: number;
};
export type ResidentRow = {
  villaId: string;
  villaNumber: string;
  block: string | null;
  ownerName: string;
  amount: number;
  paidTowardCycle?: number;
  status: PaymentStatus;
  daysOverdue: number;
  paymentDate: string | null;
  receiptNumber: string | null;
  paymentMode: PaymentMode | null;
  snapshotId?: string;
  advanceCredit?: number;
  cashPaidThisCycle?: number;
  isExcluded?: boolean;
};

export type GridCycleInfo = {
  id: string;
  status: string;
  title?: string;
};

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const formatCurrency = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
