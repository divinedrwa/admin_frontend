"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/components/Toast";
import { api } from "@/lib/api";

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    accountHolderName: "",
    accountType: "SAVINGS",
    branch: "",
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/bank-accounts");
      setAccounts(response.data.accounts || response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch bank accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/bank-accounts", form);
      showToast("Bank account created successfully", "success");
      setShowModal(false);
      setForm({
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        accountHolderName: "",
        accountType: "SAVINGS",
        branch: "",
      });
      fetchAccounts();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to create account", "error");
    }
  };

  return (
    <div className="min-h-screen bg-surface-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="page-action-bar">
          <div>
            <h1 className="text-3xl font-bold text-fg-primary">Bank Accounts</h1>
            <p className="text-fg-secondary">Manage society bank accounts</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            + Add Account
          </button>
        </div>

        {error && (
          <div className="bg-denied-bg border border-brand-danger text-denied-fg px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner w-10 h-10"></div>
            <p className="loading-state-text">Loading accounts...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🏦</span>
            <p className="empty-state-title">No bank accounts found</p>
            <p className="empty-state-text">Add one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <div key={account.id} className="card card-body">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-fg-primary">{account.bankName}</h3>
                  <p className="text-sm text-fg-secondary">{account.branch}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-fg-secondary">Account Holder:</span>
                    <p className="font-medium">{account.accountHolderName}</p>
                  </div>
                  <div>
                    <span className="text-fg-secondary">Account Number:</span>
                    <p className="font-mono font-medium">{account.accountNumber}</p>
                  </div>
                  <div>
                    <span className="text-fg-secondary">IFSC Code:</span>
                    <p className="font-mono">{account.ifscCode}</p>
                  </div>
                  <div>
                    <span className="text-fg-secondary">Type:</span>
                    <span className="badge badge-primary ml-2">
                      {account.accountType}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-surface rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Add Bank Account</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    required
                    value={form.accountHolderName}
                    onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    value={form.accountNumber}
                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">IFSC Code</label>
                  <input
                    type="text"
                    required
                    value={form.ifscCode}
                    onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">Account Type</label>
                  <select
                    value={form.accountType}
                    onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                    className="input"
                  >
                    <option value="SAVINGS">Savings</option>
                    <option value="CURRENT">Current</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">Branch</label>
                  <input
                    type="text"
                    value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value })}
                    className="input"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
