"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { AppShell } from "@/components/AppShell";

type Resident = {
  id: string;
  username: string | null;
  name: string;
  email: string;
  phone: string | null;
  villaId: string | null;
  villa: {
    villaNumber: string;
    block: string;
  } | null;
  type: "Owner" | "Tenant" | "Family";
  moveInDate: string | null;
  moveOutDate: string | null;
  isActive: boolean;
  daysSinceMove: number;
  createdAt: string;
};

type Statistics = {
  totalResidents: number;
  activeResidents: number;
  inactiveResidents: number;
  owners: number;
  tenants: number;
  newThisMonth: number;
  movedOutThisMonth: number;
  occupancyRate: number;
};

export default function ResidentManagementPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [filteredResidents, setFilteredResidents] = useState<Resident[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "owner" | "tenant">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Move-out modal
  const [showMoveOutModal, setShowMoveOutModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [moveOutDate, setMoveOutDate] = useState(new Date().toISOString().split("T")[0]);
  const [moveOutReason, setMoveOutReason] = useState("");

  // Fetch residents
  const fetchResidents = async () => {
    try {
      setLoading(true);
      const response = await api.get("/resident-management/overview");
      setResidents(response.data.residents);
      setFilteredResidents(response.data.residents);
      setStatistics(response.data.statistics);
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to load residents", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = residents;

    // Status filter
    if (statusFilter === "active") {
      filtered = filtered.filter((r) => r.isActive);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((r) => !r.isActive);
    }

    // Type filter
    if (typeFilter === "owner") {
      filtered = filtered.filter((r) => r.type === "Owner");
    } else if (typeFilter === "tenant") {
      filtered = filtered.filter((r) => r.type === "Tenant");
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.email.toLowerCase().includes(query) ||
          (r.villa?.villaNumber.toLowerCase().includes(query)) ||
          (r.username && r.username.toLowerCase().includes(query))
      );
    }

    setFilteredResidents(filtered);
  }, [statusFilter, typeFilter, searchQuery, residents]);

  const handleMoveOut = (resident: Resident) => {
    setSelectedResident(resident);
    setShowMoveOutModal(true);
  };

  const submitMoveOut = async () => {
    if (!selectedResident) return;

    try {
      setLoading(true);
      await api.post("/resident-management/move-out", {
        userId: selectedResident.id,
        moveOutDate: new Date(moveOutDate).toISOString(),
        reason: moveOutReason || undefined,
      });

      showToast("Move-out processed successfully", "success");
      setShowMoveOutModal(false);
      setMoveOutReason("");
      fetchResidents();
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to process move-out", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async (residentId: string) => {
    if (!confirm("Are you sure you want to reactivate this resident?")) return;

    try {
      setLoading(true);
      await api.patch(`/resident-management/${residentId}/reactivate`);
      showToast("Resident reactivated successfully", "success");
      fetchResidents();
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to reactivate resident", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <AppShell title="Resident Management Dashboard">
      {/* Summary Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <div className="text-sm text-blue-600">Total Residents</div>
            <div className="text-2xl font-bold text-blue-900">{statistics.totalResidents}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <div className="text-sm text-green-600">Active</div>
            <div className="text-2xl font-bold text-green-900">{statistics.activeResidents}</div>
            <div className="text-xs text-green-700">{statistics.occupancyRate}% occupancy</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <div className="text-sm text-gray-600">Inactive</div>
            <div className="text-2xl font-bold text-gray-900">{statistics.inactiveResidents}</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded p-4">
            <div className="text-sm text-purple-600">New This Month</div>
            <div className="text-2xl font-bold text-purple-900">{statistics.newThisMonth}</div>
          </div>
          
          <div className="bg-indigo-50 border border-indigo-200 rounded p-4">
            <div className="text-sm text-indigo-600">Owners</div>
            <div className="text-2xl font-bold text-indigo-900">{statistics.owners}</div>
          </div>
          <div className="bg-cyan-50 border border-cyan-200 rounded p-4">
            <div className="text-sm text-cyan-600">Tenants</div>
            <div className="text-2xl font-bold text-cyan-900">{statistics.tenants}</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded p-4">
            <div className="text-sm text-orange-600">Moved Out (Month)</div>
            <div className="text-2xl font-bold text-orange-900">{statistics.movedOutThisMonth}</div>
          </div>
          <div className="bg-teal-50 border border-teal-200 rounded p-4">
            <div className="text-sm text-teal-600">Occupancy Rate</div>
            <div className="text-2xl font-bold text-teal-900">{statistics.occupancyRate}%</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 space-y-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="all">All Types</option>
            <option value="owner">Owners</option>
            <option value="tenant">Tenants</option>
          </select>

          <input
            type="text"
            placeholder="Search by name, email, username, or villa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div className="text-sm text-gray-600">
          Showing {filteredResidents.length} of {residents.length} residents
        </div>
      </div>

      {/* Residents Table */}
      <div className="bg-white border border-gray-200 rounded overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Resident
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Villa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Move-in Date
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
            {filteredResidents.map((resident) => (
              <tr key={resident.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">{resident.name}</div>
                    {resident.username && (
                      <div className="text-xs text-gray-500 font-mono">@{resident.username}</div>
                    )}
                    <div className="text-sm text-gray-600">{resident.email}</div>
                    {resident.phone && (
                      <div className="text-xs text-gray-500">{resident.phone}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {resident.villa ? (
                    <div>
                      <div className="font-medium text-gray-900">
                        {resident.villa.villaNumber}
                      </div>
                      {resident.villa.block && (
                        <div className="text-xs text-gray-500">Block {resident.villa.block}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">No villa</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      resident.type === "Owner"
                        ? "bg-indigo-100 text-indigo-800"
                        : resident.type === "Family"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-cyan-100 text-cyan-800"
                    }`}
                  >
                    {resident.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatDate(resident.moveInDate)}</div>
                  {resident.isActive && resident.daysSinceMove > 0 && (
                    <div className="text-xs text-gray-500">{resident.daysSinceMove} days ago</div>
                  )}
                  {resident.moveOutDate && (
                    <div className="text-xs text-red-600">
                      Out: {formatDate(resident.moveOutDate)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      resident.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {resident.isActive ? "✅ Active" : "⏸️ Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {resident.isActive ? (
                    <button
                      onClick={() => handleMoveOut(resident)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Process Move-out
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(resident.id)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredResidents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No residents found matching your filters
          </div>
        )}
      </div>

      {/* Move-out Modal */}
      {showMoveOutModal && selectedResident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Process Move-out</h2>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="font-medium text-gray-900">{selectedResident.name}</div>
              <div className="text-sm text-gray-600">{selectedResident.email}</div>
              {selectedResident.villa && (
                <div className="text-sm text-gray-600">
                  Villa: {selectedResident.villa.villaNumber}
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Move-out Date *
                </label>
                <input
                  type="date"
                  value={moveOutDate}
                  onChange={(e) => setMoveOutDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={moveOutReason}
                  onChange={(e) => setMoveOutReason(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="e.g., Lease ended, Moved to another property..."
                  rows={3}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={submitMoveOut}
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Confirm Move-out"}
                </button>
                <button
                  onClick={() => {
                    setShowMoveOutModal(false);
                    setMoveOutReason("");
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && !showMoveOutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">Loading...</p>
          </div>
        </div>
      )}
    </AppShell>
  );
}
