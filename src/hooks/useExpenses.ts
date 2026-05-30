import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Expense,
  ExpenseCategoryOption,
  ExpenseCategory,
  FinancialYear,
} from "@/types/expense";

export type ExpensesParams = {
  limit?: number;
  offset?: number;
  categoryId?: string;
  financialYearId?: string;
  month?: string;
  year?: string;
  status?: string;
  paymentMode?: string;
  search?: string;
};

export function useExpenses(params?: ExpensesParams) {
  return useQuery({
    queryKey: ["expenses", params],
    queryFn: async () => {
      const qp: Record<string, string> = {
        limit: String(params?.limit ?? 50),
        offset: String(params?.offset ?? 0),
      };
      if (params?.categoryId) qp.categoryId = params.categoryId;
      if (params?.financialYearId) qp.financialYearId = params.financialYearId;
      if (params?.month) qp.month = params.month;
      if (params?.year) qp.year = params.year;
      if (params?.status) qp.status = params.status;
      if (params?.paymentMode) qp.paymentMode = params.paymentMode;
      if (params?.search) qp.search = params.search;

      const res = await api.get<Expense[]>("/expenses", { params: qp });
      const serverTotal = parseInt(
        res.headers["x-total-count"] || "0",
        10,
      );
      return {
        expenses: res.data ?? [],
        total: serverTotal || (res.data ?? []).length,
        limit: params?.limit ?? 50,
        offset: params?.offset ?? 0,
      };
    },
  });
}

export function useExpenseStats(params?: Omit<ExpensesParams, 'limit' | 'offset'>) {
  return useQuery({
    queryKey: ["expenseStats", params],
    queryFn: async () => {
      const qp: Record<string, string> = {};
      if (params?.categoryId) qp.categoryId = params.categoryId;
      if (params?.financialYearId) qp.financialYearId = params.financialYearId;
      if (params?.month) qp.month = params.month;
      if (params?.year) qp.year = params.year;
      if (params?.status) qp.status = params.status;
      if (params?.paymentMode) qp.paymentMode = params.paymentMode;
      if (params?.search) qp.search = params.search;

      const res = await api.get<{ total: number; count: number; thisMonth: number; thisYear: number }>(
        "/expenses/stats",
        { params: qp },
      );
      return res.data;
    },
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ["expenseCategories"],
    queryFn: async () => {
      const res = await api.get<ExpenseCategoryOption[]>(
        "/expenses/categories",
      );
      return res.data ?? [];
    },
  });
}

export function useExpenseCategoriesFull() {
  return useQuery({
    queryKey: ["expenseCategoriesFull"],
    queryFn: async () => {
      const res = await api.get<ExpenseCategory[]>("/expenses/categories");
      return res.data ?? [];
    },
  });
}

export function useFinancialYears() {
  return useQuery({
    queryKey: ["financialYears"],
    queryFn: async () => {
      const res = await api.get<{ financialYears: FinancialYear[] }>(
        "/v1/admin/financial-years",
      );
      return res.data.financialYears ?? [];
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/expenses/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post("/expenses/categories", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenseCategories"] });
      queryClient.invalidateQueries({ queryKey: ["expenseCategoriesFull"] });
    },
  });
}

export function useUpdateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await api.put(`/expenses/categories/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenseCategories"] });
      queryClient.invalidateQueries({ queryKey: ["expenseCategoriesFull"] });
    },
  });
}

export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/expenses/categories/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenseCategories"] });
      queryClient.invalidateQueries({ queryKey: ["expenseCategoriesFull"] });
    },
  });
}
