"use client";

export interface CashPaymentModalProps {
  cycleOptions: Array<{ id: string; label: string }>;
  primaryMaintenanceUsers: Array<{
    id: string;
    name: string;
    maintenanceBillingRole?: "PRIMARY" | "EXCLUDED" | null;
    villa?: { villaNumber: string };
  }>;
  reopenId: string;
  setReopenId: React.Dispatch<React.SetStateAction<string>>;
  reopenEnd: string;
  setReopenEnd: React.Dispatch<React.SetStateAction<string>>;
  cashCycleId: string;
  setCashCycleId: React.Dispatch<React.SetStateAction<string>>;
  cashUserId: string;
  setCashUserId: React.Dispatch<React.SetStateAction<string>>;
  cashAmount: string;
  setCashAmount: React.Dispatch<React.SetStateAction<string>>;
  waiveCycleId: string;
  setWaiveCycleId: React.Dispatch<React.SetStateAction<string>>;
  waiveUserId: string;
  setWaiveUserId: React.Dispatch<React.SetStateAction<string>>;
  actionBusy: boolean;
  onReopen: () => void;
  onCash: () => void;
  onWaive: () => void;
}

export function CashPaymentModal({
  cycleOptions,
  primaryMaintenanceUsers,
  reopenId,
  setReopenId,
  reopenEnd,
  setReopenEnd,
  cashCycleId,
  setCashCycleId,
  cashUserId,
  setCashUserId,
  cashAmount,
  setCashAmount,
  waiveCycleId,
  setWaiveCycleId,
  waiveUserId,
  setWaiveUserId,
  actionBusy,
  onReopen,
  onCash,
  onWaive,
}: CashPaymentModalProps) {
  return (
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
        <button type="button" disabled={actionBusy} className="btn btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed" onClick={onReopen}>
          {actionBusy ? "Applying…" : "Apply"}
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
        <button type="button" disabled={actionBusy} className="btn btn-success w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed" onClick={onCash}>
          {actionBusy ? "Recording…" : "Record cash"}
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
        <button type="button" disabled={actionBusy} className="btn btn-primary w-full text-sm bg-pending-solid hover:bg-pending-solid hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed" onClick={onWaive}>
          {actionBusy ? "Waiving…" : "Waive"}
        </button>
        </div>
      </div>
    </div>
  );
}
