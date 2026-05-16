"use client";

import { Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { sortByVillaNumber } from "@/utils/villaSort";

type PaymentMode = "CASH" | "UPI" | "CHEQUE" | "BANK_TRANSFER";
type PaymentStatus = "PAID" | "PENDING" | "OVERDUE" | "PARTIAL";

type FinancialYear = { id: string; label: string; status?: string };
type CycleRow = {
  billingCycleId: string;
  maintenanceCollectionCycleId?: string;
  cycleKey: string;
  title: string;
  periodMonth: number;
  periodYear: number;
  dueDate?: string;
  status: string;
};
type VillaBasic = {
  id: string;
  villaNumber: string;
  ownerName: string;
  monthlyMaintenance: number;
};
type GridSummary = {
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
type ResidentRow = {
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

type GridCycleInfo = {
  id: string;
  status: string;
  title?: string;
};

type BillingCycleApiRow = {
  id: string;
  financialYearId?: string | null;
  cycleKey: string;
  title: string;
  paymentEndDate: string;
  status: string;
};

const MONTHS = [
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

export default function MaintenanceManagementPage() {
  const [loading, setLoading] = useState(false);
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
  const [rowEdit, setRowEdit] = useState<{
    villaId: string;
    villaNumber: string;
    expectedStr: string;
    paidStr: string;
  } | null>(null);
  const [paymentForm, setPaymentForm] = useState({
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
    void loadGrid(selectedCycleId).catch((err: unknown) => {
      showToast(parseApiError(err, "Failed to load residents").message, "error");
      setSummary(null);
      setResidents([]);
    });
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
  const cycleEditable = gridCycle == null ? true : gridCycle.status === "OPEN";

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

  const formatCurrency = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

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
              title={!cycleEditable ? "Only OPEN billing periods can be edited" : undefined}
              className="btn btn-primary disabled:opacity-50"
            >
              Save for selected month
            </button>
          </div>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="stat-card bg-brand-primary-light">
              <div className="stat-card-label text-brand-primary">Total Villas</div>
              <div className="stat-card-value text-lg text-fg-primary">{summary.totalVillas}</div>
            </div>
            <div className="stat-card bg-approved-bg">
              <div className="stat-card-label text-approved-fg">Paid</div>
              <div className="stat-card-value text-lg text-fg-primary">{summary.paidCount}</div>
            </div>
            <div className="stat-card bg-pending-bg">
              <div className="stat-card-label text-pending-fg">Unpaid</div>
              <div className="stat-card-value text-lg text-fg-primary">{summary.unpaidCount}</div>
            </div>
            <div className="stat-card bg-denied-bg">
              <div className="stat-card-label text-denied-fg">Overdue</div>
              <div className="stat-card-value text-lg text-fg-primary">{summary.overdueCount}</div>
            </div>
            <div className="stat-card bg-brand-primary-light">
              <div className="stat-card-label text-brand-primary">Collection</div>
              <div className="stat-card-value text-lg text-fg-primary">{summary.collectionRate}%</div>
            </div>
            {(summary.excludedCount ?? 0) > 0 && (
              <div className="stat-card bg-surface-elevated">
                <div className="stat-card-label text-fg-tertiary">Excluded</div>
                <div className="stat-card-value text-lg text-fg-primary">{summary.excludedCount}</div>
              </div>
            )}
          </div>
        )}

        {/* Advance Credit explainer */}
        {residents.length > 0 && (
          <div className="bg-brand-primary-light border border-surface-border rounded">
            <button
              type="button"
              onClick={() => setShowCreditHelp(!showCreditHelp)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-left"
            >
              <span className="text-sm font-medium text-fg-primary">
                What is Advance Credit?
              </span>
              <span className="text-brand-primary text-xs">{showCreditHelp ? "Hide" : "Show"}</span>
            </button>
            {showCreditHelp && (
              <div className="px-4 pb-3 text-sm text-fg-primary space-y-2 border-t border-surface-border pt-3">
                <p>
                  <strong>Advance credit</strong> is money a resident has paid in advance that hasn&apos;t been used yet.
                  It works like a wallet balance.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-surface rounded p-3 border border-surface-border">
                    <div className="font-semibold mb-1">How credit is created</div>
                    <ul className="list-disc list-inside space-y-0.5 text-info-fg">
                      <li>Resident overpays (pays more than the monthly amount)</li>
                      <li>Admin manually adds credit via &quot;Manage Credit&quot;</li>
                    </ul>
                  </div>
                  <div className="bg-surface rounded p-3 border border-surface-border">
                    <div className="font-semibold mb-1">How credit is used</div>
                    <ul className="list-disc list-inside space-y-0.5 text-info-fg">
                      <li>Click the green credit badge on any villa row</li>
                      <li>Choose &quot;Use credit for this month&quot; to apply it</li>
                      <li>The credit settles the pending amount (full or partial)</li>
                    </ul>
                  </div>
                  <div className="bg-surface rounded p-3 border border-surface-border">
                    <div className="font-semibold mb-1">Manual adjustments</div>
                    <ul className="list-disc list-inside space-y-0.5 text-info-fg">
                      <li><strong>Add credit</strong> — record advance cash received offline</li>
                      <li><strong>Deduct credit</strong> — correct a mistake or reverse an entry</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="filter-bar flex gap-3 items-center">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "all" | PaymentStatus | "EXCLUDED")}
            className="input"
          >
            <option value="all">All status</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIAL">Partial</option>
            <option value="OVERDUE">Overdue</option>
            <option value="EXCLUDED">Excluded</option>
          </select>
          <input
            type="text"
            placeholder="Search villa or owner..."
            className="input flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th className="table-th">Villa</th>
                <th className="table-th">Owner</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Advance Credit</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResidents.map((r) => {
                const credit = r.advanceCredit ?? 0;
                const remaining = r.amount - (r.paidTowardCycle ?? 0);
                return (
                  <tr key={r.villaId} className="table-row">
                    <td className="table-td font-medium">{r.villaNumber}</td>
                    <td className="table-td">{r.ownerName}</td>
                    <td className="table-td">
                      {r.paidTowardCycle != null && r.paidTowardCycle > 0
                        ? `${formatCurrency(r.paidTowardCycle)} / ${formatCurrency(r.amount)}`
                        : formatCurrency(r.amount)}
                    </td>
                    <td className="table-td">
                      {credit > 0 ? (
                        <button
                          type="button"
                          onClick={() => openCreditModal(r)}
                          disabled={!cycleEditable || loading}
                          className="inline-flex items-center gap-1.5 rounded-full bg-approved-bg border border-approved-bg px-2.5 py-1 text-xs font-semibold text-approved-fg hover:bg-approved-bg transition-colors disabled:opacity-40"
                          title="Click to manage this credit"
                        >
                          {formatCurrency(credit)}
                          {r.status !== "PAID" && remaining > 0 && (
                            <span className="text-approved-solid">- use it</span>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openCreditModal(r)}
                          disabled={!cycleEditable || loading}
                          className="text-fg-tertiary hover:text-brand-primary text-xs disabled:opacity-40"
                          title="Add advance credit"
                        >
                          + Add
                        </button>
                      )}
                    </td>
                    <td className="table-td">
                      {r.isExcluded ? (
                        <span className="badge badge-gray">EXCLUDED</span>
                      ) : (
                        <span className={`badge ${
                          r.status === "PAID"
                            ? "badge-success"
                            : r.status === "OVERDUE"
                              ? "badge-danger"
                              : r.status === "PARTIAL"
                                ? "badge-warning"
                                : "badge-gray"
                        }`}>
                          {r.status}
                        </span>
                      )}
                    </td>
                    <td className="table-td">
                      {r.isExcluded ? (
                        <button
                          type="button"
                          onClick={() => includeVilla(r)}
                          disabled={!cycleEditable || loading}
                          className="text-brand-primary hover:text-info-fg font-medium disabled:opacity-40"
                        >
                          Include
                        </button>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openRowEdit(r)}
                            disabled={!cycleEditable || loading}
                            title={!cycleEditable ? "Only OPEN periods can be edited" : "Edit expected & collected"}
                            className="text-fg-primary hover:text-brand-primary font-medium disabled:opacity-40"
                          >
                            Edit
                          </button>
                          {r.status !== "PAID" && (
                            <button
                              type="button"
                              onClick={() => openMarkPaid(r)}
                              disabled={!cycleEditable || loading}
                              className="text-brand-primary hover:text-info-fg font-medium disabled:opacity-40"
                            >
                              Mark paid
                            </button>
                          )}
                          {r.status === "PAID" && (
                            <span className="text-fg-secondary text-xs">Receipt: {r.receiptNumber || "—"}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => openExcludeModal(r)}
                            disabled={!cycleEditable || loading}
                            className="text-fg-tertiary hover:text-denied-fg text-sm disabled:opacity-40"
                            title="Exclude this villa from the cycle"
                          >
                            Exclude
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredResidents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-fg-secondary">
                    {selectedCycleId ? "No residents found" : "Please select financial year and month"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Row Edit modal ── */}
      {showRowEditModal && rowEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Edit villa row</h2>
            </div>
            <div className="card-body">
            <p className="text-sm text-fg-secondary mb-4">
              {rowEdit.villaNumber} — adjust expected maintenance and recorded collected amount (manual correction).
              If collected is more than expected, the extra will carry forward as resident advance credit.
            </p>
            <form onSubmit={submitRowEdit} className="space-y-3">
              <div>
                <label className="block text-sm text-fg-primary mb-1">Expected (₹)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={rowEdit.expectedStr}
                  onChange={(e) => setRowEdit((s) => (s ? { ...s, expectedStr: e.target.value } : s))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-fg-primary mb-1">Collected / paid toward cycle (₹)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={rowEdit.paidStr}
                  onChange={(e) => setRowEdit((s) => (s ? { ...s, paidStr: e.target.value } : s))}
                  className="input w-full"
                />
              </div>
              <p className="text-xs text-pending-fg bg-pending-bg border border-pending-bg rounded px-2 py-1.5">
                This updates the billing snapshot and resident billing ledger. It does not create or delete payment
                receipt rows; use that only when you need to correct totals already posted. Any collected amount above
                the expected cycle amount will remain as advance credit for this resident.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary flex-1 disabled:opacity-50"
                >
                  Save row
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRowEditModal(false);
                    setRowEdit(null);
                  }}
                  className="btn btn-ghost flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Mark Paid modal ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Mark Payment as Paid</h2>
            </div>
            <div className="card-body">
            <form onSubmit={submitMarkPaid} className="space-y-3">
              {(() => {
                const row = residents.find((r) => r.villaId === paymentForm.villaId);
                const credit = row?.advanceCredit ?? 0;
                return (
                  <>
                    <div className="text-sm text-fg-primary">Villa: {paymentForm.villaNumber}</div>
                    {credit > 0 && (
                      <p className="text-xs text-approved-fg bg-approved-bg border border-surface-border rounded px-2 py-1.5">
                        This villa has {formatCurrency(credit)} advance credit. Close this modal and click
                        the green credit badge to use it instead, or enter cash received below.
                      </p>
                    )}
                    <p className="text-xs text-info-fg bg-brand-primary-light border border-surface-border rounded px-2 py-1.5">
                      You can enter more than this month&apos;s amount. Any extra will automatically become
                      advance credit for future months.
                    </p>
                  </>
                );
              })()}
              <div>
                <label className="block text-sm text-fg-primary mb-1">Amount</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, amount: Number(e.target.value) }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-fg-primary mb-1">Payment date</label>
                <input
                  type="date"
                  required
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, paymentDate: e.target.value }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-fg-primary mb-1">Mode</label>
                <select
                  value={paymentForm.paymentMode}
                  onChange={(e) =>
                    setPaymentForm((p) => ({ ...p, paymentMode: e.target.value as PaymentMode }))
                  }
                  className="input w-full"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-fg-primary mb-1">Transaction ID (optional)</label>
                <input
                  type="text"
                  value={paymentForm.transactionId}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, transactionId: e.target.value }))}
                  className="input w-full"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary flex-1 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="btn btn-ghost flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Unified Credit modal ── */}
      {showCreditModal && creditRow && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            {/* Header with balance */}
            <div className="card-header">
              <h2 className="text-lg font-semibold text-fg-primary">
                Advance Credit — Villa {creditRow.villaNumber}
              </h2>
              <p className="text-sm text-fg-secondary mt-0.5">{creditRow.ownerName}</p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-approved-fg">
                  {formatCurrency(creditRow.advanceCredit ?? 0)}
                </span>
                <span className="text-sm text-fg-secondary">available balance</span>
              </div>
            </div>

            {/* Action tabs */}
            <div className="px-5 pt-4">
              <div className="flex rounded-lg bg-surface-elevated p-1 gap-1">
                {(creditRow.advanceCredit ?? 0) > 0 && creditRow.status !== "PAID" && (
                  <button
                    type="button"
                    onClick={() => setCreditAction("apply")}
                    className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      creditAction === "apply"
                        ? "bg-surface text-approved-fg shadow-sm"
                        : "text-fg-secondary hover:text-fg-primary"
                    }`}
                  >
                    Use for this month
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCreditAction("add")}
                  className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    creditAction === "add"
                      ? "bg-surface text-brand-primary shadow-sm"
                      : "text-fg-secondary hover:text-fg-primary"
                  }`}
                >
                  Add credit
                </button>
                {(creditRow.advanceCredit ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => setCreditAction("deduct")}
                    className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      creditAction === "deduct"
                        ? "bg-surface text-denied-fg shadow-sm"
                        : "text-fg-secondary hover:text-fg-primary"
                    }`}
                  >
                    Deduct
                  </button>
                )}
              </div>
            </div>

            {/* Action content */}
            <form onSubmit={submitCreditAction} className="p-5 space-y-4">
              {creditAction === "apply" && (
                <>
                  <div className="bg-approved-bg border border-approved-bg rounded-lg p-3 text-sm text-fg-primary">
                    <p className="font-medium mb-1">Use credit to settle this month</p>
                    <p className="text-approved-fg text-xs">
                      The system will apply up to {formatCurrency(creditRow.advanceCredit ?? 0)} from the
                      available balance toward the {formatCurrency(Math.max(0, creditRow.amount - (creditRow.paidTowardCycle ?? 0)))} remaining
                      due for {selectedCycle ? `${MONTHS[selectedCycle.periodMonth - 1]} ${selectedCycle.periodYear}` : "this month"}.
                      Any leftover credit stays in the balance for future months.
                    </p>
                  </div>
                </>
              )}

              {creditAction === "add" && (
                <>
                  <div className="bg-brand-primary-light border border-surface-border rounded-lg p-3 text-xs text-info-fg">
                    Record advance money received outside the system. This amount will be added to the
                    credit balance and can be used to settle future months.
                  </div>
                  <div>
                    <label className="block text-sm text-fg-primary mb-1">Amount to add (₹)</label>
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      required
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-fg-primary mb-1">Reason</label>
                    <input
                      type="text"
                      required
                      value={creditRemarks}
                      onChange={(e) => setCreditRemarks(e.target.value)}
                      placeholder="e.g. Advance cash received for 3 months"
                      className="input w-full"
                    />
                  </div>
                </>
              )}

              {creditAction === "deduct" && (
                <>
                  <div className="bg-denied-bg border border-denied-bg rounded-lg p-3 text-xs text-denied-fg">
                    Remove credit from this villa&apos;s balance. Use this to correct a mistake or reverse
                    an incorrect entry. You cannot deduct more than the available {formatCurrency(creditRow.advanceCredit ?? 0)}.
                  </div>
                  <div>
                    <label className="block text-sm text-fg-primary mb-1">Amount to deduct (₹)</label>
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      max={creditRow.advanceCredit ?? 0}
                      required
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder={`Max ${formatCurrency(creditRow.advanceCredit ?? 0)}`}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-fg-primary mb-1">Reason</label>
                    <input
                      type="text"
                      required
                      value={creditRemarks}
                      onChange={(e) => setCreditRemarks(e.target.value)}
                      placeholder="e.g. Reversing duplicate credit entry"
                      className="input w-full"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 text-white px-4 py-2 rounded font-medium disabled:opacity-50 ${
                    creditAction === "apply"
                      ? "bg-approved-solid hover:bg-approved-solid hover:opacity-90"
                      : creditAction === "add"
                        ? "bg-brand-primary hover:bg-brand-primary-hover"
                        : "bg-brand-danger hover:bg-brand-danger hover:opacity-90"
                  }`}
                >
                  {creditAction === "apply"
                    ? "Apply credit now"
                    : creditAction === "add"
                      ? "Add to balance"
                      : "Deduct from balance"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreditModal(false)}
                  className="btn btn-ghost flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Exclude Villa modal ── */}
      {showExcludeModal && excludeTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Exclude Villa from Cycle</h2>
            </div>
            <div className="card-body">
              <p className="text-sm text-fg-secondary mb-4">
                Exclude <strong>{excludeTarget.villaNumber}</strong> ({excludeTarget.ownerName}) from this billing cycle.
                The villa will show as EXCLUDED with ₹0 expected. It will be automatically included in the next cycle.
              </p>
              <form onSubmit={submitExcludeVilla} className="space-y-3">
                <div>
                  <label className="block text-sm text-fg-primary mb-1">Reason (optional)</label>
                  <textarea
                    value={excludeReason}
                    onChange={(e) => setExcludeReason(e.target.value)}
                    placeholder="e.g. Villa under renovation, vacant unit, courtesy waiver"
                    className="input w-full"
                    rows={2}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn bg-brand-danger text-white hover:opacity-90 flex-1 disabled:opacity-50"
                  >
                    Exclude Villa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExcludeModal(false);
                      setExcludeTarget(null);
                    }}
                    className="btn btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
