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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">💳 Bank Accounts</h1>
            <p className="text-gray-600">Manage society bank accounts</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Add Account
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading accounts...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No bank accounts found. Add one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <div key={account.id} className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{account.bankName}</h3>
                  <p className="text-sm text-gray-600">{account.branch}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Account Holder:</span>
                    <p className="font-medium">{account.accountHolderName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Account Number:</span>
                    <p className="font-mono font-medium">{account.accountNumber}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">IFSC Code:</span>
                    <p className="font-mono">{account.ifscCode}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
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
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Add Bank Account</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    required
                    value={form.accountHolderName}
                    onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    value={form.accountNumber}
                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    required
                    value={form.ifscCode}
                    onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                  <select
                    value={form.accountType}
                    onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="SAVINGS">Savings</option>
                    <option value="CURRENT">Current</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <input
                    type="text"
                    value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
