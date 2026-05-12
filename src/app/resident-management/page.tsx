"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { AppShell } from "@/components/AppShell";
import { parseApiError } from "@/utils/errorHandler";

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
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to load residents").message, "error");
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
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to process move-out").message, "error");
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
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to reactivate resident").message, "error");
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
          <div className="bg-brand-primary-light border border-surface-border rounded p-4">
            <div className="text-sm text-brand-primary">Total Residents</div>
            <div className="text-2xl font-bold text-fg-primary">{statistics.totalResidents}</div>
          </div>
          <div className="bg-approved-bg border border-approved-bg rounded p-4">
            <div className="text-sm text-approved-solid">Active</div>
            <div className="text-2xl font-bold text-fg-primary">{statistics.activeResidents}</div>
            <div className="text-xs text-approved-fg">{statistics.occupancyRate}% occupancy</div>
          </div>
          <div className="bg-surface-background border border-surface-border rounded p-4">
            <div className="text-sm text-fg-secondary">Inactive</div>
            <div className="text-2xl font-bold text-fg-primary">{statistics.inactiveResidents}</div>
          </div>
          <div className="bg-brand-primary-light border border-surface-border rounded p-4">
            <div className="text-sm text-brand-primary">New This Month</div>
            <div className="text-2xl font-bold text-fg-primary">{statistics.newThisMonth}</div>
          </div>
          
          <div className="bg-brand-primary-light border border-surface-border rounded p-4">
            <div className="text-sm text-brand-primary">Owners</div>
            <div className="text-2xl font-bold text-fg-primary">{statistics.owners}</div>
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
      <div className="filter-bar mb-4">
        <div className="flex flex-wrap gap-4 mb-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="input max-w-[10rem]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="input max-w-[10rem]"
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
            className="input flex-1"
          />
        </div>

        <div className="text-sm text-fg-secondary">
          Showing {filteredResidents.length} of {residents.length} residents
        </div>
      </div>

      {/* Residents Table */}
      <div className="table-wrapper overflow-auto">
        <table className="table">
          <thead className="table-head">
            <tr>
              <th className="table-th">Resident</th>
              <th className="table-th">Villa</th>
              <th className="table-th">Type</th>
              <th className="table-th">Move-in Date</th>
              <th className="table-th">Status</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredResidents.map((resident) => (
              <tr key={resident.id} className="table-row">
                <td className="table-td">
                  <div>
                    <div className="font-medium text-fg-primary">{resident.name}</div>
                    {resident.username && (
                      <div className="text-xs text-fg-secondary font-mono">@{resident.username}</div>
                    )}
                    <div className="text-sm text-fg-secondary">{resident.email}</div>
                    {resident.phone && (
                      <div className="text-xs text-fg-secondary">{resident.phone}</div>
                    )}
                  </div>
                </td>
                <td className="table-td whitespace-nowrap">
                  {resident.villa ? (
                    <div>
                      <div className="font-medium text-fg-primary">
                        {resident.villa.villaNumber}
                      </div>
                      {resident.villa.block && (
                        <div className="text-xs text-fg-secondary">Block {resident.villa.block}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-fg-tertiary">No villa</span>
                  )}
                </td>
                <td className="table-td whitespace-nowrap">
                  <span
                    className={`badge ${
                      resident.type === "Owner"
                        ? "badge-primary"
                        : resident.type === "Family"
                          ? "badge-warning"
                          : "badge-info"
                    }`}
                  >
                    {resident.type}
                  </span>
                </td>
                <td className="table-td whitespace-nowrap">
                  <div className="text-sm text-fg-primary">{formatDate(resident.moveInDate)}</div>
                  {resident.isActive && resident.daysSinceMove > 0 && (
                    <div className="text-xs text-fg-secondary">{resident.daysSinceMove} days ago</div>
                  )}
                  {resident.moveOutDate && (
                    <div className="text-xs text-brand-danger">
                      Out: {formatDate(resident.moveOutDate)}
                    </div>
                  )}
                </td>
                <td className="table-td whitespace-nowrap">
                  <span
                    className={`badge ${
                      resident.isActive
                        ? "badge-success"
                        : "badge-gray"
                    }`}
                  >
                    {resident.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="table-td whitespace-nowrap text-sm">
                  {resident.isActive ? (
                    <button
                      onClick={() => handleMoveOut(resident)}
                      className="text-brand-danger hover:text-denied-fg font-medium"
                    >
                      Process Move-out
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(resident.id)}
                      className="text-brand-primary hover:text-info-fg font-medium"
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
          <div className="empty-state">
            <span className="empty-state-icon">🏠</span>
            <p className="empty-state-title">No residents found</p>
            <p className="empty-state-text">No residents match your current filters.</p>
          </div>
        )}
      </div>

      {/* Move-out Modal */}
      {showMoveOutModal && selectedResident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Process Move-out</h2>
            <div className="mb-4 p-3 bg-surface-background rounded">
              <div className="font-medium text-fg-primary">{selectedResident.name}</div>
              <div className="text-sm text-fg-secondary">{selectedResident.email}</div>
              {selectedResident.villa && (
                <div className="text-sm text-fg-secondary">
                  Villa: {selectedResident.villa.villaNumber}
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-2">
                  Move-out Date *
                </label>
                <input
                  type="date"
                  value={moveOutDate}
                  onChange={(e) => setMoveOutDate(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={moveOutReason}
                  onChange={(e) => setMoveOutReason(e.target.value)}
                  className="input"
                  placeholder="e.g., Lease ended, Moved to another property..."
                  rows={3}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={submitMoveOut}
                  disabled={loading}
                  className="btn btn-danger flex-1"
                >
                  {loading ? "Processing..." : "Confirm Move-out"}
                </button>
                <button
                  onClick={() => {
                    setShowMoveOutModal(false);
                    setMoveOutReason("");
                  }}
                  className="btn btn-ghost flex-1"
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
          <div className="bg-surface rounded-lg p-6">
            <div className="loading-spinner w-8 h-8 mx-auto"></div>
            <p className="loading-state-text mt-2">Loading...</p>
          </div>
        </div>
      )}
    </AppShell>
  );
}
