import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type BillingCycleMonthOption = {
  month: number;
  year: number;
  label: string;
  cycleKey: string;
};

type BillingCycleRow = {
  cycleKey: string;
  title?: string;
};

export function cycleKeyToMonthOption(
  cycleKey: string,
  title?: string,
): BillingCycleMonthOption | null {
  const parts = cycleKey.split("-");
  if (parts.length < 2) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  const date = new Date(y, m - 1, 1);
  const monthLabel = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return {
    month: m,
    year: y,
    label: title ? `${monthLabel} · ${title}` : monthLabel,
    cycleKey,
  };
}

/** Billing months for a financial year — only cycles that exist in admin billing. */
export function useBillingCycleMonthOptions(financialYearId: string) {
  const [monthOptions, setMonthOptions] = useState<BillingCycleMonthOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!financialYearId) {
      setMonthOptions([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void api
      .get("/v1/billing-cycles", {
        params: { financialYearId },
        signal: controller.signal,
      })
      .then((res) => {
        const cycles = (res.data?.cycles ?? []) as BillingCycleRow[];
        const rows = cycles
          .map((c) => cycleKeyToMonthOption(c.cycleKey, c.title))
          .filter((x): x is BillingCycleMonthOption => x != null)
          .sort((a, b) => a.cycleKey.localeCompare(b.cycleKey));
        setMonthOptions(rows);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === "CanceledError") return;
        setMonthOptions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [financialYearId]);

  return { monthOptions, loading };
}
