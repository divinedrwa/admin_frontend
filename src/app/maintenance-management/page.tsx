"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { AppShell } from "@/components/AppShell";

type PaymentStatus = "PAID" | "PENDING" | "OVERDUE";
type PaymentMode = "CASH" | "UPI" | "CHEQUE" | "BANK_TRANSFER";

type VillaPayment = {
  villaId: string;
  villaNumber: string;
  block: string;
  ownerName: string;
  amount: number;
  status: PaymentStatus;
  daysOverdue: number;
  maintenanceId: string | null;
  dueDate: string | null;
  paymentDate: string | null;
  receiptNumber: string | null;
  paymentMode: PaymentMode | null;
};

type MonthSummary = {
  year: number;
  month: number;
  totalVillas: number;
  paidCount: number;
  unpaidCount: number;
  overdueCount: number;
  totalAmount: number;
  collectedAmount: number;
  pendingAmount: number;
  collectionRate: number;
};

type MonthlyReport = {
  month: number;
  totalAmount: number;
  collected: number;
  pending: number;
  collectionRate: number;
  paymentCount: number;
};

type YearReport = {
  year: number;
  yearlyTotal: number;
  yearlyCollected: number;
  yearlyPending: number;
  yearlyRate: number;
  monthlyData: MonthlyReport[];
};

type PaymentHistory = {
  year: number;
  month: number;
  amount: number;
  status: PaymentStatus;
  dueDate: string | null;
  paymentDate: string | null;
  receiptNumber: string | null;
  paymentMode: PaymentMode | null;
  transactionId: string | null;
};

type VillaHistory = {
  villa: {
    villaNumber: string;
    block: string;
    ownerName: string;
    monthlyMaintenance: number;
  };
  history: PaymentHistory[];
  statistics: {
    totalPayments: number;
    totalPaid: number;
    avgPaymentDelay: number;
  };
};

