"use client";

import { AppShell } from "@/components/AppShell";
import { showToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { useCallback, useEffect, useMemo, useState } from "react";

type BillingCycleRow = {
  id: string;
  cycleKey: string;
  month?: string;
  title: string;
  amount: number;
  status: string;
  storedStatus?: string;
  paymentWindow: string;
  paymentStartDate: string;
  paymentEndDate: string;
  paidUsersCount: number;
  pendingUsersCount: number;
  lateFee: number;
  gracePeriodDays: number;
  financialYearId?: string | null;
  financialYearLabel?: string | null;
};

type FinancialYearOption = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: string;
};

type AuditRow = {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
};

type ResidentRow = Record<string, unknown>;
type ResidentTotals = {
  totalExpected: number;
  totalCollected: number;
  totalShortfall: number;
  totalAdvanceCredit: number;
};

function utcInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const fmtInr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

function fmtDateOnly(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN");
}

function paymentDeltaStyles(delta: number) {
  if (delta > 0) return "text-approved-fg font-semibold";
  if (delta < 0) return "text-denied-fg font-semibold";
  return "text-slate-700 font-semibold";
}

function statusBadgeStyles(status: string) {
  if (status === "CREDIT") return "bg-approved-bg text-approved-fg border-approved-bg";
  if (status === "DUE") return "bg-denied-bg text-denied-fg border-denied-bg";
  if (status === "SETTLED") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-surface-elevated text-fg-primary border-surface-border";
}

