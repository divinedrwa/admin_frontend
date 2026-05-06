"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/components/Toast";
import { api } from "@/lib/api";

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
    vacant: any[];
    total: number;
  };
  summary: {
    unassignedStaffCount: number;
    occupiedVillasWithoutStaff: number;
    vacantVillasWithoutStaff: number;
    totalVillasWithoutStaff: number;
  };
}

export default function StaffAssignmentOverviewPage() {
  const [activeTab, setActiveTab] = useState<
    "staff" | "villas" | "workload" | "unassigned"
  >("staff");
  const [staffOverview, setStaffOverview] = useState<StaffOverview[]>([]);
  const [villaCoverage, setVillaCoverage] = useState<VillaCoverage[]>([]);
  const [workload, setWorkload] = useState<WorkloadItem[]>([]);
  const [unassignedResources, setUnassignedResources] =
    useState<UnassignedResources | null>(null);
  const [staffSummary, setStaffSummary] = useState<any>(null);
  const [villaSummary, setVillaSummary] = useState<any>(null);
  const [workloadSummary, setWorkloadSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [selectedVilla, setSelectedVilla] = useState<any>(null);
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
      setStaffOverview(response.data.staff);
      setStaffSummary(response.data.summary);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch staff overview");
    } finally {
      setLoading(false);
    }
  };

  const fetchVillaCoverage = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/staff-assignment-overview/villa-coverage`);
      setVillaCoverage(response.data.villas);
      setVillaSummary(response.data.summary);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch villa coverage");
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
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to fetch workload distribution"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchUnassignedResources = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/staff-assignment-overview/unassigned-resources`);
      setUnassignedResources(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to fetch unassigned resources"
      );
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
    } catch (err: any) {
      showToast(
        err.response?.data?.message || "Failed to update assignment",
        "error"
      );
    }
  };

  const getWorkloadColor = (count: number) => {
    if (count === 0) return "bg-gray-100 text-gray-800";
    if (count === 1) return "bg-yellow-100 text-yellow-800";
    if (count <= 5) return "bg-green-100 text-green-800";
    return "bg-red-100 text-red-800";
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            👷 Staff Assignment Overview
          </h1>
          <p className="text-gray-600">
            Manage staff assignments, monitor workload, and optimize coverage
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("staff")}
              className={`px-6 py-3 font-medium ${
                activeTab === "staff"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              👤 Staff Overview
            </button>
            <button
              onClick={() => setActiveTab("villas")}
              className={`px-6 py-3 font-medium ${
                activeTab === "villas"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              🏘️ Villa Coverage
            </button>
            <button
              onClick={() => setActiveTab("workload")}
              className={`px-6 py-3 font-medium ${
                activeTab === "workload"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📊 Workload
            </button>
            <button
              onClick={() => setActiveTab("unassigned")}
              className={`px-6 py-3 font-medium ${
                activeTab === "unassigned"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              ⚠️ Unassigned
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading data...</p>
          </div>
        )}

        {/* Staff Overview Tab */}
        {!loading && activeTab === "staff" && (
          <div>
            {/* Summary Cards */}
            {staffSummary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">Total Staff</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {staffSummary.totalStaff}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">Active Staff</p>
                  <p className="text-3xl font-bold text-green-600">
                    {staffSummary.activeStaff}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">Assigned Staff</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {staffSummary.assignedStaff}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">Unassigned</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {staffSummary.unassignedStaff}
                  </p>
                </div>
              </div>
            )}

            {/* Staff Grid */}
            {staffOverview.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No staff found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staffOverview.map((staff) => (
                  <div
                    key={staff.id}
                    className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {staff.name}
                        </h3>
                        <p className="text-sm text-gray-600">{staff.type}</p>
                        <p className="text-xs text-gray-500">📞 {staff.phone}</p>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs rounded-full ${
                          staff.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {staff.isActive ? "✅ Active" : "⛔ Inactive"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
                      <div>
                        <p className="text-xs text-gray-500">Total Assignments</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {staff.totalAssignments}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Active Now</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {staff.activeAssignments}
                        </p>
                      </div>
                    </div>

                    {/* Assigned Villas */}
                    {staff.villas.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">
                          ASSIGNED VILLAS:
                        </p>
                        <div className="space-y-2">
                          {staff.villas.map((villa) => (
                            <div
                              key={villa.villaId}
                              className="bg-gray-50 p-2 rounded text-sm"
                            >
                              <p className="font-medium text-gray-900">
                                Villa {villa.villaNumber}
                                {villa.block && ` (Block ${villa.block})`}
                              </p>
                              <p className="text-xs text-gray-600">
                                {villa.ownerName}
                              </p>
                              <p className="text-xs text-gray-500">
                                Since: {formatDate(villa.startDate)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-400 italic text-sm">
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
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">Total Villas</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {villaSummary.totalVillas}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">With Staff</p>
                  <p className="text-3xl font-bold text-green-600">
                    {villaSummary.villasWithStaff}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">Without Staff</p>
                  <p className="text-3xl font-bold text-red-600">
                    {villaSummary.villasWithoutStaff}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">Coverage</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {villaSummary.coveragePercentage}%
                  </p>
                </div>
              </div>
            )}

            {/* Villa Grid */}
            {villaCoverage.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No villas found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {villaCoverage.map((villa) => (
                  <div
                    key={villa.id}
                    className={`bg-white rounded-lg shadow-lg p-6 border-l-4 ${
                      villa.staffCount > 0
                        ? "border-green-600"
                        : villa.hasActiveResident
                        ? "border-red-600"
                        : "border-gray-400"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          Villa {villa.villaNumber}
                          {villa.block && ` (Block ${villa.block})`}
                        </h3>
                        <p className="text-sm text-gray-600">{villa.ownerName}</p>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs rounded-full ${
                          villa.hasActiveResident
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {villa.hasActiveResident ? "Occupied" : "Vacant"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
                      <div>
                        <p className="text-xs text-gray-500">Residents</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {villa.residentCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Staff Assigned</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {villa.staffCount}
                        </p>
                      </div>
                    </div>

                    {/* Assigned Staff */}
                    {villa.staff.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">
                          ASSIGNED STAFF:
                        </p>
                        <div className="space-y-2">
                          {villa.staff.map((staff) => (
                            <div
                              key={staff.staffId}
                              className="bg-gray-50 p-2 rounded text-sm"
                            >
                              <p className="font-medium text-gray-900">
                                {staff.name}
                              </p>
                              <p className="text-xs text-gray-600">{staff.type}</p>
                              <p className="text-xs text-gray-500">
                                📞 {staff.phone}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-red-600 font-medium text-sm mb-2">
                          ⚠️ No staff assigned
                        </p>
                        {villa.hasActiveResident && (
                          <p className="text-xs text-red-500">
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
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">Avg Workload</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {workloadSummary.avgWorkload}
                  </p>
                  <p className="text-xs text-gray-500">villas/staff</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">Overloaded</p>
                  <p className="text-3xl font-bold text-red-600">
                    {workloadSummary.overloaded}
                  </p>
                  <p className="text-xs text-gray-500">&gt; 5 villas</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">Balanced</p>
                  <p className="text-3xl font-bold text-green-600">
                    {workloadSummary.balanced}
                  </p>
                  <p className="text-xs text-gray-500">2-5 villas</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">Underutilized</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {workloadSummary.underutilized}
                  </p>
                  <p className="text-xs text-gray-500">1 villa</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">Unassigned</p>
                  <p className="text-3xl font-bold text-gray-600">
                    {workloadSummary.unassigned}
                  </p>
                  <p className="text-xs text-gray-500">0 villas</p>
                </div>
              </div>
            )}

            {/* Workload List */}
            {workload.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No workload data</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Staff Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Villa Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Workload Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Visual
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {workload.map((item) => (
                      <tr key={item.staffId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {item.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-2xl font-bold text-blue-600">
                            {item.villaCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 text-xs rounded-full ${getWorkloadColor(
                              item.villaCount
                            )}`}
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
                        <td className="px-6 py-4">
                          <div className="w-full bg-gray-200 rounded h-4">
                            <div
                              className={`h-4 rounded ${
                                item.villaCount === 0
                                  ? "bg-gray-400"
                                  : item.villaCount === 1
                                  ? "bg-yellow-500"
                                  : item.villaCount <= 5
                                  ? "bg-green-500"
                                  : "bg-red-500"
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
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Unassigned Staff</p>
                <p className="text-3xl font-bold text-orange-600">
                  {unassignedResources.summary.unassignedStaffCount}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">
                  Occupied Villas (No Staff)
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {unassignedResources.summary.occupiedVillasWithoutStaff}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">
                  Vacant Villas (No Staff)
                </p>
                <p className="text-3xl font-bold text-gray-600">
                  {unassignedResources.summary.vacantVillasWithoutStaff}
                </p>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Unassigned Staff */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">
                  👤 Unassigned Staff ({unassignedResources.unassignedStaff.length})
                </h2>
                {unassignedResources.unassignedStaff.length === 0 ? (
                  <p className="text-gray-500 italic">All staff are assigned</p>
                ) : (
                  <div className="space-y-3">
                    {unassignedResources.unassignedStaff.map((staff) => (
                      <div
                        key={staff.id}
                        className="bg-orange-50 border border-orange-200 rounded p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              {staff.name}
                            </p>
                            <p className="text-sm text-gray-600">{staff.type}</p>
                            <p className="text-xs text-gray-500">
                              📞 {staff.phone}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Added {staff.daysSinceCreation} days ago
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedStaff(staff);
                              setAssignmentAction("assign");
                              setShowAssignModal(true);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Assign
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Villas Without Staff (Occupied - Priority) */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">
                  🏘️ Occupied Villas Without Staff (
                  {unassignedResources.villasWithoutStaff.occupied.length})
                </h2>
                {unassignedResources.villasWithoutStaff.occupied.length === 0 ? (
                  <p className="text-gray-500 italic">
                    All occupied villas have staff
                  </p>
                ) : (
                  <div className="space-y-3">
                    {unassignedResources.villasWithoutStaff.occupied.map(
                      (villa) => (
                        <div
                          key={villa.id}
                          className="bg-red-50 border border-red-200 rounded p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">
                                Villa {villa.villaNumber}
                                {villa.block && ` (Block ${villa.block})`}
                              </p>
                              <p className="text-sm text-gray-600">
                                {villa.ownerName}
                              </p>
                              <p className="text-xs text-green-600 mt-1">
                                ✅ {villa.residentCount} resident(s)
                              </p>
                              {villa.residents.length > 0 && (
                                <p className="text-xs text-gray-500">
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
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Quick Assignment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Staff
                </label>
                {selectedStaff ? (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium">{selectedStaff.name}</p>
                    <p className="text-sm text-gray-600">{selectedStaff.type}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Select staff from list</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Villa
                </label>
                {selectedVilla ? (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium">
                      Villa {selectedVilla.villaNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedVilla.ownerName}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Select villa from list</p>
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
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickAssign}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
