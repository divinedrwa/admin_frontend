export type FinancialYear = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
};

export interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  netAmount: number;
  paymentDate: string;
  paymentMode: string;
  paidTo: string;
  receiptNumber?: string;
  month?: number;
  year?: number;
  financialYear?: { id: string; label: string } | null;
  status: string;
  category: {
    id: string;
    name: string;
    color?: string;
    icon?: string;
  };
  attachments: unknown[];
}

/** Lightweight category reference used in expense filters/dropdowns. */
export interface ExpenseCategoryOption {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

/** Full category object returned by GET /api/expense-categories. */
export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  type: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  isRecurring: boolean;
  defaultAmount?: number;
  _count: {
    expenses: number;
  };
}

export type ExistingAttachment = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
};