export default function MaintenanceBillingPage() {
  const [tab, setTab] = useState<"cycles" | "residents" | "audit">("cycles");
  const [cycles, setCycles] = useState<BillingCycleRow[]>([]);
  const [residentCount, setResidentCount] = useState(0);
  const [loading, setLoading] = useState(true);
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

  const [form, setForm] = useState({
    financialYearId: "",
    cycleMonth: "",
    title: "",
    amount: "",
    paymentStart: "",
    paymentEnd: "",
    lateFee: "0",
    graceDays: "5",
  });
  const [fyForm, setFyForm] = useState({
    label: "",
    startDate: "",
    endDate: "",
  });
  const [fyEditId, setFyEditId] = useState<string | null>(null);

  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("");
  const [residentRows, setResidentRows] = useState<ResidentRow[]>([]);
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
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const loadCycles = useCallback(async () => {
    const res = await api.get("/v1/admin/cycles");
    setCycles(res.data.cycles ?? []);
    setResidentCount(res.data.residentCount ?? 0);
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await api.get("/users", { params: { role: "RESIDENT", isActive: "true" } });
    setUsers(res.data.users ?? []);
  }, []);

  const loadFinancialYears = useCallback(async () => {
    const res = await api.get("/v1/admin/financial-years");
    setFinancialYears(res.data.financialYears ?? []);
  }, []);

  const loadAudit = useCallback(async () => {
    const res = await api.get("/v1/admin/audit-logs", { params: { limit: 100 } });
    setAuditRows(res.data.logs ?? []);
  }, []);

  const refreshCoreData = useCallback(async () => {
    await Promise.all([loadCycles(), loadUsers(), loadFinancialYears()]);
    setLastSyncedAt(new Date());
  }, [loadCycles, loadUsers, loadFinancialYears]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        setLoading(true);
        await refreshCoreData();
      } catch {
        if (!cancelled) showToast("Could not load billing data", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
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
    void loadAudit().catch(() => showToast("Could not load audit logs", "error"));
  }, [tab, loadAudit]);

  useEffect(() => {
    if (tab !== "residents") return;
    const params: Record<string, string> = {};
    if (filterMonth) params.cycleMonth = filterMonth;
    if (filterStatus) params.status = filterStatus;
    if (sortBy) params.sortBy = sortBy;
    void api
      .get("/v1/admin/residents/payments", { params })
      .then((r) => {
        setResidentRows(r.data.rows ?? []);
        const t = r.data.totals ?? {};
        setResidentTotals({
          totalExpected: Number(t.totalExpected ?? 0),
          totalCollected: Number(t.totalCollected ?? 0),
          totalShortfall: Number(t.totalShortfall ?? 0),
          totalAdvanceCredit: Number(t.totalAdvanceCredit ?? 0),
        });
        setLastSyncedAt(new Date());
      })
      .catch(() => showToast("Could not load residents", "error"));
  }, [tab, filterMonth, filterStatus, sortBy]);

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
      const paymentStartDate = new Date(form.paymentStart).toISOString();
      const paymentEndDate = new Date(form.paymentEnd).toISOString();
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
      setForm((prev) => ({
        ...prev,
        cycleMonth: "",
        title: "",
        amount: "",
      }));
      try {
        await Promise.all([loadCycles(), loadFinancialYears()]);
      } catch {
        // Fall back to hard refresh if list refresh fails after successful create.
        window.location.reload();
      }
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err ? (err as any).response?.data?.message : null;
      showToast(msg ?? "Create failed", "error");
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
      await api.post("/maintenance-management/collection/financial-years", {
        label: fyForm.label,
        startDate: new Date(fyForm.startDate).toISOString(),
        endDate: new Date(fyForm.endDate).toISOString(),
      });
      showToast("Financial year created", "success");
      setFyForm({ label: "", startDate: "", endDate: "" });
      await loadFinancialYears();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as any).response?.data?.message
          : null;
      showToast(msg ?? "Could not create financial year", "error");
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
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as any).response?.data?.message
          : null;
      showToast(msg ?? "Could not update financial year", "error");
    }
  }

  async function deleteFinancialYear(row: FinancialYearOption) {
    const yes = window.confirm(`Delete financial year ${row.label}?`);
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
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as any).response?.data?.message
          : null;
      showToast(msg ?? "Could not delete financial year", "error");
    }
  }

  async function deleteCycle(cycle: BillingCycleRow) {
    try {
      await api.delete(`/v1/admin/cycles/${cycle.id}`);
      showToast("Billing cycle deleted", "success");
      await loadCycles();
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as any).response?.data?.message
          : null;
      showToast(msg ?? "Could not delete cycle", "error");
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    try {
      const paymentStartDate = form.paymentStart ? new Date(form.paymentStart).toISOString() : undefined;
      const paymentEndDate = form.paymentEnd ? new Date(form.paymentEnd).toISOString() : undefined;
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
      const msg = err && typeof err === "object" && "response" in err ? (err as any).response?.data?.message : null;
      showToast(msg ?? "Update failed", "error");
    }
  }

  function openEdit(c: BillingCycleRow) {
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
    try {
      await api.post(`/v1/admin/cycles/${reopenId}/reopen`, {
        paymentEndDate: new Date(reopenEnd).toISOString(),
      });
      showToast("Cycle updated (reopen)", "success");
      await loadCycles();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err ? (err as any).response?.data?.message : null;
      showToast(msg ?? "Reopen failed", "error");
    }
  }

  async function doCash() {
    if (!cashCycleId || !cashUserId || !cashAmount) {
      showToast("Fill cash payment fields", "error");
      return;
    }
    try {
      await api.post("/v1/admin/payments/mark-cash", {
        userId: cashUserId,
        cycleId: cashCycleId,
        amountPaid: Number(cashAmount),
      });
      showToast("Cash payment recorded", "success");
      await loadCycles();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err ? (err as any).response?.data?.message : null;
      showToast(msg ?? "Could not save", "error");
    }
  }

  async function doWaive() {
    if (!waiveCycleId || !waiveUserId) {
      showToast("Select cycle and resident", "error");
      return;
    }
    try {
      await api.post("/v1/admin/cycles/waive-late-fee", {
        cycleId: waiveCycleId,
        userId: waiveUserId,
      });
      showToast("Late fee waived", "success");
      await loadCycles();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err ? (err as any).response?.data?.message : null;
      showToast(msg ?? "Could not waive", "error");
    }
  }

  function statusBadge(status: string) {
    const badgeClass =
      status === "OPEN" ? "badge-success" :
      status === "UPCOMING" ? "badge-warning" :
      "badge-gray";
    return (
      <span className={`badge ${badgeClass}`}>
        {status}
      </span>
    );
  }

  return (
    <AppShell title="Maintenance billing cycles">
      <div className="max-w-7xl mx-auto space-y-6">
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
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-fg-secondary flex items-center">
              Active residents: <strong className="ml-1">{residentCount}</strong>
            </span>
            <span className="text-xs text-fg-secondary">
              Last synced: {lastSyncedAt ? lastSyncedAt.toLocaleString("en-IN") : "Not synced yet"}
            </span>
            <button
              type="button"
              onClick={() =>
                void refreshCoreData().catch(() => showToast("Could not refresh billing data", "error"))
              }
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface text-fg-primary border border-surface-border hover:bg-surface-background"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading && tab === "cycles" ? (
          <div className="loading-state">
            <div className="loading-spinner w-10 h-10"></div>
            <p className="loading-state-text">Loading…</p>
          </div>
        ) : null}

        {tab === "cycles" && (
          <>
            <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-fg-primary">
                {fyEditId ? "Edit financial year" : "Create financial year"}
              </h2>
            </div>
            <form
              onSubmit={fyEditId ? handleUpdateFinancialYear : handleCreateFinancialYear}
              className="card-body grid gap-4 md:grid-cols-4"
            >
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-fg-secondary">Label</span>
                <input
                  className="input border rounded-lg px-3 py-2"
                  placeholder="2026-27"
                  value={fyForm.label}
                  onChange={(e) => setFyForm((s) => ({ ...s, label: e.target.value }))}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-fg-secondary">Start date</span>
                <input
                  type="date"
                  className="input border rounded-lg px-3 py-2"
                  value={fyForm.startDate}
                  onChange={(e) => setFyForm((s) => ({ ...s, startDate: e.target.value }))}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-fg-secondary">End date</span>
                <input
                  type="date"
                  className="input border rounded-lg px-3 py-2"
                  value={fyForm.endDate}
                  onChange={(e) => setFyForm((s) => ({ ...s, endDate: e.target.value }))}
                  required
                />
              </label>
              <div className="flex items-end">
                <div className="w-full flex gap-2">
                  <button type="submit" className="btn btn-primary flex-1 text-sm">
                    {fyEditId ? "Update financial year" : "Create financial year"}
                  </button>
                  {fyEditId && (
                    <button
                      type="button"
                      className="btn btn-ghost text-sm"
                      onClick={() => {
                        setFyEditId(null);
                        setFyForm({ label: "", startDate: "", endDate: "" });
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>
            </div>

            <div className="table-wrapper">
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th className="table-th">Label</th>
                    <th className="table-th">Start</th>
                    <th className="table-th">End</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {financialYears.map((fy) => (
                    <tr key={fy.id} className="table-row">
                      <td className="table-td font-medium text-fg-primary">{fy.label}</td>
                      <td className="table-td">{fmtDateOnly(fy.startDate)}</td>
                      <td className="table-td">{fmtDateOnly(fy.endDate)}</td>
                      <td className="table-td">{fy.status}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-brand-primary text-xs font-semibold hover:underline"
                            onClick={() => openFinancialYearEdit(fy)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-brand-danger text-xs font-semibold hover:underline"
                            onClick={() => void deleteFinancialYear(fy)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {financialYears.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-fg-secondary">
                        No financial years created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                className="btn btn-primary text-sm"
                onClick={() => {
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
                  setCreateOpen(true);
                }}
              >
                Create cycle
              </button>
            </div>

            {createOpen && (
              <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-fg-primary">New billing cycle</h2>
              </div>
              <form
                onSubmit={handleCreateCycle}
                className="card-body grid gap-4 md:grid-cols-2"
              >
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-fg-secondary">Financial year</span>
                  <select
                    className="input border rounded-lg px-3 py-2 bg-surface"
                    required
                    value={form.financialYearId}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        financialYearId: e.target.value,
                        cycleMonth: "",
                      }))
                    }
                  >
                    <option value="">Select financial year…</option>
                    {financialYears.map((fy) => (
                      <option key={fy.id} value={fy.id}>
                        {fy.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-fg-secondary">Month</span>
                  <select
                    className="input border rounded-lg px-3 py-2 bg-surface"
                    required
                    value={form.cycleMonth}
                    onChange={(e) => setForm((s) => ({ ...s, cycleMonth: e.target.value }))}
                    disabled={!form.financialYearId}
                  >
                    <option value="">Select month…</option>
                    {monthOptionsForSelectedFinancialYear.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-fg-secondary">Title</span>
                  <input
                    className="input border rounded-lg px-3 py-2"
                    value={form.title}
                    onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                    placeholder={`Maintenance ${form.cycleMonth}`}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm md:col-span-2">
                  <span className="text-fg-secondary">Amount (₹)</span>
                  <input
                    className="input border rounded-lg px-3 py-2"
                    required
                    type="number"
                    min={1}
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-fg-secondary">Payment start (local → ISO)</span>
                  <input
                    className="input border rounded-lg px-3 py-2"
                    required
                    type="datetime-local"
                    value={form.paymentStart}
                    onChange={(e) => setForm((s) => ({ ...s, paymentStart: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-fg-secondary">Payment end (deadline inclusive)</span>
                  <input
                    className="input border rounded-lg px-3 py-2"
                    required
                    type="datetime-local"
                    value={form.paymentEnd}
                    onChange={(e) => setForm((s) => ({ ...s, paymentEnd: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-fg-secondary">Late fee (₹)</span>
                  <input
                    className="input border rounded-lg px-3 py-2"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.lateFee}
                    onChange={(e) => setForm((s) => ({ ...s, lateFee: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-fg-secondary">Grace period (days)</span>
                  <input
                    className="input border rounded-lg px-3 py-2"
                    type="number"
                    min={0}
                    value={form.graceDays}
                    onChange={(e) => setForm((s) => ({ ...s, graceDays: e.target.value }))}
                  />
                </label>
                <div className="md:col-span-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={creatingCycle}
                    className="btn btn-primary disabled:opacity-60"
                  >
                    {creatingCycle ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
              </div>
            )}

            <div className="table-wrapper">
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th className="table-th">Month</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Window (UTC ISO)</th>
                    <th className="table-th">Paid</th>
                    <th className="table-th">Pending</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody>
                  {cycles.map((c) => (
                    <tr key={c.id} className="table-row">
                      <td className="table-td font-medium text-fg-primary">
                        <div>{c.cycleKey}</div>
                        <div className="text-fg-secondary text-xs">
                          {c.title}
                          {c.financialYearLabel ? ` · ${c.financialYearLabel}` : ""}
                        </div>
                      </td>
                      <td className="table-td">{c.amount}</td>
                      <td className="table-td">{statusBadge(c.status)}</td>
                      <td className="table-td max-w-[280px] text-xs text-fg-secondary truncate" title={c.paymentWindow}>
                        {c.paymentStartDate.slice(0, 19)} → {c.paymentEndDate.slice(0, 19)}
                      </td>
                      <td className="table-td">{c.paidUsersCount}</td>
                      <td className="table-td">{c.pendingUsersCount}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-brand-primary text-xs font-semibold hover:underline"
                            onClick={() => openEdit(c)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-brand-danger text-xs font-semibold hover:underline"
                            onClick={() => setDeleteTarget(c)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {cycles.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-fg-secondary">
                        No billing cycles yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {editId && (
              <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-fg-primary">Edit cycle</h2>
              </div>
              <form
                onSubmit={submitEdit}
                className="card-body grid gap-4 md:grid-cols-2"
              >
                <label className="flex flex-col gap-1 text-sm md:col-span-2">
                  <span className="text-fg-secondary">Title</span>
                  <input
                    className="input border rounded-lg px-3 py-2"
                    required
                    value={form.title}
                    onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-fg-secondary">Amount</span>
                  <input
                    className="input border rounded-lg px-3 py-2"
                    required
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-fg-secondary">Late fee</span>
                  <input
                    className="input border rounded-lg px-3 py-2"
                    type="number"
                    value={form.lateFee}
                    onChange={(e) => setForm((s) => ({ ...s, lateFee: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-fg-secondary">Payment start</span>
                  <input
                    className="input border rounded-lg px-3 py-2"
                    type="datetime-local"
                    value={form.paymentStart}
                    onChange={(e) => setForm((s) => ({ ...s, paymentStart: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-fg-secondary">Payment end</span>
                  <input
                    className="input border rounded-lg px-3 py-2"
                    type="datetime-local"
                    value={form.paymentEnd}
                    onChange={(e) => setForm((s) => ({ ...s, paymentEnd: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-fg-secondary">Grace days</span>
                  <input
                    className="input border rounded-lg px-3 py-2"
                    type="number"
                    value={form.graceDays}
                    onChange={(e) => setForm((s) => ({ ...s, graceDays: e.target.value }))}
                  />
                </label>
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" className="btn btn-primary">
                    Save changes
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditId(null)}>
                    Cancel
                  </button>
                </div>
              </form>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
              <div className="card">
                <div className="card-header"><h3 className="font-semibold text-fg-primary">Reopen cycle</h3></div>
                <div className="card-body space-y-3">
                <p className="text-xs text-fg-secondary">Extends payment end into the future; status is recomputed on the server (UTC).</p>
                <select
                  className="input w-full text-sm"
                  value={reopenId}
                  onChange={(e) => setReopenId(e.target.value)}
                >
                  <option value="">Select cycle…</option>
                  {cycleOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  className="input w-full text-sm"
                  value={reopenEnd}
                  onChange={(e) => setReopenEnd(e.target.value)}
                />
                <button type="button" className="btn btn-primary w-full text-sm" onClick={() => void doReopen()}>
                  Apply
                </button>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h3 className="font-semibold text-fg-primary">Mark cash paid</h3></div>
                <div className="card-body space-y-3">
                <select className="input w-full text-sm" value={cashCycleId} onChange={(e) => setCashCycleId(e.target.value)}>
                  <option value="">Cycle…</option>
                  {cycleOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                <select className="input w-full text-sm" value={cashUserId} onChange={(e) => setCashUserId(e.target.value)}>
                  <option value="">Resident (primary billing)…</option>
                  {primaryMaintenanceUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} · {u.villa?.villaNumber ?? "?"}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Amount"
                  className="input w-full text-sm"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                />
                <button type="button" className="btn btn-success w-full text-sm" onClick={() => void doCash()}>
                  Record cash
                </button>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h3 className="font-semibold text-fg-primary">Waive late fee</h3></div>
                <div className="card-body space-y-3">
                <select className="input w-full text-sm" value={waiveCycleId} onChange={(e) => setWaiveCycleId(e.target.value)}>
                  <option value="">Cycle…</option>
                  {cycleOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                <select className="input w-full text-sm" value={waiveUserId} onChange={(e) => setWaiveUserId(e.target.value)}>
                  <option value="">Resident (primary billing)…</option>
                  {primaryMaintenanceUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <button type="button" className="btn btn-primary w-full text-sm bg-pending-solid hover:bg-pending-solid hover:opacity-90" onClick={() => void doWaive()}>
                  Waive
                </button>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "residents" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="stat-card">
                <div className="stat-card-label">Total expected</div>
                <div className="stat-card-value text-base text-fg-primary">{fmtInr(residentTotals.totalExpected)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Total collected</div>
                <div className="stat-card-value text-base text-approved-fg">{fmtInr(residentTotals.totalCollected)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Total shortfall</div>
                <div className="stat-card-value text-base text-denied-fg">{fmtInr(residentTotals.totalShortfall)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Total advance credit</div>
                <div className="stat-card-value text-base text-approved-fg">{fmtInr(residentTotals.totalAdvanceCredit)}</div>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <select
                className="input border rounded-lg px-3 py-2 text-sm bg-surface"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                <option value="">All months</option>
                {cycles.map((c) => (
                  <option key={c.cycleKey} value={c.cycleKey}>
                    {c.cycleKey}
                  </option>
                ))}
              </select>
              <select
                className="input border rounded-lg px-3 py-2 text-sm bg-surface"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
                <option value="CREDIT">Credit</option>
                <option value="DUE">Due</option>
                <option value="SETTLED">Settled</option>
              </select>
              <select
                className="input border rounded-lg px-3 py-2 text-sm bg-surface"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="">Default sort</option>
                <option value="highest_due">Highest due first</option>
                <option value="highest_credit">Highest credit first</option>
              </select>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th className="table-th">Resident</th>
                    <th className="table-th">Unit</th>
                    <th className="table-th">Cycle</th>
                    <th className="table-th">Pay status</th>
                    <th className="table-th">Expected</th>
                    <th className="table-th">Cash paid</th>
                    <th className="table-th">Effective paid</th>
                    <th className="table-th">Delta</th>
                    <th className="table-th">Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {residentRows.map((r, idx) => (
                    <tr key={idx} className="table-row">
                      {(() => {
                        const delta = Number(r.deltaAmount ?? 0);
                        const status = String(r.statusBadge ?? "");
                        return (
                          <>
                      <td className="table-td">{String(r.name ?? "")}</td>
                      <td className="table-td">{String(r.flat ?? "")}</td>
                      <td className="table-td">{String(r.cycleKey ?? "")}</td>
                      <td className="table-td">{String(r.paymentStatus ?? "")}</td>
                      <td className="table-td">{fmtInr(Number(r.expectedAmount ?? 0))}</td>
                      <td className="table-td">{fmtInr(Number(r.cashPaidAmount ?? 0))}</td>
                      <td className="table-td">{fmtInr(Number(r.effectivePaidAmount ?? r.paidAmount ?? 0))}</td>
                      <td className={`table-td ${paymentDeltaStyles(delta)}`}>{fmtInr(delta)}</td>
                      <td className="table-td">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${statusBadgeStyles(status)}`}>
                          {status || "—"}
                        </span>
                      </td>
                          </>
                        );
                      })()}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "audit" && (
          <div className="table-wrapper">
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th className="table-th">When (UTC)</th>
                  <th className="table-th">Action</th>
                  <th className="table-th">Entity</th>
                  <th className="table-th">Meta</th>
                </tr>
              </thead>
              <tbody>
                {auditRows.map((a) => (
                  <tr key={a.id} className="table-row">
                    <td className="table-td whitespace-nowrap text-xs">{new Date(a.createdAt).toISOString()}</td>
                    <td className="table-td font-mono text-xs">{a.action}</td>
                    <td className="table-td text-xs">
                      {a.entityType} {a.entityId ? `(${a.entityId.slice(0, 8)}…)` : ""}
                    </td>
                    <td className="table-td text-xs max-w-md truncate" title={JSON.stringify(a.metadata)}>
                      {JSON.stringify(a.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="card w-full max-w-md">
            <div className="card-header">
              <h3 className="text-base font-semibold text-fg-primary">Delete billing cycle?</h3>
            </div>
            <div className="card-body">
            <p className="mt-2 text-sm text-fg-secondary">
              You are about to delete{" "}
              <span className="font-medium text-fg-primary">
                {deleteTarget.cycleKey}
              </span>
              {deleteTarget.title ? ` (${deleteTarget.title})` : ""}.
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
                onClick={() => void deleteCycle(deleteTarget)}
              >
                Delete cycle
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
