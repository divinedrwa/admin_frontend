"use client";

import { PaymentStatus, ResidentRow, formatCurrency } from "./types";

interface MaintenanceTableProps {
  filterStatus: "all" | PaymentStatus | "EXCLUDED";
  onFilterStatusChange: (status: "all" | PaymentStatus | "EXCLUDED") => void;
  search: string;
  onSearchChange: (value: string) => void;
  filteredResidents: ResidentRow[];
  selectedCycleId: string;
  gridLoading: boolean;
  cycleEditable: boolean;
  loading: boolean;
  showCreditHelp: boolean;
  onToggleCreditHelp: () => void;
  hasResidents: boolean;
  onOpenRowEdit: (row: ResidentRow) => void;
  onOpenMarkPaid: (row: ResidentRow) => void;
  onOpenCreditModal: (row: ResidentRow) => void;
  onOpenExcludeModal: (row: ResidentRow) => void;
  onOpenUnpaidModal: (row: ResidentRow) => void;
  onIncludeVilla: (row: ResidentRow) => void;
}

export function MaintenanceTable({
  filterStatus,
  onFilterStatusChange,
  search,
  onSearchChange,
  filteredResidents,
  selectedCycleId,
  gridLoading,
  cycleEditable,
  loading,
  showCreditHelp,
  onToggleCreditHelp,
  hasResidents,
  onOpenRowEdit,
  onOpenMarkPaid,
  onOpenCreditModal,
  onOpenExcludeModal,
  onOpenUnpaidModal,
  onIncludeVilla,
}: MaintenanceTableProps) {
  return (
    <>
      {/* Advance Credit explainer */}
      {hasResidents && (
        <div className="bg-brand-primary-light border border-surface-border rounded">
          <button
            type="button"
            onClick={onToggleCreditHelp}
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
          onChange={(e) => onFilterStatusChange(e.target.value as "all" | PaymentStatus | "EXCLUDED")}
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
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="table-wrapper relative">
        {gridLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/60">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand border-t-transparent" />
          </div>
        )}
        <table className="table">
          <thead className="table-head">
            <tr>
              <th scope="col" className="table-th">Villa</th>
              <th scope="col" className="table-th">Owner</th>
              <th scope="col" className="table-th">Amount</th>
              <th scope="col" className="table-th">Advance Credit</th>
              <th scope="col" className="table-th">Status</th>
              <th scope="col" className="table-th">Actions</th>
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
                        onClick={() => onOpenCreditModal(r)}
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
                        onClick={() => onOpenCreditModal(r)}
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
                        onClick={() => onIncludeVilla(r)}
                        disabled={!cycleEditable || loading}
                        className="text-brand-primary hover:text-info-fg font-medium disabled:opacity-40"
                      >
                        Include
                      </button>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenRowEdit(r)}
                          disabled={!cycleEditable || loading}
                          title={!cycleEditable ? "Only OPEN cycles can be edited" : "Edit expected & collected"}
                          className="text-fg-primary hover:text-brand-primary font-medium disabled:opacity-40"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenMarkPaid(r)}
                          disabled={!cycleEditable || loading}
                          className="text-brand-primary hover:text-info-fg font-medium disabled:opacity-40"
                        >
                          Mark paid
                        </button>
                        {(r.status === "PAID" || r.status === "PARTIAL") && (
                          <button
                            type="button"
                            onClick={() => onOpenUnpaidModal(r)}
                            disabled={!cycleEditable || loading}
                            className="text-denied-fg hover:text-brand-danger font-medium disabled:opacity-40"
                          >
                            Mark Unpaid
                          </button>
                        )}
                        {r.receiptNumber && (
                          <span className="text-fg-tertiary text-xs">({r.receiptNumber})</span>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenExcludeModal(r)}
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
    </>
  );
}
