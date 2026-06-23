import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { sortByVillaNumber } from "@/utils/villaSort";
import type {
  CycleRow,
  FinancialYear,
  GridCycleInfo,
  GridSummary,
  ResidentRow,
} from "@/app/maintenance-management/components/types";

type BillingCycleApiRow = {
  id: string;
  financialYearId?: string | null;
  cycleKey: string;
  title: string;
  paymentEndDate: string;
  status: string;
};

export type MaintenanceGridData = {
  maintenanceCycleId: string;
  summary: GridSummary | null;
  residents: ResidentRow[];
  cycle: GridCycleInfo | null;
};

export function useFinancialYears() {
  return useQuery({
    queryKey: ["financialYears"],
    queryFn: async () => {
      const r = await api.get("/v1/admin/financial-years");
      return (r.data.financialYears ?? []) as FinancialYear[];
    },
    staleTime: 60_000,
  });
}

export function useBillingCycles(financialYearId: string) {
  return useQuery({
    queryKey: ["billingCycles", financialYearId],
    enabled: Boolean(financialYearId),
    queryFn: async () => {
      const r = await api.get("/v1/admin/cycles");
      const list: CycleRow[] = ((r.data.cycles ?? []) as BillingCycleApiRow[])
        .filter((c) => c.financialYearId === financialYearId)
        .map((c) => {
          const m = /^(\d{4})-(\d{2})$/.exec(c.cycleKey ?? "");
          const periodYear = m ? Number(m[1]) : new Date(c.paymentEndDate).getFullYear();
          const periodMonth = m ? Number(m[2]) : new Date(c.paymentEndDate).getMonth() + 1;
          return {
            billingCycleId: c.id,
            cycleKey: c.cycleKey,
            title: c.title,
            periodMonth,
            periodYear,
            dueDate: c.paymentEndDate,
            status: c.status,
          } as CycleRow;
        })
        .sort((a, b) => {
          if (a.periodYear !== b.periodYear) return a.periodYear - b.periodYear;
          return a.periodMonth - b.periodMonth;
        });
      return list;
    },
    staleTime: 30_000,
  });
}

export function useMaintenanceGrid(billingCycleId: string) {
  return useQuery({
    queryKey: ["maintenanceGrid", billingCycleId],
    enabled: Boolean(billingCycleId),
    queryFn: async (): Promise<MaintenanceGridData> => {
      const sync = await api.post(
        `/maintenance-management/collection/billing-cycles/${billingCycleId}/sync`,
      );
      const maintenanceCycleId = sync.data.maintenanceCollectionCycleId as string;
      const r = await api.get(
        `/maintenance-management/collection/cycles/${maintenanceCycleId}/grid`,
      );
      const c = r.data.cycle;
      return {
        maintenanceCycleId,
        summary: r.data.summary ?? null,
        residents: sortByVillaNumber(
          (r.data.villaPayments ?? []) as ResidentRow[],
          (row) => row.villaNumber,
        ),
        cycle:
          c && typeof c.id === "string" && typeof c.status === "string"
            ? { id: c.id, status: c.status, title: c.title }
            : null,
      };
    },
    staleTime: 10_000,
  });
}
