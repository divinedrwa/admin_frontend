"use client";

import { BellRing, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { sortByVillaNumber } from "@/utils/villaSort";

type FinancialYear = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: string;
};

type CollectionCycle = {
  id: string;
  title: string;
  periodMonth: number;
  periodYear: number;
  status: string;
};

type ResidentDueRow = {
  villaId: string;
  villaNumber: string;
  ownerName: string;
  status: string;
  isExcluded?: boolean;
  amount: number;
  paidTowardCycle?: number;
};

function pickDefaultFinancialYearId(fys: FinancialYear[]): string | null {
  if (fys.length === 0) return null;
  const today = new Date();
  for (const fy of fys) {
    const start = new Date(fy.startDate);
    const end = new Date(fy.endDate);
    if (today >= start && today <= end) return fy.id;
  }
  return fys[0]?.id ?? null;
}

function pickDefaultCycle(cycles: CollectionCycle[]): CollectionCycle | null {
  if (cycles.length === 0) return null;
  const now = new Date();
  const current = cycles.find(
    (c) => c.periodMonth === now.getMonth() + 1 && c.periodYear === now.getFullYear(),
  );
  if (current) return current;
  const open = cycles.find((c) => c.status === "OPEN");
  if (open) return open;
  return cycles[cycles.length - 1] ?? null;
}

function isActionable(row: ResidentDueRow): boolean {
  if (row.isExcluded) return false;
  const s = row.status.toUpperCase();
  return s === "PENDING" || s === "OVERDUE" || s === "PARTIAL";
}

