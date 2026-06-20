"use client";

import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { parseApiError } from "@/utils/errorHandler";

type BankAccount = {
  id: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  accountType: string;
  isActive: boolean;
  _count?: { maintenancePayments: number };
};

const ACCOUNT_TYPES = ["SAVINGS", "CURRENT"] as const;

const EMPTY_FORM = {
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  accountHolderName: "",
  accountType: "SAVINGS",
  isActive: true,
};

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const { confirm, ConfirmUI } = useConfirm();

  const loadAccounts = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await api.get<{ accounts: BankAccount[] }>("/bank-accounts", { signal });
      setAccounts(res.data.accounts ?? []);
    } catch (error: unknown) {
      if ((error as { name?: string }).name === "CanceledError") return;
      showToast(parseApiError(error, "Failed to load bank accounts").message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadAccounts(controller.signal);
    return () => controller.abort();
  }, [loadAccounts]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (account: BankAccount) => {
    setEditing(account);
    setForm({
      bankName: account.bankName,
      accountNumber: "",
      ifscCode: account.ifscCode,
      accountHolderName: account.accountHolderName,
      accountType: account.accountType,
      isActive: account.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.bankName.trim() || !form.ifscCode.trim() || !form.accountHolderName.trim()) {
      showToast("Fill in bank name, IFSC, and account holder name", "error");
      return;
    }
    if (!editing && !form.accountNumber.trim()) {
      showToast("Account number is required for new accounts", "error");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const payload: Record<string, unknown> = {
          bankName: form.bankName.trim(),
          ifscCode: form.ifscCode.trim(),
          accountHolderName: form.accountHolderName.trim(),
          accountType: form.accountType,
          isActive: form.isActive,
        };
        await api.patch(`/bank-accounts/${editing.id}`, payload);
        showToast("Bank account updated", "success");
      } else {
        await api.post("/bank-accounts", {
          bankName: form.bankName.trim(),
          accountNumber: form.accountNumber.trim(),
          ifscCode: form.ifscCode.trim(),
          accountHolderName: form.accountHolderName.trim(),
          accountType: form.accountType,
          isActive: form.isActive,
        });
        showToast("Bank account created", "success");
      }
      setModalOpen(false);
      await loadAccounts();
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to save bank account").message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (account: BankAccount) => {
    const ok = await confirm({
      title: "Delete bank account?",
      message: `Remove ${account.bankName} (${account.accountNumber})? Accounts with payment history must be deactivated instead.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await api.delete(`/bank-accounts/${account.id}`);
      showToast("Bank account deleted", "success");
      await loadAccounts();
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to delete").message, "error");
    }
  };

  return (
    <AppShell title="Bank Accounts">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Finance"
          title="Bank accounts"
          description="Society bank accounts used for maintenance collections and reconciliation. Account numbers are masked after save."
          icon={<Building2 className="h-6 w-6" />}
          actions={
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add account
            </button>
          }
        />

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner w-10 h-10" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="card card-body text-center text-fg-secondary">
            No bank accounts yet. Add one to track offline / NEFT collections.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bank</th>
                  <th>Account</th>
                  <th>IFSC</th>
                  <th>Holder</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Payments</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.bankName}</td>
                    <td>{a.accountNumber}</td>
                    <td>{a.ifscCode}</td>
                    <td>{a.accountHolderName}</td>
                    <td>{a.accountType}</td>
                    <td>
                      <span className={`badge ${a.isActive ? "badge-success" : "badge-gray"}`}>
                        {a.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{a._count?.maintenancePayments ?? 0}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEdit(a)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-brand-danger"
                          onClick={() => void handleDelete(a)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="card w-full max-w-lg">
          <div className="card-header">
            <h3 className="text-base font-semibold">
              {editing ? "Edit bank account" : "Add bank account"}
            </h3>
          </div>
          <div className="card-body space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Bank name</label>
              <input
                className="input"
                value={form.bankName}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
              />
            </div>
            {!editing && (
              <div>
                <label className="block text-sm font-medium mb-1">Account number</label>
                <input
                  className="input"
                  value={form.accountNumber}
                  onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">IFSC</label>
                <input
                  className="input"
                  value={form.ifscCode}
                  onChange={(e) => setForm((f) => ({ ...f, ifscCode: e.target.value.toUpperCase() }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account type</label>
                <select
                  className="input"
                  value={form.accountType}
                  onChange={(e) => setForm((f) => ({ ...f, accountType: e.target.value }))}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account holder name</label>
              <input
                className="input"
                value={form.accountHolderName}
                onChange={(e) => setForm((f) => ({ ...f, accountHolderName: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Active
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {ConfirmUI}
    </AppShell>
  );
}
