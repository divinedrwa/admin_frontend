"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { parseApiError } from "@/utils/errorHandler";
import { sortByVillaNumber } from "@/utils/villaSort";

interface StaffOverview {
  id: string;
  name: string;
  type: string;
  phone: string;
  idProof: string | null;
  isActive: boolean;
  totalAssignments: number;
  activeAssignments: number;
  villas: {
    villaId: string;
    villaNumber: string;
    block: string | null;
    ownerName: string;
    startDate: string;
  }[];
  lastAssignedAt: string | null;
}

interface VillaCoverage {
  id: string;
  villaNumber: string;
  block: string | null;
  ownerName: string;
  hasActiveResident: boolean;
  residentCount: number;
  staffCount: number;
  staff: {
    staffId: string;
    name: string;
    type: string;
    phone: string;
    startDate: string;
  }[];
}

interface WorkloadItem {
  staffId: string;
  name: string;
  type: string;
  villaCount: number;
}

interface UnassignedResources {
  unassignedStaff: {
    id: string;
    name: string;
    type: string;
    phone: string;
    createdAt: string;
    daysSinceCreation: number;
  }[];
  villasWithoutStaff: {
    occupied: {
      id: string;
      villaNumber: string;
      block: string | null;
      ownerName: string;
      hasActiveResident: boolean;
      residentCount: number;
      residents: { name: string; type: string }[];
    }[];
    vacant: Array<{
      id: string;
      villaNumber: string;
      block: string | null;
      ownerName: string;
    }>;
    total: number;
  };
  summary: {
    unassignedStaffCount: number;
    occupiedVillasWithoutStaff: number;
    vacantVillasWithoutStaff: number;
    totalVillasWithoutStaff: number;
  };
}

type StaffSummary = {
  totalStaff: number;
  activeStaff: number;
  assignedStaff: number;
  unassignedStaff: number;
};

type VillaSummary = {
  totalVillas: number;
  villasWithStaff: number;
  villasWithoutStaff: number;
  coveragePercentage: number;
};

type WorkloadSummary = {
  avgWorkload: number;
  overloaded: number;
  balanced: number;
  underutilized: number;
  unassigned: number;
};

type AssignmentStaff = UnassignedResources["unassignedStaff"][number];
type AssignmentVilla = UnassignedResources["villasWithoutStaff"]["occupied"][number];

