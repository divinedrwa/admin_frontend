"use client";

import { RefreshCcw, Wallet } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { Modal } from "@/components/Modal";
import { showToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { api } from "@/lib/api";
import { parseApiError } from "@/utils/errorHandler";
import { sortByVillaNumber } from "@/utils/villaSort";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  BillingCycleRow,
  FinancialYearOption,
  AuditRow,
  ResidentRow,
  ResidentTotals,
  CycleFormData,
  FyFormData,
} from "./components/types";
import { utcInputValue, utcIsoFromDatetimeLocal } from "./components/types";
import { BillingCycleTab } from "./components/BillingCycleTab";
import { ResidentsTab } from "./components/ResidentsTab";
import { AuditLogTab } from "./components/AuditLogTab";

export default function MaintenanceBillingPage() {
  const [tab, setTab] = useState<"cycles" | "residents" | "audit">("cycles");
  const [cycles, setCycles] = useState<BillingCycleRow[]>([]);
  const [residentCount, setResidentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<false | "reopen" | "cash" | "waive">(false);
  const { confirm, ConfirmUI } = useConfirm();
  const [users, setUsers] = useState<
    Array<{
      id: string;
      name: string;
      maintenanceBillingRole?: "PRIMARY" | "EXCLUDED" | null;
      villa?: { villaNumber: string };
    }>
  >([]);
  const [financialYears, setFinancialYears] = useState<FinancialYearOption[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [creatingCycle, setCreatingCycle] = useState(false);

  const [form, setForm] = useState<CycleFormData>({
    financialYearId: "",
    cycleMonth: "",
    title: "",
    amount: "",
    paymentStart: "",
    paymentEnd: "",
    lateFee: "0",
    graceDays: "5",
  });
  const [fyForm, setFyForm] = useState<FyFormData>({
    label: "",
    startDate: "",
    endDate: "",
  });
  const [fyEditId, setFyEditId] = useState<string | null>(null);

  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("");
  const [residentRows, setResidentRows] = useState<ResidentRow[]>([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [residentOffset, setResidentOffset] = useState(0);
  const [residentPgMeta, setResidentPgMeta] = useState({ total: 0, limit: 50, offset: 0 });
  const [residentTotals, setResidentTotals] = useState<ResidentTotals>({
    totalExpected: 0,
    totalCollected: 0,
    totalShortfall: 0,
    totalAdvanceCredit: 0,
  });

  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);

  const [cashCycleId, setCashCycleId] = useState("");
  const [cashUserId, setCashUserId] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [waiveCycleId, setWaiveCycleId] = useState("");
  const [waiveUserId, setWaiveUserId] = useState("");
  const [reopenId, setReopenId] = useState("");
  const [reopenEnd, setReopenEnd] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BillingCycleRow | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [unpublishingId, setUnpublishingId] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const loadCycles = useCallback(async (signal?: AbortSignal) => {
    const res = await api.get("/v1/admin/cycles", { signal });
    setCycles(res.data.cycles ?? []);
    setResidentCount(res.data.residentCount ?? 0);
  }, []);

  const loadUsers = useCallback(async (signal?: AbortSignal) => {
    const res = await api.get("/users", { params: { role: "RESIDENT", isActive: "true" }, signal });
    const list = (res.data.users ?? []) as Array<{
      id: string;
      name: string;
      maintenanceBillingRole?: "PRIMARY" | "EXCLUDED" | null;
      villa?: { villaNumber: string };
    }>;
    setUsers(sortByVillaNumber(list, (u) => u.villa?.villaNumber ?? null));
  }, []);

  const loadFinancialYears = useCallback(async (signal?: AbortSignal) => {
    const res = await api.get("/v1/admin/financial-years", { signal });
    setFinancialYears(res.data.financialYears ?? []);
  }, []);

  const loadAudit = useCallback(async (signal?: AbortSignal) => {
    const res = await api.get("/v1/admin/audit-logs", { params: { limit: 100 }, signal });
    setAuditRows(res.data.logs ?? []);
  }, []);

  const refreshCoreData = useCallback(async (signal?: AbortSignal) => {
    await Promise.all([loadCycles(signal), loadUsers(signal), loadFinancialYears(signal)]);
    setLastSyncedAt(new Date());
  }, [loadCycles, loadUsers, loadFinancialYears]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    async function boot() {
      try {
        setLoading(true);
        await refreshCoreData(controller.signal);
      } catch (error) {
        if ((error as { name?: string }).name === "CanceledError") return;
        if (!cancelled) showToast("Could not load billing data", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void boot();
    // Auto-refresh every 60 s so admin sees updated payment counts
    // without manual reload after a resident pays.
    pollRef.current = setInterval(() => {
      void refreshCoreData().catch(() => {});
    }, 60_000);
    return () => {
      cancelled = true;
      controller.abort();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refreshCoreData]);

  const monthOptionsForSelectedFinancialYear = useMemo(() => {
    const fy = financialYears.find((x) => x.id === form.financialYearId);
    if (!fy) return [];
    const start = new Date(fy.startDate);
    const end = new Date(fy.endDate);
    const rows: Array<{ value: string; label: string }> = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;
      rows.push({
        value: `${y}-${String(m).padStart(2, "0")}`,
        label: cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return rows;
  }, [financialYears, form.financialYearId]);

  useEffect(() => {
    if (tab !== "audit") return;
    const controller = new AbortController();
    void loadAudit(controller.signal).catch((error) => {
      if ((error as { name?: string }).name === "CanceledError") return;
      showToast("Could not load audit logs", "error");
    });
    return () => controller.abort();
  }, [tab, loadAudit]);

  const loadResidents = useCallback(async (signal?: AbortSignal, offset = residentOffset) => {
    const params: Record<string, string | number> = {
      limit: 50,
      offset,
    };
    if (filterMonth) params.cycleMonth = filterMonth;
    if (filterStatus) params.status = filterStatus;
    if (sortBy) params.sortBy = sortBy;
    setResidentsLoading(true);
    try {
      const r = await api.get("/v1/admin/residents/payments", { params, signal });
      const rows = sortByVillaNumber(
        (r.data.rows ?? []) as ResidentRow[],
        (row) => {
          return typeof row.flat === "string" ? row.flat : null;
        },
      );
      setResidentRows(rows);
      const t = r.data.totals ?? {};
      setResidentTotals({
        totalExpected: Number(t.totalExpected ?? 0),
        totalCollected: Number(t.totalCollected ?? 0),
        totalShortfall: Number(t.totalShortfall ?? 0),
        totalAdvanceCredit: Number(t.totalAdvanceCredit ?? 0),
      });
      setResidentPgMeta({
        total: Number(r.data.total ?? rows.length),
        limit: Number(r.data.limit ?? 50),
        offset: Number(r.data.offset ?? offset),
      });
      setLastSyncedAt(new Date());
    } catch (error) {
      if ((error as { name?: string }).name === "CanceledError") return;
      showToast("Could not load residents", "error");
    } finally {
      setResidentsLoading(false);
    }
  }, [filterMonth, filterStatus, sortBy, residentOffset]);

  useEffect(() => {
    setResidentOffset(0);
  }, [filterMonth, filterStatus, sortBy]);

  useEffect(() => {
    if (tab !== "residents") return;
    const controller = new AbortController();
    void loadResidents(controller.signal, residentOffset);
    return () => controller.abort();
  }, [tab, loadResidents, residentOffset]);

  const cycleOptions = useMemo(() => cycles.map((c) => ({ id: c.id, label: `${c.cycleKey} · ${c.title}` })), [cycles]);

  const primaryMaintenanceUsers = useMemo(
    () => users.filter((u) => u.maintenanceBillingRole !== "EXCLUDED"),
    [users],
  );

  async function handleCreateCycle(e: React.FormEvent) {
    e.preventDefault();
    if (creatingCycle) return;
    try {
      setCreatingCycle(true);
      const paymentStartDate = utcIsoFromDatetimeLocal(form.paymentStart);
      const paymentEndDate = utcIsoFromDatetimeLocal(form.paymentEnd);
      if (!paymentStartDate || !paymentEndDate) {
        showToast("Payment start and end dates are required", "error");
        return;
      }
      await api.post("/v1/admin/cycles", {
        financialYearId: form.financialYearId,
        cycleMonth: form.cycleMonth,
        title: form.title || `Maintenance ${form.cycleMonth}`,
        amount: Number(form.amount),
        paymentStartDate,
        paymentEndDate,
        lateFee: Number(form.lateFee || 0),
        gracePeriodDays: Number(form.graceDays || 0),
      });
      showToast("Billing cycle created successfully", "success");
      setCreateOpen(false);
      setForm({
        financialYearId: form.financialYearId,
        cycleMonth: "",
        title: "",
        amount: "",
        paymentStart: "",
        paymentEnd: "",
        lateFee: "0",
        graceDays: "5",
      });
      try {
        await Promise.all([loadCycles(), loadFinancialYears()]);
      } catch {
        // Fall back to hard refresh if list refresh fails after successful create.
        window.location.reload();
      }
    } catch (err: unknown) {
      showToast(parseApiError(err, "Create failed").message, "error");
    } finally {
      setCreatingCycle(false);
    }
  }

  async function handleCreateFinancialYear(e: React.FormEvent) {
    e.preventDefault();
    if (!fyForm.label || !fyForm.startDate || !fyForm.endDate) {
      showToast("Fill all financial year fields", "error");
      return;
    }
    try {
      await api.post("/v1/admin/financial-years", {
        label: fyForm.label,
        startDate: new Date(fyForm.startDate).toISOString(),
        endDate: new Date(fyForm.endDate).toISOString(),
      });
      showToast("Financial year created", "success");
      setFyForm({ label: "", startDate: "", endDate: "" });
      await loadFinancialYears();
    } catch (err: unknown) {
      showToast(parseApiError(err, "Could not create financial year").message, "error");
    }
  }

  function openFinancialYearEdit(row: FinancialYearOption) {
    setFyEditId(row.id);
    setFyForm({
      label: row.label,
      startDate: row.startDate.slice(0, 10),
      endDate: row.endDate.slice(0, 10),
    });
  }

  async function handleUpdateFinancialYear(e: React.FormEvent) {
    e.preventDefault();
    if (!fyEditId) return;
    if (!fyForm.label || !fyForm.startDate || !fyForm.endDate) {
      showToast("Fill all financial year fields", "error");
      return;
    }
    try {
      await api.put(`/v1/admin/financial-years/${fyEditId}`, {
        label: fyForm.label,
        startDate: new Date(fyForm.startDate).toISOString(),
        endDate: new Date(fyForm.endDate).toISOString(),
      });
      showToast("Financial year updated", "success");
      setFyEditId(null);
      setFyForm({ label: "", startDate: "", endDate: "" });
      await loadFinancialYears();
    } catch (err: unknown) {
      showToast(parseApiError(err, "Could not update financial year").message, "error");
    }
  }

  async function deleteFinancialYear(row: FinancialYearOption) {
    const yes = await confirm({ title: "Delete financial year", message: `Delete financial year ${row.label}?`, confirmLabel: "Delete" });
    if (!yes) return;
    try {
      await api.delete(`/v1/admin/financial-years/${row.id}`);
      showToast("Financial year deleted", "success");
      if (fyEditId === row.id) {
        setFyEditId(null);
        setFyForm({ label: "", startDate: "", endDate: "" });
      }
      await loadFinancialYears();
    } catch (err: unknown) {
      showToast(parseApiError(err, "Could not delete financial year").message, "error");
    }
  }

  async function deleteCycle(cycle: BillingCycleRow) {
    try {
      await api.delete(`/v1/admin/cycles/${cycle.id}`);
      showToast("Billing cycle deleted", "success");
      await loadCycles();
      setDeleteTarget(null);
    } catch (err: unknown) {
      showToast(parseApiError(err, "Could not delete cycle").message, "error");
    }
  }

  async function handlePublish(cycleId: string) {
    const yes = await confirm({
      title: "Publish billing cycle",
      message: "This will notify all residents. Continue?",
      confirmLabel: "Publish",
    });
    if (!yes) return;
    setPublishingId(cycleId);
    try {
      await api.post(`/v1/admin/cycles/${cycleId}/publish`);
      showToast("Cycle published — residents notified", "success");
      await loadCycles();
    } catch (err: unknown) {
      showToast(parseApiError(err, "Publish failed").message, "error");
    } finally {
      setPublishingId(null);
    }
  }

  async function handleUnpublish(cycleId: string) {
    const yes = await confirm({
      title: "Unpublish billing cycle",
      message:
        "Residents will no longer see this cycle or be able to pay until you publish again. Continue?",
      confirmLabel: "Unpublish",
    });
    if (!yes) return;
    setUnpublishingId(cycleId);
    try {
      await api.post(`/v1/admin/cycles/${cycleId}/unpublish`);
      showToast("Cycle unpublished — hidden from residents", "success");
      await loadCycles();
    } catch (err: unknown) {
      showToast(parseApiError(err, "Unpublish failed").message, "error");
    } finally {
      setUnpublishingId(null);
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    try {
      const paymentStartDate = utcIsoFromDatetimeLocal(form.paymentStart);
      const paymentEndDate = utcIsoFromDatetimeLocal(form.paymentEnd);
      await api.put(`/v1/admin/cycles/${editId}`, {
        title: form.title,
        amount: Number(form.amount),
        paymentStartDate,
        paymentEndDate,
        lateFee: Number(form.lateFee || 0),
        gracePeriodDays: Number(form.graceDays || 0),
      });
      showToast("Cycle updated", "success");
      setEditId(null);
      await loadCycles();
    } catch (err: unknown) {
      showToast(parseApiError(err, "Update failed").message, "error");
    }
  }

  function openEdit(c: BillingCycleRow) {
    setCreateOpen(false); // Ensure create form is closed when editing
    setEditId(c.id);
    setForm({
      financialYearId: c.financialYearId ?? "",
      cycleMonth: c.cycleKey,
      title: c.title,
      amount: String(c.amount),
      paymentStart: utcInputValue(new Date(c.paymentStartDate)),
      paymentEnd: utcInputValue(new Date(c.paymentEndDate)),
      lateFee: String(c.lateFee),
      graceDays: String(c.gracePeriodDays),
    });
  }

  async function doReopen() {
    if (!reopenId || !reopenEnd) {
      showToast("Select cycle and new end date", "error");
      return;
    }
    setActionBusy("reopen");
    try {
      await api.post(`/v1/admin/cycles/${reopenId}/reopen`, {
        paymentEndDate: utcIsoFromDatetimeLocal(reopenEnd),
      });
      showToast("Cycle updated (reopen)", "success");
      setReopenId("");
      setReopenEnd("");
      await loadCycles();
    } catch (err: unknown) {
      showToast(parseApiError(err, "Reopen failed").message, "error");
    } finally {
      setActionBusy(false);
    }
  }

  async function doCash() {
    if (!cashCycleId || !cashUserId || !cashAmount) {
      showToast("Fill cash payment fields", "error");
      return;
    }
    setActionBusy("cash");
    try {
      await api.post("/v1/admin/payments/mark-cash", {
        userId: cashUserId,
        cycleId: cashCycleId,
        amountPaid: Number(cashAmount),
      });
      try {
        await api.post(
          `/maintenance-management/collection/billing-cycles/${cashCycleId}/sync`,
        );
      } catch {
        // Collection cycle may not exist yet; mark-cash still updated billing ledger.
      }
      showToast("Cash payment recorded", "success");
      setCashCycleId("");
      setCashUserId("");
      setCashAmount("");
      await Promise.all([loadCycles(), tab === "residents" ? loadResidents() : Promise.resolve()]);
    } catch (err: unknown) {
      showToast(parseApiError(err, "Could not save").message, "error");
    } finally {
      setActionBusy(false);
    }
  }

  async function doWaive() {
    if (!waiveCycleId || !waiveUserId) {
      showToast("Select cycle and resident", "error");
      return;
    }
    setActionBusy("waive");
    try {
      await api.post("/v1/admin/cycles/waive-late-fee", {
        cycleId: waiveCycleId,
        userId: waiveUserId,
      });
      showToast("Late fee waived", "success");
      setWaiveCycleId("");
      setWaiveUserId("");
      await Promise.all([loadCycles(), tab === "residents" ? loadResidents() : Promise.resolve()]);
    } catch (err: unknown) {
      showToast(parseApiError(err, "Could not waive").message, "error");
    } finally {
      setActionBusy(false);
    }
  }

  function statusBadge(status: string) {
    const badgeClass =
      status === "ACTIVE" ? "badge-success" :
      status === "DRAFT" ? "badge-warning" :
      "badge-gray";
    return (
      <span className={`badge ${badgeClass}`}>
        {status}
      </span>
    );
  }

  function handleOpenCreate() {
    const now = new Date();
    setForm({
      financialYearId: financialYears[0]?.id ?? "",
      cycleMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      title: "",
      amount: "",
      paymentStart: utcInputValue(now),
      paymentEnd: utcInputValue(now),
      lateFee: "0",
      graceDays: "5",
    });
    setEditId(null); // Ensure edit form is closed when creating
    setCreateOpen(true);
  }

  return (
    <AppShell title="Maintenance billing cycles">
      <div className="max-w-7xl mx-auto space-y-6">
        <AdminPageHeader
          eyebrow="Collections control"
          title="Maintenance billing cycles"
          description="Create financial years, run monthly billing cycles, review resident payment status, and inspect audit activity from one operational workflow."
          icon={<Wallet className="h-6 w-6" />}
          actions={
            <div className="flex flex-wrap items-center justify-end gap-3 text-left sm:text-right">
              <div className="text-sm text-fg-secondary">
                Active residents: <strong className="ml-1 text-fg-primary">{residentCount}</strong>
              </div>
              <div className="text-xs text-fg-secondary">
                Last synced: {lastSyncedAt ? lastSyncedAt.toLocaleString("en-IN") : "Not synced yet"}
              </div>
              <button
                type="button"
                onClick={() => void refreshCoreData().catch(() => showToast("Could not refresh billing data", "error"))}
                className="btn btn-ghost flex items-center gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          }
        />

        <div className="tabs pb-4">
          {(["cycles", "residents", "audit"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={tab === t ? "tab tab-active" : "tab tab-inactive"}
            >
              {t === "cycles" ? "Cycles" : t === "residents" ? "Residents" : "Audit log"}
            </button>
          ))}
        </div>

        {loading && tab === "cycles" ? (
          <div className="loading-state">
            <div className="loading-spinner w-10 h-10"></div>
            <p className="loading-state-text">Loading…</p>
          </div>
        ) : null}

        {tab === "cycles" && (
          <BillingCycleTab
            financialYears={financialYears}
            fyForm={fyForm}
            setFyForm={setFyForm}
            fyEditId={fyEditId}
            setFyEditId={setFyEditId}
            onCreateFinancialYear={handleCreateFinancialYear}
            onUpdateFinancialYear={handleUpdateFinancialYear}
            onEditFinancialYear={openFinancialYearEdit}
            onDeleteFinancialYear={(row) => void deleteFinancialYear(row)}
            createOpen={createOpen}
            setCreateOpen={setCreateOpen}
            editId={editId}
            setEditId={setEditId}
            form={form}
            setForm={setForm}
            monthOptionsForSelectedFinancialYear={monthOptionsForSelectedFinancialYear}
            creatingCycle={creatingCycle}
            cycles={cycles}
            onCreateCycle={handleCreateCycle}
            onSubmitEdit={submitEdit}
            onOpenEdit={openEdit}
            onDeleteTarget={setDeleteTarget}
            statusBadge={statusBadge}
            onOpenCreate={handleOpenCreate}
            onPublish={handlePublish}
            publishingId={publishingId}
            onUnpublish={handleUnpublish}
            unpublishingId={unpublishingId}
            cycleOptions={cycleOptions}
            primaryMaintenanceUsers={primaryMaintenanceUsers}
            reopenId={reopenId}
            setReopenId={setReopenId}
            reopenEnd={reopenEnd}
            setReopenEnd={setReopenEnd}
            cashCycleId={cashCycleId}
            setCashCycleId={setCashCycleId}
            cashUserId={cashUserId}
            setCashUserId={setCashUserId}
            cashAmount={cashAmount}
            setCashAmount={setCashAmount}
            waiveCycleId={waiveCycleId}
            setWaiveCycleId={setWaiveCycleId}
            waiveUserId={waiveUserId}
            setWaiveUserId={setWaiveUserId}
            actionBusy={actionBusy}
            onReopen={() => void doReopen()}
            onCash={() => void doCash()}
            onWaive={() => void doWaive()}
          />
        )}

        {tab === "residents" && (
          <ResidentsTab
            residentTotals={residentTotals}
            filterMonth={filterMonth}
            setFilterMonth={setFilterMonth}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            sortBy={sortBy}
            setSortBy={setSortBy}
            cycles={cycles}
            residentsLoading={residentsLoading}
            residentRows={residentRows}
            residentPgMeta={residentPgMeta}
            onResidentPageChange={(offset) => setResidentOffset(offset)}
          />
        )}

        {tab === "audit" && (
          <AuditLogTab auditRows={auditRows} />
        )}
      </div>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-fg-primary">Delete billing cycle?</h3>
          </div>
          <div className="card-body">
            <p className="mt-2 text-sm text-fg-secondary">
              You are about to delete{" "}
              <span className="font-medium text-fg-primary">
                {deleteTarget?.cycleKey}
              </span>
              {deleteTarget?.title ? ` (${deleteTarget.title})` : ""}.
            </p>
            <p className="mt-1 text-xs text-fg-secondary">
              This works only when no payments exist for the cycle.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost text-sm"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger text-sm"
                onClick={() => { if (deleteTarget) void deleteCycle(deleteTarget); }}
              >
                Delete cycle
              </button>
            </div>
          </div>
        </div>
      </Modal>
      {ConfirmUI}
    </AppShell>
  );
}