export default function MaintenanceRemindersPage() {
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [financialYearId, setFinancialYearId] = useState("");
  const [cycles, setCycles] = useState<CollectionCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [residents, setResidents] = useState<ResidentDueRow[]>([]);
  const [selectedVillaIds, setSelectedVillaIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadFinancialYears = useCallback(async (signal?: AbortSignal) => {
    const res = await api.get("/maintenance-management/collection/financial-years", { signal });
    const fys = (res.data.financialYears ?? []) as FinancialYear[];
    setFinancialYears(fys);
    if (!financialYearId && fys.length > 0) {
      const id = pickDefaultFinancialYearId(fys);
      if (id) setFinancialYearId(id);
    }
  }, [financialYearId]);

  const loadCycles = useCallback(
    async (fyId: string, signal?: AbortSignal) => {
      if (!fyId) {
        setCycles([]);
        return;
      }
      const res = await api.get(
        `/maintenance-management/collection/financial-years/${encodeURIComponent(fyId)}/cycles`,
        { signal },
      );
      const list = (res.data.cycles ?? []) as CollectionCycle[];
      setCycles(list);
      const chosen = pickDefaultCycle(list);
      if (chosen) {
        setSelectedCycleId(chosen.id);
        setMonth(chosen.periodMonth);
        setYear(chosen.periodYear);
      }
    },
    [],
  );

  const loadResidents = useCallback(
    async (signal?: AbortSignal) => {
      const params: Record<string, string | number> = { month, year };
      if (selectedCycleId) params.maintenanceCollectionCycleId = selectedCycleId;
      const res = await api.get("/maintenance-management/financial-dashboard", {
        params,
        signal,
      });
      const rows = ((res.data.residents ?? []) as ResidentDueRow[]).filter(isActionable);
      const sorted = sortByVillaNumber(rows, (r) => r.villaNumber);
      setResidents(sorted);
      setSelectedVillaIds(new Set(sorted.map((r) => r.villaId)));
    },
    [month, year, selectedCycleId],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void loadFinancialYears(controller.signal)
      .catch((error) => {
        if ((error as { name?: string }).name === "CanceledError") return;
        showToast(parseApiError(error, "Failed to load financial years").message, "error");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [loadFinancialYears]);

  useEffect(() => {
    if (!financialYearId) return;
    const controller = new AbortController();
    void loadCycles(financialYearId, controller.signal).catch((error) => {
      if ((error as { name?: string }).name === "CanceledError") return;
      showToast(parseApiError(error, "Failed to load billing cycles").message, "error");
    });
    return () => controller.abort();
  }, [financialYearId, loadCycles]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void loadResidents(controller.signal)
      .catch((error) => {
        if ((error as { name?: string }).name === "CanceledError") return;
        showToast(parseApiError(error, "Failed to load pending residents").message, "error");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [loadResidents]);

  const periodLabel = useMemo(
    () => new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    [month, year],
  );

  const allSelected =
    residents.length > 0 && residents.every((r) => selectedVillaIds.has(r.villaId));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedVillaIds(new Set());
    } else {
      setSelectedVillaIds(new Set(residents.map((r) => r.villaId)));
    }
  };

  const toggleVilla = (villaId: string) => {
    setSelectedVillaIds((prev) => {
      const next = new Set(prev);
      if (next.has(villaId)) next.delete(villaId);
      else next.add(villaId);
      return next;
    });
  };

  const onCycleChange = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    const cycle = cycles.find((c) => c.id === cycleId);
    if (cycle) {
      setMonth(cycle.periodMonth);
      setYear(cycle.periodYear);
    }
  };

  const sendReminders = async () => {
    if (selectedVillaIds.size === 0) {
      showToast("Select at least one villa", "error");
      return;
    }
    setSending(true);
    try {
      let totalNotified = 0;
      let failed = 0;

      if (allSelected) {
        const res = await api.post("/maintenance-management/send-dues-reminders", { month, year });
        totalNotified = Number(res.data.sent ?? 0);
      } else {
        for (const villaId of selectedVillaIds) {
          try {
            const res = await api.post("/maintenance-management/send-villa-reminder", { villaId });
            totalNotified += Number(res.data.sent ?? 0);
          } catch {
            failed += 1;
          }
        }
      }

      if (failed > 0) {
        showToast(`Reminded ${totalNotified} · ${failed} failed — retry those villas`, "error");
      } else if (totalNotified > 0) {
        showToast(
          `Reminded ${totalNotified} resident${totalNotified === 1 ? "" : "s"} for ${periodLabel}`,
          "success",
        );
      } else {
        showToast("No residents to remind for this period", "info");
      }

      await loadResidents();
    } catch (error) {
      showToast(parseApiError(error, "Could not send reminders").message, "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell title="Dues reminders">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Maintenance"
          title="Send dues reminders"
          description="Notify residents with pending, partial, or overdue maintenance for the selected billing period. Matches the mobile admin reminders flow."
          icon={<BellRing className="h-6 w-6" />}
        />

        <div className="card">
          <div className="card-body flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Financial year</label>
              <select
                className="input min-w-[200px]"
                value={financialYearId}
                onChange={(e) => setFinancialYearId(e.target.value)}
              >
                <option value="">Select year</option>
                {financialYears.map((fy) => (
                  <option key={fy.id} value={fy.id}>
                    {fy.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Billing cycle</label>
              <select
                className="input min-w-[220px]"
                value={selectedCycleId}
                onChange={(e) => onCycleChange(e.target.value)}
              >
                <option value="">Select cycle</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.periodMonth}/{c.periodYear})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-fg-secondary pb-2">
              Period: <span className="font-medium text-fg-primary">{periodLabel}</span>
            </div>
            <button
              type="button"
              className="btn btn-primary ml-auto flex items-center gap-2"
              disabled={sending || selectedVillaIds.size === 0}
              onClick={() => void sendReminders()}
            >
              <Send className="h-4 w-4" />
              {sending ? "Sending…" : `Send to ${selectedVillaIds.size} villa${selectedVillaIds.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner w-10 h-10" />
            <p className="loading-state-text">Loading pending villas…</p>
          </div>
        ) : residents.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">✓</span>
            <p className="empty-state-title">No pending dues for {periodLabel}</p>
            <p className="empty-state-text">All villas are paid, waived, or excluded for this cycle.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th scope="col" className="table-th w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all villas"
                    />
                  </th>
                  <th scope="col" className="table-th">Villa</th>
                  <th scope="col" className="table-th">Owner</th>
                  <th scope="col" className="table-th">Status</th>
                  <th scope="col" className="table-th">Expected</th>
                  <th scope="col" className="table-th">Paid</th>
                  <th scope="col" className="table-th">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {residents.map((r) => {
                  const paid = Number(r.paidTowardCycle ?? 0);
                  const outstanding = Math.max(0, Number(r.amount ?? 0) - paid);
                  return (
                    <tr key={r.villaId} className="table-row">
                      <td className="table-td">
                        <input
                          type="checkbox"
                          checked={selectedVillaIds.has(r.villaId)}
                          onChange={() => toggleVilla(r.villaId)}
                          aria-label={`Select villa ${r.villaNumber}`}
                        />
                      </td>
                      <td className="table-td font-medium">{r.villaNumber}</td>
                      <td className="table-td">{r.ownerName}</td>
                      <td className="table-td">
                        <span className="badge badge-warning">{r.status}</span>
                      </td>
                      <td className="table-td">₹{Number(r.amount ?? 0).toLocaleString("en-IN")}</td>
                      <td className="table-td">₹{paid.toLocaleString("en-IN")}</td>
                      <td className="table-td text-denied-fg font-medium">
                        ₹{outstanding.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