export default function StaffAssignmentOverviewPage() {
  const [activeTab, setActiveTab] = useState<
    "staff" | "villas" | "workload" | "unassigned"
  >("staff");
  const [staffOverview, setStaffOverview] = useState<StaffOverview[]>([]);
  const [villaCoverage, setVillaCoverage] = useState<VillaCoverage[]>([]);
  const [workload, setWorkload] = useState<WorkloadItem[]>([]);
  const [unassignedResources, setUnassignedResources] =
    useState<UnassignedResources | null>(null);
  const [staffSummary, setStaffSummary] = useState<StaffSummary | null>(null);
  const [villaSummary, setVillaSummary] = useState<VillaSummary | null>(null);
  const [workloadSummary, setWorkloadSummary] = useState<WorkloadSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<AssignmentStaff | null>(null);
  const [selectedVilla, setSelectedVilla] = useState<AssignmentVilla | null>(null);
  const [assignmentAction, setAssignmentAction] = useState<
    "assign" | "unassign"
  >("assign");

  useEffect(() => {
    if (activeTab === "staff") {
      fetchStaffOverview();
    } else if (activeTab === "villas") {
      fetchVillaCoverage();
    } else if (activeTab === "workload") {
      fetchWorkload();
    } else if (activeTab === "unassigned") {
      fetchUnassignedResources();
    }
  }, [activeTab]);

  const fetchStaffOverview = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/staff-assignment-overview/staff-overview`);
      const list = (response.data.staff ?? []) as StaffOverview[];
      setStaffOverview(
        list.map((s) => ({
          ...s,
          villas: sortByVillaNumber(s.villas ?? [], (v) => v.villaNumber),
        })),
      );
      setStaffSummary(response.data.summary);
    } catch (err: unknown) {
      setError(parseApiError(err, "Failed to fetch staff overview").message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVillaCoverage = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/staff-assignment-overview/villa-coverage`);
      setVillaCoverage(
        sortByVillaNumber(
          (response.data.villas ?? []) as VillaCoverage[],
          (v) => v.villaNumber,
        ),
      );
      setVillaSummary(response.data.summary);
    } catch (err: unknown) {
      setError(parseApiError(err, "Failed to fetch villa coverage").message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkload = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/staff-assignment-overview/workload-distribution`);
      setWorkload(response.data.workload);
      setWorkloadSummary(response.data.summary);
    } catch (err: unknown) {
      setError(parseApiError(err, "Failed to fetch workload distribution").message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnassignedResources = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/staff-assignment-overview/unassigned-resources`);
      const data = response.data as UnassignedResources;
      setUnassignedResources({
        ...data,
        villasWithoutStaff: {
          ...data.villasWithoutStaff,
          occupied: sortByVillaNumber(
            data.villasWithoutStaff?.occupied ?? [],
            (v) => v.villaNumber,
          ),
          vacant: sortByVillaNumber(
            data.villasWithoutStaff?.vacant ?? [],
            (v) => v.villaNumber,
          ),
        },
      });
    } catch (err: unknown) {
      setError(parseApiError(err, "Failed to fetch unassigned resources").message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAssign = async () => {
    if (!selectedStaff || !selectedVilla) {
      showToast("Please select staff and villa", "error");
      return;
    }

    try {
      const response = await api.post(`/staff-assignment-overview/quick-assign`, {
        staffId: selectedStaff.id,
        villaId: selectedVilla.id,
        action: assignmentAction,
      });

      showToast(response.data.message, "success");
      setShowAssignModal(false);
      setSelectedStaff(null);
      setSelectedVilla(null);

      // Refresh data
      if (activeTab === "staff") fetchStaffOverview();
      if (activeTab === "villas") fetchVillaCoverage();
      if (activeTab === "unassigned") fetchUnassignedResources();
    } catch (err: unknown) {
      showToast(parseApiError(err, "Failed to update assignment").message, "error");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-surface-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-fg-primary mb-2">
            👷 Staff Assignment Overview
          </h1>
          <p className="text-fg-secondary">
            Manage staff assignments, monitor workload, and optimize coverage
          </p>
        </div>

        {/* Tabs */}
        <div className="tabs mb-6">
            <button
              onClick={() => setActiveTab("staff")}
              className={activeTab === "staff" ? "tab tab-active" : "tab tab-inactive"}
            >
              👤 Staff Overview
            </button>
            <button
              onClick={() => setActiveTab("villas")}
              className={activeTab === "villas" ? "tab tab-active" : "tab tab-inactive"}
            >
              🏘️ Villa Coverage
            </button>
            <button
              onClick={() => setActiveTab("workload")}
              className={activeTab === "workload" ? "tab tab-active" : "tab tab-inactive"}
            >
              📊 Workload
            </button>
            <button
              onClick={() => setActiveTab("unassigned")}
              className={activeTab === "unassigned" ? "tab tab-active" : "tab tab-inactive"}
            >
              ⚠️ Unassigned
            </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-denied-bg border border-denied-bg text-denied-fg px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner w-10 h-10"></div>
            <p className="loading-state-text">Loading data...</p>
          </div>
        )}

        {/* Staff Overview Tab */}
        {!loading && activeTab === "staff" && (
          <div>
            {/* Summary Cards */}
            {staffSummary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="stat-card">
                  <p className="stat-card-label">Total Staff</p>
                  <p className="stat-card-value text-brand-primary">
                    {staffSummary.totalStaff}
                  </p>
                </div>
                <div className="stat-card">
                  <p className="stat-card-label">Active Staff</p>
                  <p className="stat-card-value text-approved-solid">
                    {staffSummary.activeStaff}
                  </p>
                </div>
                <div className="stat-card">
                  <p className="stat-card-label">Assigned Staff</p>
                  <p className="stat-card-value text-brand-primary">
                    {staffSummary.assignedStaff}
                  </p>
                </div>
                <div className="stat-card">
                  <p className="stat-card-label">Unassigned</p>
                  <p className="stat-card-value text-pending-fg">
                    {staffSummary.unassignedStaff}
                  </p>
                </div>
              </div>
            )}

            {/* Staff Grid */}
            {staffOverview.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">👷</span>
                <p className="empty-state-title">No staff found</p>
                <p className="empty-state-text">Staff members will appear here once added.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staffOverview.map((staff) => (
                  <div
                    key={staff.id}
                    className="bg-surface rounded-lg shadow-lg p-6 border-l-4 border-brand-primary"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-fg-primary">
                          {staff.name}
                        </h3>
                        <p className="text-sm text-fg-secondary">{staff.type}</p>
                        <p className="text-xs text-fg-secondary">📞 {staff.phone}</p>
                      </div>
                      <span
                        className={`badge ${
                          staff.isActive
                            ? "badge-success"
                            : "badge-gray"
                        }`}
                      >
                        {staff.isActive ? "✅ Active" : "⛔ Inactive"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
                      <div>
                        <p className="text-xs text-fg-secondary">Total Assignments</p>
                        <p className="text-2xl font-bold text-fg-primary">
                          {staff.totalAssignments}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-fg-secondary">Active Now</p>
                        <p className="text-2xl font-bold text-brand-primary">
                          {staff.activeAssignments}
                        </p>
                      </div>
                    </div>

                    {/* Assigned Villas */}
                    {staff.villas.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold text-fg-secondary mb-2">
                          ASSIGNED VILLAS:
                        </p>
                        <div className="space-y-2">
                          {staff.villas.map((villa) => (
                            <div
                              key={villa.villaId}
                              className="bg-surface-background p-2 rounded text-sm"
                            >
                              <p className="font-medium text-fg-primary">
                                Villa {villa.villaNumber}
                                {villa.block && ` (Block ${villa.block})`}
                              </p>
                              <p className="text-xs text-fg-secondary">
                                {villa.ownerName}
                              </p>
                              <p className="text-xs text-fg-secondary">
                                Since: {formatDate(villa.startDate)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-fg-tertiary italic text-sm">
                        No active assignments
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Villa Coverage Tab */}
        {!loading && activeTab === "villas" && (
          <div>
            {/* Summary Cards */}
            {villaSummary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="stat-card">
                  <p className="stat-card-label">Total Villas</p>
                  <p className="stat-card-value text-brand-primary">
                    {villaSummary.totalVillas}
                  </p>
                </div>
                <div className="stat-card">
                  <p className="stat-card-label">With Staff</p>
                  <p className="stat-card-value text-approved-solid">
                    {villaSummary.villasWithStaff}
                  </p>
                </div>
                <div className="stat-card">
                  <p className="stat-card-label">Without Staff</p>
                  <p className="stat-card-value text-brand-danger">
                    {villaSummary.villasWithoutStaff}
                  </p>
                </div>
                <div className="stat-card">
                  <p className="stat-card-label">Coverage</p>
                  <p className="stat-card-value text-brand-primary">
                    {villaSummary.coveragePercentage}%
                  </p>
                </div>
              </div>
            )}

            {/* Villa Grid */}
            {villaCoverage.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">🏘️</span>
                <p className="empty-state-title">No villas found</p>
                <p className="empty-state-text">Villas will appear here once configured.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {villaCoverage.map((villa) => (
                  <div
                    key={villa.id}
                    className={`bg-surface rounded-lg shadow-lg p-6 border-l-4 ${
                      villa.staffCount > 0
                        ? "border-approved-solid"
                        : villa.hasActiveResident
                        ? "border-brand-danger"
                        : "border-fg-tertiary"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-fg-primary">
                          Villa {villa.villaNumber}
                          {villa.block && ` (Block ${villa.block})`}
                        </h3>
                        <p className="text-sm text-fg-secondary">{villa.ownerName}</p>
                      </div>
                      <span
                        className={`badge ${
                          villa.hasActiveResident
                            ? "badge-success"
                            : "badge-gray"
                        }`}
                      >
                        {villa.hasActiveResident ? "Occupied" : "Vacant"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
                      <div>
                        <p className="text-xs text-fg-secondary">Residents</p>
                        <p className="text-2xl font-bold text-fg-primary">
                          {villa.residentCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-fg-secondary">Staff Assigned</p>
                        <p className="text-2xl font-bold text-brand-primary">
                          {villa.staffCount}
                        </p>
                      </div>
                    </div>

                    {/* Assigned Staff */}
                    {villa.staff.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold text-fg-secondary mb-2">
                          ASSIGNED STAFF:
                        </p>
                        <div className="space-y-2">
                          {villa.staff.map((staff) => (
                            <div
                              key={staff.staffId}
                              className="bg-surface-background p-2 rounded text-sm"
                            >
                              <p className="font-medium text-fg-primary">
                                {staff.name}
                              </p>
                              <p className="text-xs text-fg-secondary">{staff.type}</p>
                              <p className="text-xs text-fg-secondary">
                                📞 {staff.phone}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-brand-danger font-medium text-sm mb-2">
                          ⚠️ No staff assigned
                        </p>
                        {villa.hasActiveResident && (
                          <p className="text-xs text-brand-danger">
                            Action Required: Villa is occupied
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Workload Tab */}
        {!loading && activeTab === "workload" && (
          <div>
            {/* Summary Cards */}
            {workloadSummary && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="stat-card">
                  <p className="stat-card-label">Avg Workload</p>
                  <p className="stat-card-value text-brand-primary">
                    {workloadSummary.avgWorkload}
                  </p>
                  <p className="text-xs text-fg-secondary">villas/staff</p>
                </div>
                <div className="stat-card">
                  <p className="stat-card-label">Overloaded</p>
                  <p className="stat-card-value text-brand-danger">
                    {workloadSummary.overloaded}
                  </p>
                  <p className="text-xs text-fg-secondary">&gt; 5 villas</p>
                </div>
                <div className="stat-card">
                  <p className="stat-card-label">Balanced</p>
                  <p className="stat-card-value text-approved-solid">
                    {workloadSummary.balanced}
                  </p>
                  <p className="text-xs text-fg-secondary">2-5 villas</p>
                </div>
                <div className="stat-card">
                  <p className="stat-card-label">Underutilized</p>
                  <p className="stat-card-value text-pending-solid">
                    {workloadSummary.underutilized}
                  </p>
                  <p className="text-xs text-fg-secondary">1 villa</p>
                </div>
                <div className="stat-card">
                  <p className="stat-card-label">Unassigned</p>
                  <p className="stat-card-value text-fg-secondary">
                    {workloadSummary.unassigned}
                  </p>
                  <p className="text-xs text-fg-secondary">0 villas</p>
                </div>
              </div>
            )}

            {/* Workload List */}
            {workload.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">📊</span>
                <p className="empty-state-title">No workload data</p>
                <p className="empty-state-text">Workload distribution will appear once staff are assigned.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead className="table-head">
                    <tr>
                      <th className="table-th">
                        Staff Name
                      </th>
                      <th className="table-th">
                        Type
                      </th>
                      <th className="table-th">
                        Villa Count
                      </th>
                      <th className="table-th">
                        Workload Status
                      </th>
                      <th className="table-th">
                        Visual
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {workload.map((item) => (
                      <tr key={item.staffId} className="table-row">
                        <td className="table-td">
                          <div className="font-medium text-fg-primary">
                            {item.name}
                          </div>
                        </td>
                        <td className="table-td">
                          <span className="text-sm text-fg-secondary">
                            {item.type}
                          </span>
                        </td>
                        <td className="table-td">
                          <span className="text-2xl font-bold text-brand-primary">
                            {item.villaCount}
                          </span>
                        </td>
                        <td className="table-td">
                          <span
                            className={`badge ${
                              item.villaCount === 0
                                ? "badge-gray"
                                : item.villaCount === 1
                                ? "badge-warning"
                                : item.villaCount <= 5
                                ? "badge-success"
                                : "badge-danger"
                            }`}
                          >
                            {item.villaCount === 0
                              ? "Unassigned"
                              : item.villaCount === 1
                              ? "Underutilized"
                              : item.villaCount <= 5
                              ? "Balanced"
                              : "Overloaded"}
                          </span>
                        </td>
                        <td className="table-td">
                          <div className="w-full bg-surface-elevated rounded h-4">
                            <div
                              className={`h-4 rounded ${
                                item.villaCount === 0
                                  ? "bg-fg-tertiary"
                                  : item.villaCount === 1
                                  ? "bg-pending-solid"
                                  : item.villaCount <= 5
                                  ? "bg-approved-solid"
                                  : "bg-brand-danger"
                              }`}
                              style={{
                                width: `${Math.min((item.villaCount / 10) * 100, 100)}%`,
                              }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Unassigned Resources Tab */}
        {!loading && activeTab === "unassigned" && unassignedResources && (
          <div>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="stat-card">
                <p className="stat-card-label">Unassigned Staff</p>
                  <p className="stat-card-value text-pending-fg">
                  {unassignedResources.summary.unassignedStaffCount}
                </p>
              </div>
              <div className="stat-card">
                <p className="stat-card-label">
                  Occupied Villas (No Staff)
                </p>
                <p className="stat-card-value text-brand-danger">
                  {unassignedResources.summary.occupiedVillasWithoutStaff}
                </p>
              </div>
              <div className="stat-card">
                <p className="stat-card-label">
                  Vacant Villas (No Staff)
                </p>
                <p className="stat-card-value text-fg-secondary">
                  {unassignedResources.summary.vacantVillasWithoutStaff}
                </p>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Unassigned Staff */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold">
                    👤 Unassigned Staff ({unassignedResources.unassignedStaff.length})
                  </h2>
                </div>
                <div className="card-body">
                {unassignedResources.unassignedStaff.length === 0 ? (
                  <p className="text-fg-secondary italic">All staff are assigned</p>
                ) : (
                  <div className="space-y-3">
                    {unassignedResources.unassignedStaff.map((staff) => (
                      <div
                        key={staff.id}
                        className="bg-pending-bg border border-pending-bg rounded p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-fg-primary">
                              {staff.name}
                            </p>
                            <p className="text-sm text-fg-secondary">{staff.type}</p>
                            <p className="text-xs text-fg-secondary">
                              📞 {staff.phone}
                            </p>
                            <p className="text-xs text-fg-secondary mt-1">
                              Added {staff.daysSinceCreation} days ago
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedStaff(staff);
                              setAssignmentAction("assign");
                              setShowAssignModal(true);
                            }}
                            className="btn btn-primary text-sm"
                          >
                            Assign
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>

              {/* Villas Without Staff (Occupied - Priority) */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold mb-4">
                  🏘️ Occupied Villas Without Staff (
                  {unassignedResources.villasWithoutStaff.occupied.length})
                </h2>
                {unassignedResources.villasWithoutStaff.occupied.length === 0 ? (
                  <p className="text-fg-secondary italic">
                    All occupied villas have staff
                  </p>
                ) : (
                  <div className="space-y-3">
                    {unassignedResources.villasWithoutStaff.occupied.map(
                      (villa) => (
                        <div
                          key={villa.id}
                          className="bg-denied-bg border border-denied-bg rounded p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-fg-primary">
                                Villa {villa.villaNumber}
                                {villa.block && ` (Block ${villa.block})`}
                              </p>
                              <p className="text-sm text-fg-secondary">
                                {villa.ownerName}
                              </p>
                              <p className="text-xs text-approved-solid mt-1">
                                ✅ {villa.residentCount} resident(s)
                              </p>
                              {villa.residents.length > 0 && (
                                <p className="text-xs text-fg-secondary">
                                  {villa.residents
                                    .map((r) => r.name)
                                    .join(", ")}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setSelectedVilla(villa);
                                setAssignmentAction("assign");
                                setShowAssignModal(true);
                              }}
                              className="btn btn-primary text-sm"
                            >
                              Assign Staff
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card w-full max-w-md">
            <div className="card-header"><h3 className="text-lg font-semibold">Quick Assignment</h3></div>
            <div className="card-body">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">
                  Staff
                </label>
                {selectedStaff ? (
                  <div className="bg-surface-background p-3 rounded">
                    <p className="font-medium">{selectedStaff.name}</p>
                    <p className="text-sm text-fg-secondary">{selectedStaff.type}</p>
                  </div>
                ) : (
                  <p className="text-fg-secondary italic">Select staff from list</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">
                  Villa
                </label>
                {selectedVilla ? (
                  <div className="bg-surface-background p-3 rounded">
                    <p className="font-medium">
                      Villa {selectedVilla.villaNumber}
                    </p>
                    <p className="text-sm text-fg-secondary">
                      {selectedVilla.ownerName}
                    </p>
                  </div>
                ) : (
                  <p className="text-fg-secondary italic">Select villa from list</p>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedStaff(null);
                  setSelectedVilla(null);
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickAssign}
                className="btn btn-primary"
              >
                Assign
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
