"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

type DashboardData = {
  currentMonth: {
    month: number;
    year: number;
    totalExpected: number;
    totalCollected: number;
    totalPending: number;
    collectionRate: number;
    paidVillas: number;
    pendingVillas: number;
    overdueVillas: number;
  };
  fund?: {
    currentFundBalance: number;
    allTimeCollected: number;
    allTimeSpent: number;
    maintenanceCollected?: number;
    additionalMergedInflowAllTime?: number;
    additionalMergedInflowMonth?: number;
    monthNet: number;
  };
  additionalFunds?: Array<{
    id: string;
    title: string;
    amount: number;
    destination: "MERGE_WITH_MAINTENANCE" | "KEEP_SEPARATE";
    source?: string | null;
    notes?: string | null;
    receivedDate: string;
  }>;
  monthWise: Array<{
    month: number;
    year: number;
    monthName: string;
    collected: number;
    expected: number;
    pending: number;
  }>;
  villaWise: Array<{
    villaNumber: string;
    ownerName: string;
    pendingMonths: number;
    totalDue: number;
    lastPayment: string | null;
    oldestPending: string | null;
  }>;
};

export default function MaintenancePage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "pending" | "history">("overview");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingMaintenance, setDeletingMaintenance] = useState<{month: number, year: number} | null>(null);
  const [addingFund, setAddingFund] = useState(false);
  const [fundForm, setFundForm] = useState({
    title: "",
    amount: "",
    receivedDate: new Date().toISOString().slice(0, 16),
    destination: "MERGE_WITH_MAINTENANCE" as "MERGE_WITH_MAINTENANCE" | "KEEP_SEPARATE",
    source: "",
    notes: "",
  });
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: "",
    dueDate: ""
  });

  const loadDashboard = () => {
    setLoading(true);
    api
      .get("/maintenance/dashboard")
      .then((response) => setDashboard(response.data))
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load dashboard";
        showToast(message, "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleGenerateBills = () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setFormData({
      month: nextMonth.getMonth() + 1,
      year: nextMonth.getFullYear(),
      amount: "",
      dueDate: `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-05`
    });
    setShowForm(true);
  };

  const handleSendReminders = async () => {
    try {
      await api.post("/maintenance-management/send-dues-reminders", {
        month: currentMonth.month,
        year: currentMonth.year,
      });
      showToast("Due reminders sent successfully", "success");
    } catch (error: any) {
      const message = error.response?.data?.message ?? "Failed to send reminders";
      showToast(message, "error");
    }
  };

  const handleExportReport = async () => {
    try {
      const response = await api.get("/maintenance-management/financial-dashboard/report-pdf", {
        params: { month: currentMonth.month, year: currentMonth.year },
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `maintenance_report_${currentMonth.year}_${String(currentMonth.month).padStart(2, "0")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Report exported successfully", "success");
    } catch (error: any) {
      const message = error.response?.data?.message ?? "Failed to export report";
      showToast(message, "error");
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  const handleDeleteMaintenance = async (month: number, year: number) => {
    if (!window.confirm(`Are you sure you want to delete maintenance records for ${new Date(year, month-1).toLocaleString("en-IN", {month: "long", year: "numeric"})}? This will remove all bills for that month.`)) {
      return;
    }

    setDeletingMaintenance({month, year});
    try {
      await api.delete(`/maintenance/${year}/${month}`);
      showToast("Maintenance records deleted successfully", "success");
      loadDashboard();
    } catch (error: any) {
      const message = error.response?.data?.message ?? "Failed to delete maintenance records";
      showToast(message, "error");
    } finally {
      setDeletingMaintenance(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.dueDate) {
      showToast("Please fill all required fields", "error");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/maintenance", {
        month: formData.month,
        year: formData.year,
        amount: parseFloat(formData.amount),
        dueDate: formData.dueDate
      });
      showToast("Maintenance bills generated successfully", "success");
      handleCloseForm();
      loadDashboard();
    } catch (error: any) {
      const message = error.response?.data?.message ?? "Failed to generate bills";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAdditionalFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundForm.title || !fundForm.amount) {
      showToast("Please enter title and amount", "error");
      return;
    }
    setAddingFund(true);
    try {
      await api.post("/maintenance-management/additional-funds", {
        title: fundForm.title,
        amount: Number(fundForm.amount),
        receivedDate: new Date(fundForm.receivedDate).toISOString(),
        destination: fundForm.destination,
        source: fundForm.source || undefined,
        notes: fundForm.notes || undefined,
      });
      showToast("Additional fund added", "success");
      setFundForm({
        title: "",
        amount: "",
        receivedDate: new Date().toISOString().slice(0, 16),
        destination: "MERGE_WITH_MAINTENANCE",
        source: "",
        notes: "",
      });
      loadDashboard();
    } catch (error: any) {
      const message = error.response?.data?.message ?? "Failed to add additional fund";
      showToast(message, "error");
    } finally {
      setAddingFund(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading || !dashboard) {
    return (
      <AppShell title="Maintenance Payments">
        <div className="text-gray-500">Loading dashboard...</div>
      </AppShell>
    );
  }

  const { currentMonth } = dashboard;

  return (
    <AppShell title="Maintenance Payments">
      <div className="space-y-6">
        {showForm && (
          <div className="bg-white border border-gray-200 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">Generate Maintenance Bills</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Month *
                  </label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>
                        {new Date(2024, m - 1).toLocaleDateString("en-IN", { month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    min="2020"
                    max="2050"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount per Villa (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    min="0"
                    step="0.01"
                    placeholder="e.g., 5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                This will generate maintenance bills for all {dashboard?.currentMonth.paidVillas + dashboard?.currentMonth.pendingVillas || 0} villas
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submitting ? "Generating..." : "Generate Bills"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="bg-gray-200 text-gray-800 px-6 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Current Month Summary Cards */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {new Date(currentMonth.year, currentMonth.month - 1).toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
            })} - Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Total Expected</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(currentMonth.totalExpected)}
              </div>
            </div>

            <div className="bg-white p-6 rounded border border-green-200 bg-green-50">
              <div className="text-sm text-green-700 mb-1">Total Collected</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(currentMonth.totalCollected)}
              </div>
              <div className="text-xs text-green-600 mt-1">
                {currentMonth.paidVillas} villas paid
              </div>
            </div>

            <div className="bg-white p-6 rounded border border-orange-200 bg-orange-50">
              <div className="text-sm text-orange-700 mb-1">Total Pending</div>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(currentMonth.totalPending)}
              </div>
              <div className="text-xs text-orange-600 mt-1">
                {currentMonth.pendingVillas} villas pending
              </div>
            </div>

            <div className="bg-white p-6 rounded border border-blue-200 bg-blue-50">
              <div className="text-sm text-blue-700 mb-1">Collection Rate</div>
              <div className="text-2xl font-bold text-blue-600">
                {currentMonth.collectionRate}%
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {currentMonth.overdueVillas} overdue
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded p-6 space-y-4">
          <h3 className="text-lg font-semibold">Add Additional Funds</h3>
          <p className="text-sm text-gray-600">
            Add one-time additional inflow and choose whether it should merge with maintenance fund calculations or stay separate.
          </p>
          <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            Source can be any free-text value (for example: donation, event sponsorship, corpus transfer, penalties, or others).
            <br />
            <span className="font-semibold">Merged</span> adds into maintenance fund totals;{" "}
            <span className="font-semibold">Separate</span> keeps it tracked without affecting maintenance fund balance.
          </div>
          <form onSubmit={handleAddAdditionalFund} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="border border-gray-300 rounded px-3 py-2"
              placeholder="Title (e.g. Festival contribution)"
              value={fundForm.title}
              onChange={(e) => setFundForm((s) => ({ ...s, title: e.target.value }))}
            />
            <input
              type="number"
              className="border border-gray-300 rounded px-3 py-2"
              placeholder="Amount"
              value={fundForm.amount}
              onChange={(e) => setFundForm((s) => ({ ...s, amount: e.target.value }))}
              min="0"
              step="0.01"
            />
            <input
              type="datetime-local"
              className="border border-gray-300 rounded px-3 py-2"
              value={fundForm.receivedDate}
              onChange={(e) => setFundForm((s) => ({ ...s, receivedDate: e.target.value }))}
            />
            <select
              className="border border-gray-300 rounded px-3 py-2"
              value={fundForm.destination}
              onChange={(e) =>
                setFundForm((s) => ({
                  ...s,
                  destination: e.target.value as "MERGE_WITH_MAINTENANCE" | "KEEP_SEPARATE",
                }))
              }
            >
              <option value="MERGE_WITH_MAINTENANCE">Merge with maintenance fund</option>
              <option value="KEEP_SEPARATE">Keep separate</option>
            </select>
            <input
              className="border border-gray-300 rounded px-3 py-2"
              placeholder="Source (optional, any text)"
              value={fundForm.source}
              onChange={(e) => setFundForm((s) => ({ ...s, source: e.target.value }))}
            />
            <input
              className="border border-gray-300 rounded px-3 py-2"
              placeholder="Notes (optional)"
              value={fundForm.notes}
              onChange={(e) => setFundForm((s) => ({ ...s, notes: e.target.value }))}
            />
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={addingFund}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {addingFund ? "Saving..." : "Add fund"}
              </button>
            </div>
          </form>
          <div className="text-sm text-gray-700">
            <div>Current fund balance: <strong>{formatCurrency(dashboard.fund?.currentFundBalance ?? 0)}</strong></div>
            <div>
              Merged additional inflow (month / all-time):{" "}
              <strong>
                {formatCurrency(dashboard.fund?.additionalMergedInflowMonth ?? 0)} /{" "}
                {formatCurrency(dashboard.fund?.additionalMergedInflowAllTime ?? 0)}
              </strong>
            </div>
          </div>
          {(dashboard.additionalFunds ?? []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Date</th>
                    <th>Title</th>
                    <th className="text-right">Amount</th>
                    <th>Destination</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard.additionalFunds ?? []).slice(0, 8).map((f) => (
                    <tr key={f.id} className="border-b">
                      <td className="py-2">{new Date(f.receivedDate).toLocaleDateString("en-IN")}</td>
                      <td>{f.title}</td>
                      <td className="text-right">{formatCurrency(f.amount)}</td>
                      <td>{f.destination === "MERGE_WITH_MAINTENANCE" ? "Merged" : "Separate"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Month-wise Collection
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "pending"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Pending Payments ({dashboard.villaWise.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="bg-white rounded border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Last 6 Months Collection</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Month</th>
                    <th className="text-right">Expected</th>
                    <th className="text-right">Collected</th>
                    <th className="text-right">Pending</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.monthWise.map((month) => {
                    const rate =
                      month.expected > 0 ? ((month.collected / month.expected) * 100).toFixed(0) : 0;
                    return (
                      <tr key={`${month.year}-${month.month}`} className="border-b">
                        <td className="py-3 font-medium">
                          {month.monthName} {month.year}
                        </td>
                        <td className="text-right">{formatCurrency(month.expected)}</td>
                        <td className="text-right text-green-600 font-medium">
                          {formatCurrency(month.collected)}
                        </td>
                        <td className="text-right text-orange-600">
                          {formatCurrency(month.pending)}
                        </td>
                        <td className="text-right">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              Number(rate) >= 80
                                ? "bg-green-100 text-green-800"
                                : Number(rate) >= 50
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {rate}%
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => handleDeleteMaintenance(month.month, month.year)}
                            disabled={deletingMaintenance?.month === month.month && deletingMaintenance?.year === month.year}
                            className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                            title="Delete maintenance records"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "pending" && (
          <div className="bg-white rounded border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Pending Payments by Villa</h3>
            {dashboard.villaWise.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                🎉 All villas have paid! No pending payments.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Villa</th>
                      <th>Owner</th>
                      <th className="text-right">Pending Months</th>
                      <th className="text-right">Total Due</th>
                      <th>Last Payment</th>
                      <th>Oldest Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.villaWise.map((villa) => (
                      <tr key={villa.villaNumber} className="border-b hover:bg-gray-50">
                        <td className="py-3 font-medium">{villa.villaNumber}</td>
                        <td>{villa.ownerName}</td>
                        <td className="text-right">
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                            {villa.pendingMonths} months
                          </span>
                        </td>
                        <td className="text-right font-bold text-red-600">
                          {formatCurrency(villa.totalDue)}
                        </td>
                        <td className="text-sm text-gray-600">{formatDate(villa.lastPayment)}</td>
                        <td className="text-sm text-red-600">{formatDate(villa.oldestPending)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <h3 className="font-medium text-blue-900 mb-2">Quick Actions</h3>
          <div className="flex gap-3">
            <button
              onClick={() => (window.location.href = "/maintenance-management")}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
            >
              Record Payment
            </button>
            <button
              onClick={handleGenerateBills}
              className="bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded hover:bg-blue-50 text-sm"
            >
              + Generate Bills
            </button>
            <button
              onClick={handleSendReminders}
              className="bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded hover:bg-blue-50 text-sm"
            >
              Send Reminders
            </button>
            <button
              onClick={handleExportReport}
              className="bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded hover:bg-blue-50 text-sm"
            >
              Export Report
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