type VillaBasic = {
  id: string;
  villaNumber: string;
  block?: string | null;
  ownerName: string;
  monthlyMaintenance: number;
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
  const [activeTab, setActiveTab] = useState<"monthly" | "yearly" | "villa">("monthly");
  
  // Monthly View State
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [villaPayments, setVillaPayments] = useState<VillaPayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<VillaPayment[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | PaymentStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Yearly View State
  const [yearForReport, setYearForReport] = useState(new Date().getFullYear());
  const [yearReport, setYearReport] = useState<YearReport | null>(null);
  
  // Villa History State
  const [villas, setVillas] = useState<VillaBasic[]>([]);
  const [selectedVillaId, setSelectedVillaId] = useState("");
  const [villaHistory, setVillaHistory] = useState<VillaHistory | null>(null);
  const [defaultMaintenanceAmount, setDefaultMaintenanceAmount] = useState("");
  const [villaOverrideInputs, setVillaOverrideInputs] = useState<Record<string, string>>({});
  const [savingAmounts, setSavingAmounts] = useState(false);
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    villaId: "",
    villaNumber: "",
    amount: 0,
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMode: "CASH" as PaymentMode,
    transactionId: "",
    remarks: "",
  });

  const [loading, setLoading] = useState(false);

  // Fetch monthly data
  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/maintenance-management/month/${selectedYear}/${selectedMonth}`
      );
      setSummary(response.data.summary);
      setVillaPayments(response.data.villaPayments);
      setFilteredPayments(response.data.villaPayments);
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch yearly report
  const fetchYearlyReport = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/maintenance-management/year-report/${yearForReport}`);
      setYearReport(response.data);
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to load report", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch villa history
  const fetchVillaHistory = async () => {
    if (!selectedVillaId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/maintenance-management/villa-history/${selectedVillaId}`);
      setVillaHistory(response.data);
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to load history", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch villas for dropdown
  const fetchVillas = async () => {
    try {
      const response = await api.get("/villas");
      const rows: VillaBasic[] = response.data.villas || [];
      setVillas(rows);
      if (rows.length > 0) {
        setSelectedVillaId((prev) => prev || rows[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch villas");
    }
  };

  useEffect(() => {
    void fetchVillas();
  }, []);

  useEffect(() => {
    if (activeTab === "monthly") {
      fetchMonthlyData();
    } else if (activeTab === "yearly") {
      fetchYearlyReport();
    } else if (activeTab === "villa") {
      fetchVillas();
    }
  }, [activeTab, selectedYear, selectedMonth, yearForReport]);

  useEffect(() => {
    if (activeTab === "villa" && selectedVillaId) {
      fetchVillaHistory();
    }
  }, [selectedVillaId]);

  // Filter and search
  useEffect(() => {
    let filtered = villaPayments;

    if (filterStatus !== "all") {
      filtered = filtered.filter((v) => v.status === filterStatus);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.villaNumber.toLowerCase().includes(query) ||
          v.ownerName.toLowerCase().includes(query)
      );
    }

    setFilteredPayments(filtered);
  }, [filterStatus, searchQuery, villaPayments]);

  const handleMarkPaid = (villa: VillaPayment) => {
    setPaymentFormData({
      villaId: villa.villaId,
      villaNumber: villa.villaNumber,
      amount: villa.amount,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMode: "CASH",
      transactionId: "",
      remarks: "",
    });
    setShowPaymentModal(true);
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await api.post("/maintenance-management/mark-paid", {
        villaId: paymentFormData.villaId,
        year: selectedYear,
        month: selectedMonth,
        amount: paymentFormData.amount,
        paymentDate: new Date(paymentFormData.paymentDate).toISOString(),
        paymentMode: paymentFormData.paymentMode,
        transactionId: paymentFormData.transactionId || undefined,
        remarks: paymentFormData.remarks || undefined,
      });
      
      showToast("Payment marked successfully", "success");
      setShowPaymentModal(false);
      fetchMonthlyData(); // Refresh data
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to mark payment", "error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    const styles = {
      PAID: "bg-green-100 text-green-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      OVERDUE: "bg-red-100 text-red-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const applyDefaultAmount = async () => {
    const value = Number(defaultMaintenanceAmount);
    if (!Number.isFinite(value) || value <= 0) {
      showToast("Enter a valid default amount", "error");
      return;
    }
    try {
      setSavingAmounts(true);
      await api.post("/villas/bulk-maintenance-amount", {
        defaultAmount: value,
      });
      showToast("Default maintenance amount applied to all villas", "success");
      await Promise.all([fetchVillas(), fetchMonthlyData()]);
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to apply default amount", "error");
    } finally {
      setSavingAmounts(false);
    }
  };

  const applyVillaOverride = async (villaId: string) => {
    const raw = villaOverrideInputs[villaId];
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      showToast("Enter a valid custom amount", "error");
      return;
    }
    try {
      setSavingAmounts(true);
      await api.post("/villas/bulk-maintenance-amount", {
        overrides: [{ villaId, monthlyMaintenance: value }],
      });
      showToast("Villa custom amount updated", "success");
      setVillaOverrideInputs((prev) => ({ ...prev, [villaId]: "" }));
      await Promise.all([fetchVillas(), fetchMonthlyData()]);
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to update villa amount", "error");
    } finally {
      setSavingAmounts(false);
    }
  };

  return (
    <AppShell title="Maintenance Payment Management">
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab("monthly")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "monthly"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Monthly Overview
          </button>
          <button
            onClick={() => setActiveTab("yearly")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "yearly"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Year-Wise Report
          </button>
          <button
            onClick={() => setActiveTab("villa")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "villa"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Villa History
          </button>
        </div>
      </div>

      {/* Monthly Overview Tab */}
      {activeTab === "monthly" && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded p-4 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Maintenance amount rules</h3>
            <p className="text-sm text-gray-600">
              Set one default monthly amount for all villas, then customize selected villas when needed.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default amount (₹)</label>
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  value={defaultMaintenanceAmount}
                  onChange={(e) => setDefaultMaintenanceAmount(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                  placeholder="e.g. 3000"
                />
              </div>
              <button
                type="button"
                onClick={applyDefaultAmount}
                disabled={savingAmounts}
                className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
              >
                Apply to all villas
              </button>
            </div>
            <div className="overflow-auto border border-gray-100 rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Villa</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current amount</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Custom amount</th>
                  </tr>
                </thead>
                <tbody>
                  {villas.map((villa) => (
                    <tr key={villa.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">
                        {villa.villaNumber}
                        {villa.block ? ` (${villa.block})` : ""}
                      </td>
                      <td className="px-3 py-2">{villa.ownerName}</td>
                      <td className="px-3 py-2">{formatCurrency(Number(villa.monthlyMaintenance || 0))}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            step="0.01"
                            value={villaOverrideInputs[villa.id] ?? ""}
                            onChange={(e) =>
                              setVillaOverrideInputs((prev) => ({
                                ...prev,
                                [villa.id]: e.target.value,
                              }))
                            }
                            className="border border-gray-300 rounded px-2 py-1 w-32"
                            placeholder="Amount"
                          />
                          <button
                            type="button"
                            onClick={() => applyVillaOverride(villa.id)}
                            disabled={savingAmounts}
                            className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                          >
                            Save
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {villas.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                        No villas found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Period Selector */}
          <div className="bg-white border border-gray-200 rounded p-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Select Period:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-3 py-2"
              >
                {MONTHS.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-3 py-2"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary Statistics */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <div className="text-sm text-blue-600">Total Villas</div>
                <div className="text-2xl font-bold text-blue-900">{summary.totalVillas}</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <div className="text-sm text-green-600">Paid ({summary.collectionRate}%)</div>
                <div className="text-2xl font-bold text-green-900">{summary.paidCount}</div>
                <div className="text-sm text-green-700">{formatCurrency(summary.collectedAmount)}</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                <div className="text-sm text-yellow-600">Unpaid</div>
                <div className="text-2xl font-bold text-yellow-900">{summary.unpaidCount}</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <div className="text-sm text-red-600">Overdue</div>
                <div className="text-2xl font-bold text-red-900">{summary.overdueCount}</div>
                <div className="text-sm text-red-700">{formatCurrency(summary.pendingAmount)}</div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex space-x-4 items-center">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="border border-gray-300 rounded px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Unpaid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
            <input
              type="text"
              placeholder="Search by villa number or owner name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 flex-1"
            />
          </div>

          {/* Payment Table */}
          <div className="bg-white border border-gray-200 rounded overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Villa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Owner Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((villa) => (
                  <tr key={villa.villaId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {villa.villaNumber}
                      {villa.block && <span className="text-gray-500"> ({villa.block})</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {villa.ownerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(villa.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${getStatusBadge(villa.status)}`}>
                        {villa.status === "PAID" && villa.paymentDate
                          ? `✅ Paid (${new Date(villa.paymentDate).toLocaleDateString()})`
                          : villa.status === "PENDING"
                          ? `⏳ Unpaid`
                          : `🔴 Overdue (${villa.daysOverdue} days)`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {villa.status !== "PAID" ? (
                        <button
                          onClick={() => handleMarkPaid(villa)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Mark as Paid
                        </button>
                      ) : (
                        <span className="text-gray-500">Receipt: {villa.receiptNumber}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredPayments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No villas found matching your filters
              </div>
            )}
          </div>
        </div>
      )}

      {/* Yearly Report Tab */}
      {activeTab === "yearly" && (
        <div className="space-y-6">
          {/* Year Selector */}
          <div className="bg-white border border-gray-200 rounded p-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Select Year:</label>
              <select
                value={yearForReport}
                onChange={(e) => setYearForReport(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-3 py-2"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Yearly Summary */}
          {yearReport && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <div className="text-sm text-blue-600">Total Expected</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {formatCurrency(yearReport.yearlyTotal)}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <div className="text-sm text-green-600">Collected</div>
                  <div className="text-2xl font-bold text-green-900">
                    {formatCurrency(yearReport.yearlyCollected)}
                  </div>
                  <div className="text-sm text-green-700">{yearReport.yearlyRate}%</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <div className="text-sm text-red-600">Pending</div>
                  <div className="text-2xl font-bold text-red-900">
                    {formatCurrency(yearReport.yearlyPending)}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded p-4">
                  <div className="text-sm text-purple-600">Collection Rate</div>
                  <div className="text-2xl font-bold text-purple-900">{yearReport.yearlyRate}%</div>
                </div>
              </div>

              {/* Monthly Breakdown Table */}
              <div className="bg-white border border-gray-200 rounded overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Month
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Collected
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Pending
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {yearReport.monthlyData.map((monthData, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {MONTHS[monthData.month - 1]}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(monthData.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {formatCurrency(monthData.collected)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                          {formatCurrency(monthData.pending)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${monthData.collectionRate}%` }}
                              />
                            </div>
                            <span className="text-gray-700 font-medium">
                              {monthData.collectionRate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-900">TOTAL</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(yearReport.yearlyTotal)}
                      </td>
                      <td className="px-6 py-4 text-sm text-green-600">
                        {formatCurrency(yearReport.yearlyCollected)}
                      </td>
                      <td className="px-6 py-4 text-sm text-red-600">
                        {formatCurrency(yearReport.yearlyPending)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{yearReport.yearlyRate}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Villa History Tab */}
      {activeTab === "villa" && (
        <div className="space-y-6">
          {/* Villa Selector */}
          <div className="bg-white border border-gray-200 rounded p-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Select Villa:</label>
              <select
                value={selectedVillaId}
                onChange={(e) => setSelectedVillaId(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 flex-1"
              >
                {villas.map((villa) => (
                  <option key={villa.id} value={villa.id}>
                    {villa.villaNumber} - {villa.ownerName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Villa Info & History */}
          {villaHistory && (
            <>
              {/* Villa Info */}
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h3 className="font-semibold text-lg text-blue-900 mb-2">
                  {villaHistory.villa.villaNumber}
                  {villaHistory.villa.block && ` (Block ${villaHistory.villa.block})`}
                </h3>
                <p className="text-blue-700">Owner: {villaHistory.villa.ownerName}</p>
                <p className="text-blue-700">
                  Monthly Maintenance: {formatCurrency(villaHistory.villa.monthlyMaintenance)}
                </p>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded p-4">
                  <div className="text-sm text-gray-600">Total Payments</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {villaHistory.statistics.totalPayments}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded p-4">
                  <div className="text-sm text-gray-600">Total Paid</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(villaHistory.statistics.totalPaid)}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded p-4">
                  <div className="text-sm text-gray-600">Avg Payment Delay</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {villaHistory.statistics.avgPaymentDelay} days
                  </div>
                </div>
              </div>

              {/* Payment History Table */}
              <div className="bg-white border border-gray-200 rounded overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Month/Year
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Paid Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Receipt
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {villaHistory.history.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {MONTHS[record.month - 1]} {record.year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(record.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded ${getStatusBadge(record.status)}`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.paymentDate
                            ? new Date(record.paymentDate).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.receiptNumber || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {villaHistory.history.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No payment history available
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Mark Payment as Paid</h2>
            <form onSubmit={submitPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Villa: {paymentFormData.villaNumber}
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentFormData.amount}
                  onChange={(e) =>
                    setPaymentFormData({ ...paymentFormData, amount: parseFloat(e.target.value) })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={paymentFormData.paymentDate}
                  onChange={(e) =>
                    setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Mode *
                </label>
                <select
                  required
                  value={paymentFormData.paymentMode}
                  onChange={(e) =>
                    setPaymentFormData({
                      ...paymentFormData,
                      paymentMode: e.target.value as PaymentMode,
                    })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction ID
                </label>
                <input
                  type="text"
                  value={paymentFormData.transactionId}
                  onChange={(e) =>
                    setPaymentFormData({ ...paymentFormData, transactionId: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={paymentFormData.remarks}
                  onChange={(e) =>
                    setPaymentFormData({ ...paymentFormData, remarks: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Optional"
                  rows={3}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Mark as Paid"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && !showPaymentModal && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      )}
    </AppShell>
  );
}
