"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

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
};

type GridCycleInfo = {
  id: string;
  status: string;
  title?: string;
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
  const [filterStatus, setFilterStatus] = useState<"all" | PaymentStatus>("all");
  const [search, setSearch] = useState("");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRowEditModal, setShowRowEditModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditRow, setCreditRow] = useState<ResidentRow | null>(null);
  const [creditAction, setCreditAction] = useState<"apply" | "add" | "deduct">("apply");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditRemarks, setCreditRemarks] = useState("");
  const [showCreditHelp, setShowCreditHelp] = useState(false);
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
    if (filterStatus !== "all") rows = rows.filter((r) => r.status === filterStatus);
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
    const list: CycleRow[] = (r.data.cycles ?? [])
      .filter((c: any) => c.financialYearId === fyId)
      .map((c: any) => {
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
    setResidents(r.data.villaPayments ?? []);
    const c = r.data.cycle;
    setGridCycle(
      c && typeof c.id === "string" && typeof c.status === "string"
        ? { id: c.id, status: c.status, title: c.title }
        : null
    );
  }

  async function loadVillas() {
    const r = await api.get("/villas");
    const list: VillaBasic[] = r.data.villas ?? [];
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
    void loadGrid(selectedCycleId).catch((err: any) => {
      showToast(err.response?.data?.message || "Failed to load residents", "error");
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
      } catch (genErr: any) {
        if (genErr?.response?.status !== 409) throw genErr;
      }
      await loadGrid(selectedCycleId);
      showToast("Amount saved for selected month and financial year", "success");
      setCustomAmount("");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to save custom amount", "error");
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
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to update row", "error");
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
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to mark payment", "error");
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
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed", "error");
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  return (
    <AppShell title="Maintenance Payment Management">
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded p-4 space-y-4">
          <h3 className="text-base font-semibold text-gray-900">Select Financial Year and Month</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
              <select
                value={selectedFinancialYearId}
                onChange={(e) => setSelectedFinancialYearId(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 w-full"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Month (from created billing cycles)</label>
              <select
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 w-full"
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

        <div className="bg-white border border-gray-200 rounded p-4 space-y-4">
          <h3 className="text-base font-semibold text-gray-900">Maintenance Amount Rules</h3>
          <p className="text-sm text-gray-600">
            Set custom amount for a single villa for the selected month. After payments are posted, amounts still
            update for that villa&apos;s row (or use <strong>Edit</strong> in the table for expected and collected).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Villa</label>
              <select
                value={selectedVillaId}
                onChange={(e) => setSelectedVillaId(e.target.value)}
                disabled={!cycleEditable && !!selectedCycleId}
                className="border border-gray-300 rounded px-3 py-2 w-full disabled:opacity-50"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom amount (₹)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                disabled={!cycleEditable && !!selectedCycleId}
                className="border border-gray-300 rounded px-3 py-2 w-full disabled:opacity-50"
              />
            </div>
            <button
              type="button"
              onClick={() => void saveVillaCustomAmount()}
              disabled={loading || !selectedCycleId || !cycleEditable}
              title={!cycleEditable ? "Only OPEN billing periods can be edited" : undefined}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Save for selected month
            </button>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="text-xs text-blue-700">Total Villas</div>
              <div className="text-lg font-bold text-blue-900">{summary.totalVillas}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="text-xs text-green-700">Paid</div>
              <div className="text-lg font-bold text-green-900">{summary.paidCount}</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="text-xs text-yellow-700">Unpaid</div>
              <div className="text-lg font-bold text-yellow-900">{summary.unpaidCount}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="text-xs text-red-700">Overdue</div>
              <div className="text-lg font-bold text-red-900">{summary.overdueCount}</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded p-3">
              <div className="text-xs text-purple-700">Collection</div>
              <div className="text-lg font-bold text-purple-900">{summary.collectionRate}%</div>
            </div>
          </div>
        )}

        {/* Advance Credit explainer */}
        {residents.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded">
            <button
              type="button"
              onClick={() => setShowCreditHelp(!showCreditHelp)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-left"
            >
              <span className="text-sm font-medium text-blue-900">
                What is Advance Credit?
              </span>
              <span className="text-blue-600 text-xs">{showCreditHelp ? "Hide" : "Show"}</span>
            </button>
            {showCreditHelp && (
              <div className="px-4 pb-3 text-sm text-blue-900 space-y-2 border-t border-blue-200 pt-3">
                <p>
                  <strong>Advance credit</strong> is money a resident has paid in advance that hasn&apos;t been used yet.
                  It works like a wallet balance.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white rounded p-3 border border-blue-100">
                    <div className="font-semibold mb-1">How credit is created</div>
                    <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                      <li>Resident overpays (pays more than the monthly amount)</li>
                      <li>Admin manually adds credit via &quot;Manage Credit&quot;</li>
                    </ul>
                  </div>
                  <div className="bg-white rounded p-3 border border-blue-100">
                    <div className="font-semibold mb-1">How credit is used</div>
                    <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                      <li>Click the green credit badge on any villa row</li>
                      <li>Choose &quot;Use credit for this month&quot; to apply it</li>
                      <li>The credit settles the pending amount (full or partial)</li>
                    </ul>
                  </div>
                  <div className="bg-white rounded p-3 border border-blue-100">
                    <div className="font-semibold mb-1">Manual adjustments</div>
                    <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                      <li><strong>Add credit</strong> — record advance cash received offline</li>
                      <li><strong>Deduct credit</strong> — correct a mistake or reverse an entry</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 items-center">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="all">All status</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIAL">Partial</option>
            <option value="OVERDUE">Overdue</option>
          </select>
          <input
            type="text"
            placeholder="Search villa or owner..."
            className="border border-gray-300 rounded px-3 py-2 flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="bg-white border border-gray-200 rounded overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Villa</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Advance Credit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResidents.map((r) => {
                const credit = r.advanceCredit ?? 0;
                const remaining = r.amount - (r.paidTowardCycle ?? 0);
                return (
                  <tr key={r.villaId} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium">{r.villaNumber}</td>
                    <td className="px-4 py-3">{r.ownerName}</td>
                    <td className="px-4 py-3">
                      {r.paidTowardCycle != null && r.paidTowardCycle > 0
                        ? `${formatCurrency(r.paidTowardCycle)} / ${formatCurrency(r.amount)}`
                        : formatCurrency(r.amount)}
                    </td>
                    <td className="px-4 py-3">
                      {credit > 0 ? (
                        <button
                          type="button"
                          onClick={() => openCreditModal(r)}
                          disabled={!cycleEditable || loading}
                          className="inline-flex items-center gap-1.5 rounded-full bg-green-100 border border-green-300 px-2.5 py-1 text-xs font-semibold text-green-800 hover:bg-green-200 transition-colors disabled:opacity-40"
                          title="Click to manage this credit"
                        >
                          {formatCurrency(credit)}
                          {r.status !== "PAID" && remaining > 0 && (
                            <span className="text-green-600">- use it</span>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openCreditModal(r)}
                          disabled={!cycleEditable || loading}
                          className="text-gray-400 hover:text-purple-600 text-xs disabled:opacity-40"
                          title="Add advance credit"
                        >
                          + Add
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === "PAID"
                          ? "bg-green-100 text-green-800"
                          : r.status === "OVERDUE"
                            ? "bg-red-100 text-red-800"
                            : r.status === "PARTIAL"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openRowEdit(r)}
                          disabled={!cycleEditable || loading}
                          title={!cycleEditable ? "Only OPEN periods can be edited" : "Edit expected & collected"}
                          className="text-slate-700 hover:text-slate-900 font-medium disabled:opacity-40"
                        >
                          Edit
                        </button>
                        {r.status !== "PAID" && (
                          <button
                            type="button"
                            onClick={() => openMarkPaid(r)}
                            disabled={!cycleEditable || loading}
                            className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-40"
                          >
                            Mark paid
                          </button>
                        )}
                        {r.status === "PAID" && (
                          <span className="text-gray-500 text-xs">Receipt: {r.receiptNumber || "—"}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredResidents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-1">Edit villa row</h2>
            <p className="text-sm text-gray-600 mb-4">
              {rowEdit.villaNumber} — adjust expected maintenance and recorded collected amount (manual correction).
              If collected is more than expected, the extra will carry forward as resident advance credit.
            </p>
            <form onSubmit={submitRowEdit} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Expected (₹)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={rowEdit.expectedStr}
                  onChange={(e) => setRowEdit((s) => (s ? { ...s, expectedStr: e.target.value } : s))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Collected / paid toward cycle (₹)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={rowEdit.paidStr}
                  onChange={(e) => setRowEdit((s) => (s ? { ...s, paidStr: e.target.value } : s))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
                This updates the billing snapshot and resident billing ledger. It does not create or delete payment
                receipt rows; use that only when you need to correct totals already posted. Any collected amount above
                the expected cycle amount will remain as advance credit for this resident.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-900 disabled:opacity-50"
                >
                  Save row
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRowEditModal(false);
                    setRowEdit(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Mark Paid modal ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Mark Payment as Paid</h2>
            <form onSubmit={submitMarkPaid} className="space-y-3">
              {(() => {
                const row = residents.find((r) => r.villaId === paymentForm.villaId);
                const credit = row?.advanceCredit ?? 0;
                return (
                  <>
                    <div className="text-sm text-gray-700">Villa: {paymentForm.villaNumber}</div>
                    {credit > 0 && (
                      <p className="text-xs text-green-800 bg-green-50 border border-green-100 rounded px-2 py-1.5">
                        This villa has {formatCurrency(credit)} advance credit. Close this modal and click
                        the green credit badge to use it instead, or enter cash received below.
                      </p>
                    )}
                    <p className="text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded px-2 py-1.5">
                      You can enter more than this month&apos;s amount. Any extra will automatically become
                      advance credit for future months.
                    </p>
                  </>
                );
              })()}
              <div>
                <label className="block text-sm text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, amount: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Payment date</label>
                <input
                  type="date"
                  required
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, paymentDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Mode</label>
                <select
                  value={paymentForm.paymentMode}
                  onChange={(e) =>
                    setPaymentForm((p) => ({ ...p, paymentMode: e.target.value as PaymentMode }))
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Transaction ID (optional)</label>
                <input
                  type="text"
                  value={paymentForm.transactionId}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, transactionId: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Unified Credit modal ── */}
      {showCreditModal && creditRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md shadow-lg">
            {/* Header with balance */}
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Advance Credit — Villa {creditRow.villaNumber}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">{creditRow.ownerName}</p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-700">
                  {formatCurrency(creditRow.advanceCredit ?? 0)}
                </span>
                <span className="text-sm text-gray-500">available balance</span>
              </div>
            </div>

            {/* Action tabs */}
            <div className="px-5 pt-4">
              <div className="flex rounded-lg bg-gray-100 p-1 gap-1">
                {(creditRow.advanceCredit ?? 0) > 0 && creditRow.status !== "PAID" && (
                  <button
                    type="button"
                    onClick={() => setCreditAction("apply")}
                    className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      creditAction === "apply"
                        ? "bg-white text-green-700 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
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
                      ? "bg-white text-purple-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
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
                        ? "bg-white text-red-700 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
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
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-900">
                    <p className="font-medium mb-1">Use credit to settle this month</p>
                    <p className="text-green-700 text-xs">
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
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">
                    Record advance money received outside the system. This amount will be added to the
                    credit balance and can be used to settle future months.
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Amount to add (₹)</label>
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      required
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Reason</label>
                    <input
                      type="text"
                      required
                      value={creditRemarks}
                      onChange={(e) => setCreditRemarks(e.target.value)}
                      placeholder="e.g. Advance cash received for 3 months"
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                </>
              )}

              {creditAction === "deduct" && (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
                    Remove credit from this villa&apos;s balance. Use this to correct a mistake or reverse
                    an incorrect entry. You cannot deduct more than the available {formatCurrency(creditRow.advanceCredit ?? 0)}.
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Amount to deduct (₹)</label>
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      max={creditRow.advanceCredit ?? 0}
                      required
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder={`Max ${formatCurrency(creditRow.advanceCredit ?? 0)}`}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Reason</label>
                    <input
                      type="text"
                      required
                      value={creditRemarks}
                      onChange={(e) => setCreditRemarks(e.target.value)}
                      placeholder="e.g. Reversing duplicate credit entry"
                      className="w-full border border-gray-300 rounded px-3 py-2"
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
                      ? "bg-green-600 hover:bg-green-700"
                      : creditAction === "add"
                        ? "bg-purple-600 hover:bg-purple-700"
                        : "bg-red-600 hover:bg-red-700"
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
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
