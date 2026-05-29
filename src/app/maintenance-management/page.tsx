"use client";

import { Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { sortByVillaNumber } from "@/utils/villaSort";
import {
  MaintenanceStatsCards,
  MaintenanceTable,
  PaymentModal,
  CreditManagementModal,
  ExcludeModal,
  formatCurrency,
  MONTHS,
} from "./components";
import type {
  PaymentMode,
  PaymentStatus,
  FinancialYear,
  CycleRow,
  VillaBasic,
  GridSummary,
  ResidentRow,
  GridCycleInfo,
  PaymentFormState,
  RowEditState,
} from "./components";

type BillingCycleApiRow = {
  id: string;
  financialYearId?: string | null;
  cycleKey: string;
  title: string;
  paymentEndDate: string;
  status: string;
};

export default function MaintenanceManagementPage() {
  const [loading, setLoading] = useState(false);
  const [gridLoading, setGridLoading] = useState(false);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [selectedFinancialYearId, setSelectedFinancialYearId] = useState("");
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [selectedMaintenanceCycleId, setSelectedMaintenanceCycleId] = useState("");

  const [villas, setVillas] = useState<VillaBasic[]>([]);
  const [selectedVillaId, setSelectedVillaId] = useState("");
  const [customAmount, setCustomAmount] = useState("");

  const [summary, setSummary] = useState<GridSummary | null>(null);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [gridCycle, setGridCycle] = useState<GridCycleInfo | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | PaymentStatus | "EXCLUDED">("all");
  const [search, setSearch] = useState("");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRowEditModal, setShowRowEditModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditRow, setCreditRow] = useState<ResidentRow | null>(null);
  const [creditAction, setCreditAction] = useState<"apply" | "add" | "deduct">("apply");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditRemarks, setCreditRemarks] = useState("");
  const [showCreditHelp, setShowCreditHelp] = useState(false);
  const [showExcludeModal, setShowExcludeModal] = useState(false);
  const [excludeTarget, setExcludeTarget] = useState<ResidentRow | null>(null);
  const [excludeReason, setExcludeReason] = useState("");
  const [showUnpaidModal, setShowUnpaidModal] = useState(false);
  const [unpaidTarget, setUnpaidTarget] = useState<ResidentRow | null>(null);
  const [unpaidReason, setUnpaidReason] = useState("");
  const [rowEdit, setRowEdit] = useState<RowEditState | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    villaId: "",
    villaNumber: "",
    amount: 0,
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMode: "CASH" as PaymentMode,
    transactionId: "",
    remarks: "",
  });

  const selectedCycle = useMemo(
    () => cycles.find((c) => c.billingCycleId === selectedCycleId) ?? null,
    [cycles, selectedCycleId]
  );

  const filteredResidents = useMemo(() => {
    let rows = residents;
    if (filterStatus === "EXCLUDED") {
      rows = rows.filter((r) => r.isExcluded);
    } else if (filterStatus !== "all") {
      rows = rows.filter((r) => r.status === filterStatus && !r.isExcluded);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) => r.villaNumber.toLowerCase().includes(q) || r.ownerName.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [residents, filterStatus, search]);

  async function loadFinancialYears() {
    const r = await api.get("/v1/admin/financial-years");
    const rows: FinancialYear[] = r.data.financialYears ?? [];
    setFinancialYears(rows);
    if (rows.length > 0) {
      setSelectedFinancialYearId((prev) => prev || rows[0].id);
    }
  }

  async function loadCycles(fyId: string) {
    if (!fyId) {
      setCycles([]);
      setSelectedCycleId("");
      return;
    }
    const r = await api.get("/v1/admin/cycles");
    const list: CycleRow[] = ((r.data.cycles ?? []) as BillingCycleApiRow[])
      .filter((c) => c.financialYearId === fyId)
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
      .sort((a: CycleRow, b: CycleRow) => {
        if (a.periodYear !== b.periodYear) return a.periodYear - b.periodYear;
        return a.periodMonth - b.periodMonth;
      });
    setCycles(list);
    setSelectedCycleId((prev) =>
      prev && list.some((c) => c.billingCycleId === prev) ? prev : list[0]?.billingCycleId ?? ""
    );
  }

  async function loadGrid(billingCycleId: string) {
    if (!billingCycleId) {
      setSummary(null);
      setResidents([]);
      setGridCycle(null);
      setSelectedMaintenanceCycleId("");
      return;
    }
    const sync = await api.post(
      `/maintenance-management/collection/billing-cycles/${billingCycleId}/sync`
    );
    const maintenanceCycleId = sync.data.maintenanceCollectionCycleId as string;
    setSelectedMaintenanceCycleId(maintenanceCycleId);
    const r = await api.get(`/maintenance-management/collection/cycles/${maintenanceCycleId}/grid`);
    setSummary(r.data.summary ?? null);
    setResidents(
      sortByVillaNumber(
        (r.data.villaPayments ?? []) as ResidentRow[],
        (row) => row.villaNumber,
      ),
    );
    const c = r.data.cycle;
    setGridCycle(
      c && typeof c.id === "string" && typeof c.status === "string"
        ? { id: c.id, status: c.status, title: c.title }
        : null
    );
  }

  async function loadVillas() {
    const r = await api.get("/villas");
    const list = sortByVillaNumber(
      (r.data.villas ?? []) as VillaBasic[],
      (v) => v.villaNumber,
    );
    setVillas(list);
    if (list.length > 0) {
      setSelectedVillaId((prev) => prev || list[0].id);
    }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadFinancialYears(), loadVillas()])
      .catch(() => showToast("Failed to load maintenance setup", "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadCycles(selectedFinancialYearId).catch(() =>
      showToast("Failed to load months for selected financial year", "error")
    );
  }, [selectedFinancialYearId]);

  useEffect(() => {
    setGridLoading(true);
    void loadGrid(selectedCycleId)
      .catch((err: unknown) => {
        showToast(parseApiError(err, "Failed to load residents").message, "error");
        setSummary(null);
        setResidents([]);
      })
      .finally(() => setGridLoading(false));
  }, [selectedCycleId]);

  async function saveVillaCustomAmount() {
    if (!selectedMaintenanceCycleId) {
      showToast("Select financial year and month first", "error");
      return;
    }
    if (!selectedVillaId) {
      showToast("Select a villa", "error");
      return;
    }
    const value = Number(customAmount);
    if (!Number.isFinite(value) || value < 0) {
      showToast("Enter a valid amount", "error");
      return;
    }

    try {
      setLoading(true);
      await api.put(`/maintenance-management/collection/cycles/${selectedMaintenanceCycleId}/custom-amount`, {
        villaId: selectedVillaId,
        amount: value,
      });
      try {
        await api.post(
          `/maintenance-management/collection/cycles/${selectedMaintenanceCycleId}/generate-snapshots`
        );
      } catch (genErr: unknown) {
        if ((genErr as { response?: { status?: number } })?.response?.status !== 409) throw genErr;
      }
      await loadGrid(selectedCycleId);
      showToast("Amount saved for selected month and financial year", "success");
      setCustomAmount("");
    } catch (err: unknown) {
      showToast(parseApiError(err, "Failed to save custom amount").message, "error");
    } finally {
      setLoading(false);
    }
  }

  /** Until grid loads, allow the rules form; after load, only OPEN collection cycles are editable. */
  /** Admin can edit in any status except LOCKED. */
  const cycleEditable = gridCycle == null ? true : gridCycle.status !== "LOCKED";

  function openRowEdit(r: ResidentRow) {
    const paid = r.paidTowardCycle ?? 0;
    setRowEdit({
      villaId: r.villaId,
      villaNumber: r.villaNumber,
      expectedStr: String(Number.isFinite(r.amount) ? r.amount : 0),
      paidStr: String(Number.isFinite(paid) ? paid : 0),
    });
    setShowRowEditModal(true);
  }

  async function submitRowEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!rowEdit || !selectedMaintenanceCycleId) return;
    const expected = parseFloat(rowEdit.expectedStr);
    const paid = parseFloat(rowEdit.paidStr);
    if (!Number.isFinite(expected) || expected < 0) {
      showToast("Enter a valid expected amount", "error");
      return;
    }
    if (!Number.isFinite(paid) || paid < 0) {
      showToast("Enter a valid collected amount", "error");
      return;
    }
    try {
      setLoading(true);
      await api.put(
        `/maintenance-management/collection/cycles/${selectedMaintenanceCycleId}/villa-grid-row`,
        {
          villaId: rowEdit.villaId,
          expectedAmount: expected,
          paidAmount: paid,
        }
      );
      setShowRowEditModal(false);
      setRowEdit(null);
      await loadGrid(selectedCycleId);
      showToast("Villa row updated", "success");
    } catch (err: unknown) {
      showToast(parseApiError(err, "Failed to update row").message, "error");
    } finally {
      setLoading(false);
    }
  }

  function openMarkPaid(row: ResidentRow) {
    const remaining = Math.max(0, row.amount - (row.paidTowardCycle ?? 0));
    setPaymentForm({
      villaId: row.villaId,
      villaNumber: row.villaNumber,
      amount: remaining || row.amount,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMode: "CASH",
      transactionId: "",
      remarks: "",
    });
    setShowPaymentModal(true);
  }

  async function submitMarkPaid(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCycle || !selectedCycleId) {
      showToast("Please select month first", "error");
      return;
    }
    try {
      setLoading(true);
      await api.post("/maintenance-management/mark-paid", {
        villaId: paymentForm.villaId,
        year: selectedCycle.periodYear,
        month: selectedCycle.periodMonth,
        amount: Number(paymentForm.amount),
        paymentDate: new Date(paymentForm.paymentDate).toISOString(),
        paymentMode: paymentForm.paymentMode,
        transactionId: paymentForm.transactionId || undefined,
        remarks: paymentForm.remarks || undefined,
        maintenanceCollectionCycleId: selectedMaintenanceCycleId,
      });
      setShowPaymentModal(false);
      await loadGrid(selectedCycleId);
      showToast("Payment marked for selected financial year and month", "success");
    } catch (err: unknown) {
      showToast(parseApiError(err, "Failed to mark payment").message, "error");
    } finally {
      setLoading(false);
    }
  }

  // ── Unified credit modal ──

  function openCreditModal(row: ResidentRow) {
    setCreditRow(row);
    const credit = row.advanceCredit ?? 0;
    // Default to the most useful action
    setCreditAction(credit > 0 && row.status !== "PAID" ? "apply" : "add");
    setCreditAmount("");
    setCreditRemarks("");
    setShowCreditModal(true);
  }

  async function submitCreditAction(e: React.FormEvent) {
    e.preventDefault();
    if (!creditRow || !selectedMaintenanceCycleId) return;

    try {
      setLoading(true);

      if (creditAction === "apply") {
        const r = await api.post("/maintenance-management/apply-credit", {
          villaId: creditRow.villaId,
          maintenanceCollectionCycleId: selectedMaintenanceCycleId,
        });
        const applied = r.data.creditApplied ?? 0;
        showToast(
          `${formatCurrency(applied)} credit applied to Villa ${creditRow.villaNumber}`,
          "success"
        );
      } else {
        const amt = parseFloat(creditAmount);
        if (!Number.isFinite(amt) || amt <= 0) {
          showToast("Enter a valid amount", "error");
          setLoading(false);
          return;
        }
        if (!creditRemarks.trim()) {
          showToast("Please enter a reason", "error");
          setLoading(false);
          return;
        }
        const adjustedAmount = creditAction === "deduct" ? -amt : amt;
        const r = await api.post("/maintenance-management/manual-credit-adjustment", {
          villaId: creditRow.villaId,
          maintenanceCollectionCycleId: selectedMaintenanceCycleId,
          amount: adjustedAmount,
          remarks: creditRemarks.trim(),
        });
        showToast(r.data.message || "Credit adjusted", "success");
      }

      setShowCreditModal(false);
      await loadGrid(selectedCycleId);
    } catch (err: unknown) {
      showToast(parseApiError(err, "Failed").message, "error");
    } finally {
      setLoading(false);
    }
  }

  function openExcludeModal(row: ResidentRow) {
    setExcludeTarget(row);
    setExcludeReason("");
    setShowExcludeModal(true);
  }

  async function submitExcludeVilla(e: React.FormEvent) {
    e.preventDefault();
    if (!excludeTarget || !selectedMaintenanceCycleId) return;
    try {
      setLoading(true);
      await api.post(
        `/maintenance-management/collection/cycles/${selectedMaintenanceCycleId}/exclude-villa`,
        {
          villaId: excludeTarget.villaId,
          reason: excludeReason.trim() || undefined,
        }
      );
      setShowExcludeModal(false);
      setExcludeTarget(null);
      await loadGrid(selectedCycleId);
      showToast(`Villa ${excludeTarget.villaNumber} excluded from this cycle`, "success");
    } catch (err: unknown) {
      showToast(parseApiError(err, "Failed to exclude villa").message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function includeVilla(row: ResidentRow) {
    if (!selectedMaintenanceCycleId) return;
    try {
      setLoading(true);
      await api.delete(
        `/maintenance-management/collection/cycles/${selectedMaintenanceCycleId}/exclude-villa/${row.villaId}`
      );
      await loadGrid(selectedCycleId);
      showToast(`Villa ${row.villaNumber} re-included in this cycle`, "success");
    } catch (err: unknown) {
      showToast(parseApiError(err, "Failed to include villa").message, "error");
    } finally {
      setLoading(false);
    }
  }

  function openUnpaidModal(row: ResidentRow) {
    setUnpaidTarget(row);
    setUnpaidReason("");
    setShowUnpaidModal(true);
  }

  async function submitReversePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!unpaidTarget || !selectedMaintenanceCycleId) return;
    try {
      setLoading(true);
      await api.post("/maintenance-management/reverse-payment", {
        villaId: unpaidTarget.villaId,
        maintenanceCollectionCycleId: selectedMaintenanceCycleId,
        reason: unpaidReason.trim() || undefined,
      });
      setShowUnpaidModal(false);
      setUnpaidTarget(null);
      await loadGrid(selectedCycleId);
      showToast(`Payment reversed for Villa ${unpaidTarget.villaNumber}`, "success");
    } catch (err: unknown) {
      showToast(parseApiError(err, "Failed to reverse payment").message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Maintenance Payment Management">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Resident payments"
          title="Maintenance payment management"
          description="Review cycle-wise collections, adjust villa-specific amounts, post payments, and manage credits from a single billing operations dashboard."
          icon={<Wallet className="h-6 w-6" />}
        />

        <div className="card">
          <div className="card-header"><h3 className="text-base font-semibold text-fg-primary">Select Financial Year and Month</h3></div>
          <div className="card-body space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Financial Year</label>
              <select
                value={selectedFinancialYearId}
                onChange={(e) => setSelectedFinancialYearId(e.target.value)}
                className="input w-full"
              >
                <option value="">Select financial year...</option>
                {financialYears.map((fy) => (
                  <option key={fy.id} value={fy.id}>
                    {fy.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Month (from created billing cycles)</label>
              <select
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className="input w-full"
                disabled={!selectedFinancialYearId}
              >
                <option value="">Select month...</option>
                {cycles.map((c) => (
                  <option key={c.billingCycleId} value={c.billingCycleId}>
                    {MONTHS[c.periodMonth - 1]} {c.periodYear}
                  </option>
                ))}
              </select>
            </div>
          </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="text-base font-semibold text-fg-primary">Maintenance Amount Rules</h3></div>
          <div className="card-body space-y-4">
          <p className="text-sm text-fg-secondary">
            Set custom amount for a single villa for the selected month. After payments are posted, amounts still
            update for that villa&apos;s row (or use <strong>Edit</strong> in the table for expected and collected).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Villa</label>
              <select
                value={selectedVillaId}
                onChange={(e) => setSelectedVillaId(e.target.value)}
                disabled={!cycleEditable && !!selectedCycleId}
                className="input w-full disabled:opacity-50"
              >
                <option value="">Select villa...</option>
                {villas.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.villaNumber} - {v.ownerName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Custom amount (₹)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                disabled={!cycleEditable && !!selectedCycleId}
                className="input w-full disabled:opacity-50"
              />
            </div>
            <button
              type="button"
              onClick={() => void saveVillaCustomAmount()}
              disabled={loading || !selectedCycleId || !cycleEditable}
              title={!cycleEditable ? "This billing cycle is locked" : undefined}
              className="btn btn-primary disabled:opacity-50"
            >
              Save for selected month
            </button>
          </div>
          </div>
        </div>

        {summary && (
          <MaintenanceStatsCards summary={summary} />
        )}

        <MaintenanceTable
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          search={search}
          onSearchChange={setSearch}
          filteredResidents={filteredResidents}
          selectedCycleId={selectedCycleId}
          gridLoading={gridLoading}
          cycleEditable={cycleEditable}
          loading={loading}
          showCreditHelp={showCreditHelp}
          onToggleCreditHelp={() => setShowCreditHelp(!showCreditHelp)}
          hasResidents={residents.length > 0}
          onOpenRowEdit={openRowEdit}
          onOpenMarkPaid={openMarkPaid}
          onOpenCreditModal={openCreditModal}
          onOpenExcludeModal={openExcludeModal}
          onOpenUnpaidModal={openUnpaidModal}
          onIncludeVilla={includeVilla}
        />
      </div>

      <PaymentModal
        showPaymentModal={showPaymentModal}
        onClosePaymentModal={() => setShowPaymentModal(false)}
        paymentForm={paymentForm}
        onPaymentFormChange={setPaymentForm}
        onSubmitMarkPaid={submitMarkPaid}
        residents={residents}
        loading={loading}
        showRowEditModal={showRowEditModal}
        onCloseRowEditModal={() => { setShowRowEditModal(false); setRowEdit(null); }}
        rowEdit={rowEdit}
        onRowEditChange={setRowEdit}
        onSubmitRowEdit={submitRowEdit}
      />

      <CreditManagementModal
        showCreditModal={showCreditModal}
        onCloseCreditModal={() => setShowCreditModal(false)}
        creditRow={creditRow}
        creditAction={creditAction}
        onCreditActionChange={setCreditAction}
        creditAmount={creditAmount}
        onCreditAmountChange={setCreditAmount}
        creditRemarks={creditRemarks}
        onCreditRemarksChange={setCreditRemarks}
        onSubmitCreditAction={submitCreditAction}
        selectedCycle={selectedCycle}
        loading={loading}
      />

      <ExcludeModal
        showExcludeModal={showExcludeModal}
        onCloseExcludeModal={() => { setShowExcludeModal(false); setExcludeTarget(null); }}
        excludeTarget={excludeTarget}
        excludeReason={excludeReason}
        onExcludeReasonChange={setExcludeReason}
        onSubmitExcludeVilla={submitExcludeVilla}
        loading={loading}
        showUnpaidModal={showUnpaidModal}
        onCloseUnpaidModal={() => { setShowUnpaidModal(false); setUnpaidTarget(null); }}
        unpaidTarget={unpaidTarget}
        unpaidReason={unpaidReason}
        onUnpaidReasonChange={setUnpaidReason}
        onSubmitReversePayment={submitReversePayment}
      />
    </AppShell>
  );
}
