"use client";

import {
  ArrowLeftRight,
  Building2,
  Home,
  Percent,
  UserCheck,
  UserRoundCheck,
  UserX,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
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

  const statCards = statistics
    ? [
        {
          label: "Total residents",
          value: statistics.totalResidents,
          sub: "All profiles",
          icon: Users,
          tone: "bg-brand-primary-light text-brand-primary",
        },
        {
          label: "Active",
          value: statistics.activeResidents,
          sub: `${statistics.occupancyRate}% occupancy`,
          icon: UserCheck,
          tone: "bg-approved-bg text-approved-fg",
        },
        {
          label: "Inactive",
          value: statistics.inactiveResidents,
          sub: "Move-out completed",
          icon: UserX,
          tone: "bg-surface-elevated text-fg-primary",
        },
        {
          label: "New this month",
          value: statistics.newThisMonth,
          sub: "Recent onboarding",
          icon: UserRoundCheck,
          tone: "bg-info-bg text-info-fg",
        },
        {
          label: "Owners",
          value: statistics.owners,
          sub: "Primary occupancy",
          icon: Home,
          tone: "bg-brand-primary-light text-brand-primary",
        },
        {
          label: "Tenants",
          value: statistics.tenants,
          sub: "Active tenant profiles",
          icon: Building2,
          tone: "bg-info-bg text-info-fg",
        },
        {
          label: "Moved out",
          value: statistics.movedOutThisMonth,
          sub: "This month",
          icon: ArrowLeftRight,
          tone: "bg-pending-bg text-pending-fg",
        },
        {
          label: "Occupancy rate",
          value: `${statistics.occupancyRate}%`,
          sub: "Across configured villas",
          icon: Percent,
          tone: "bg-approved-bg text-approved-fg",
        },
      ]
    : [];

  return (
    <AppShell title="Resident Management Dashboard">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Resident directory"
          title="Resident management"
          description="Review occupancy, resident status, onboarding trends, and move-out actions from one consistent control surface."
          icon={<Users className="h-6 w-6" />}
        />

        {/* Summary Statistics */}
        {statistics && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="stat-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${stat.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-fg-secondary">{stat.sub}</span>
                  </div>
                  <div className="mt-4 text-2xl font-bold text-fg-primary">{stat.value}</div>
                  <div className="mt-1 text-sm text-fg-secondary">{stat.label}</div>
                </div>
              );
            })}
          </div>
        )}

      {/* Filters */}
      <div className="filter-bar">
        <div className="flex flex-wrap gap-4 mb-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            className="input max-w-[10rem]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | "owner" | "tenant")}
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
      </div>
    </AppShell>
  );
}
