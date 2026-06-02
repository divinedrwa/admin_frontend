"use client";

import type { BillingCycleRow, CycleFormData, FinancialYearOption } from "./types";

export interface CycleFormModalProps {
  createOpen: boolean;
  setCreateOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editId: string | null;
  setEditId: React.Dispatch<React.SetStateAction<string | null>>;
  form: CycleFormData;
  setForm: React.Dispatch<React.SetStateAction<CycleFormData>>;
  financialYears: FinancialYearOption[];
  monthOptionsForSelectedFinancialYear: Array<{ value: string; label: string }>;
  creatingCycle: boolean;
  cycles: BillingCycleRow[];
  onCreateCycle: (e: React.FormEvent) => void;
  onSubmitEdit: (e: React.FormEvent) => void;
  onOpenEdit: (c: BillingCycleRow) => void;
  onDeleteTarget: (c: BillingCycleRow) => void;
  statusBadge: (status: string) => React.ReactNode;
  onOpenCreate: () => void;
  onPublish?: (cycleId: string) => void;
  publishingId?: string | null;
}

export function CycleFormModal({
  createOpen,
  setCreateOpen,
  editId,
  setEditId,
  form,
  setForm,
  financialYears,
  monthOptionsForSelectedFinancialYear,
  creatingCycle,
  cycles,
  onCreateCycle,
  onSubmitEdit,
  onOpenEdit,
  onDeleteTarget,
  statusBadge,
  onOpenCreate,
  onPublish,
  publishingId,
}: CycleFormModalProps) {
  return (
    <>
      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          className="btn btn-primary text-sm"
          onClick={onOpenCreate}
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
          onSubmit={onCreateCycle}
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
              <th scope="col" className="table-th">Month</th>
              <th scope="col" className="table-th">Amount</th>
              <th scope="col" className="table-th">Status</th>
              <th scope="col" className="table-th">Window (UTC ISO)</th>
              <th scope="col" className="table-th">Paid</th>
              <th scope="col" className="table-th">Pending</th>
              <th scope="col" className="table-th"></th>
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
                <td className="table-td">
                  <div className="flex items-center gap-1.5">
                    {!c.publishedAt && (
                      <span className="badge badge-warning">Draft</span>
                    )}
                    {statusBadge(c.status)}
                  </div>
                </td>
                <td className="table-td max-w-[280px] text-xs text-fg-secondary truncate" title={c.paymentWindow}>
                  {c.paymentStartDate.slice(0, 19)} → {c.paymentEndDate.slice(0, 19)}
                </td>
                <td className="table-td">{c.paidUsersCount}</td>
                <td className="table-td">{c.pendingUsersCount}</td>
                <td className="table-td">
                  <div className="flex items-center gap-3">
                    {!c.publishedAt && onPublish && (
                      <button
                        type="button"
                        className="text-approved-fg text-xs font-semibold hover:underline disabled:opacity-50"
                        disabled={publishingId === c.id}
                        onClick={() => onPublish(c.id)}
                      >
                        {publishingId === c.id ? "Publishing..." : "Publish"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-brand-primary text-xs font-semibold hover:underline"
                      onClick={() => onOpenEdit(c)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-brand-danger text-xs font-semibold hover:underline"
                      onClick={() => onDeleteTarget(c)}
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
          onSubmit={onSubmitEdit}
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
    </>
  );
}
