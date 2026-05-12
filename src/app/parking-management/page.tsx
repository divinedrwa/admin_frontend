"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function ParkingManagementPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "slots" | "villas">("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<any>(null);
  const [slotAnalysis, setSlotAnalysis] = useState<any>(null);
  const [villaVehicles, setVillaVehicles] = useState<any>(null);

  useEffect(() => {
    if (activeTab === "overview") fetchOverview();
    else if (activeTab === "slots") fetchSlotAnalysis();
    else if (activeTab === "villas") fetchVillaVehicles();
  }, [activeTab]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/parking-management/overview`);
      setOverview(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch overview");
    } finally {
      setLoading(false);
    }
  };

  const fetchSlotAnalysis = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/parking-management/slot-analysis`);
      setSlotAnalysis(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch slot analysis");
    } finally {
      setLoading(false);
    }
  };

  const fetchVillaVehicles = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/parking-management/villa-vehicles`);
      setVillaVehicles(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch villa vehicles");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-fg-primary mb-2">🅿️ Parking Management</h1>
          <p className="text-fg-secondary">Monitor and manage parking slots and vehicles</p>
        </div>

        <div className="tabs mb-6">
            {[
              { id: "overview", label: "📊 Overview" },
              { id: "slots", label: "🅿️ Slot Analysis" },
              { id: "villas", label: "🏘️ By Villa" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={activeTab === tab.id ? "tab tab-active" : "tab tab-inactive"}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {error && (
          <div className="bg-denied-bg border border-red-400 text-denied-fg px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="loading-spinner w-10 h-10"></div>
            <p className="loading-state-text">Loading data...</p>
          </div>
        )}

        {!loading && activeTab === "overview" && overview && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="stat-card">
                <p className="stat-card-label">Total Vehicles</p>
                <p className="stat-card-value text-brand-primary">{overview.summary.totalVehicles}</p>
              </div>
              <div className="stat-card">
                <p className="stat-card-label">Occupied Slots</p>
                <p className="stat-card-value text-approved-solid">{overview.summary.occupiedSlots}</p>
              </div>
              <div className="stat-card">
                <p className="stat-card-label">With Parking</p>
                <p className="stat-card-value text-brand-primary">{overview.summary.withSlots}</p>
              </div>
              <div className="stat-card">
                <p className="stat-card-label">Without Parking</p>
                <p className="stat-card-value text-brand-danger">{overview.summary.withoutSlots}</p>
              </div>
            </div>

            <div className="card mb-6">
              <div className="card-header"><h2 className="text-lg font-semibold">Vehicles by Type</h2></div>
              <div className="card-body">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(overview.typeBreakdown).map(([type, count]: any) => (
                  <div key={type} className="text-center p-4 bg-surface-background rounded">
                    <p className="text-2xl font-bold text-brand-primary">{count}</p>
                    <p className="text-sm text-fg-secondary">{type}</p>
                  </div>
                ))}
              </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h2 className="text-lg font-semibold">All Vehicles</h2></div>
              <div className="card-body">
              <div className="table-wrapper">
                <table className="table">
                  <thead className="table-head">
                    <tr>
                      <th className="table-th">Type</th>
                      <th className="table-th">Number</th>
                      <th className="table-th">Model</th>
                      <th className="table-th">Villa</th>
                      <th className="table-th">Parking Slot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.vehicles.map((vehicle: any) => (
                      <tr key={vehicle.id} className="table-row">
                        <td className="table-td">{vehicle.type}</td>
                        <td className="table-td font-mono font-semibold">{vehicle.registrationNumber}</td>
                        <td className="table-td">{vehicle.model || "-"}</td>
                        <td className="table-td">
                          {vehicle.villa ? `${vehicle.villa.villaNumber} (${vehicle.villa.ownerName})` : "N/A"}
                        </td>
                        <td className="table-td">
                          {vehicle.parkingSlot ? (
                            <span className="badge badge-info">
                              {vehicle.parkingSlot}
                            </span>
                          ) : (
                            <span className="text-fg-tertiary">Unassigned</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === "slots" && slotAnalysis && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="stat-card">
                <p className="stat-card-label">Total Slots</p>
                <p className="stat-card-value text-brand-primary">{slotAnalysis.summary.totalSlots}</p>
              </div>
              <div className="stat-card">
                <p className="stat-card-label">Occupied</p>
                <p className="stat-card-value text-brand-danger">{slotAnalysis.summary.occupiedSlots}</p>
              </div>
              <div className="stat-card">
                <p className="stat-card-label">Available</p>
                <p className="stat-card-value text-approved-solid">{slotAnalysis.summary.availableSlots}</p>
              </div>
              <div className="stat-card">
                <p className="stat-card-label">Unassigned Vehicles</p>
                <p className="stat-card-value text-orange-600">{slotAnalysis.summary.unassignedCount}</p>
              </div>
            </div>

            {slotAnalysis.unassignedVehicles.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-orange-800 mb-4">⚠️ Vehicles Without Parking Slots</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {slotAnalysis.unassignedVehicles.map((vehicle: any) => (
                    <div key={vehicle.id} className="bg-surface rounded p-4">
                      <p className="font-mono font-semibold text-lg">{vehicle.registrationNumber}</p>
                      <p className="text-sm text-fg-secondary">{vehicle.type} - {vehicle.model || "Unknown Model"}</p>
                      {vehicle.villa && (
                        <p className="text-xs text-fg-secondary mt-1">Villa: {vehicle.villa.villaNumber}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-header"><h2 className="text-lg font-semibold">Slot-by-Slot Analysis</h2></div>
              <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {slotAnalysis.slots.map((slot: any) => (
                  <div
                    key={slot.slot}
                    className={`border-2 rounded-lg p-4 ${
                      slot.status === "OCCUPIED"
                        ? "border-brand-danger bg-denied-bg"
                        : "border-approved-solid bg-approved-bg"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{slot.slot}</h3>
                      <span
                        className={`badge ${
                          slot.status === "OCCUPIED"
                            ? "badge-danger"
                            : "badge-success"
                        }`}
                      >
                        {slot.status}
                      </span>
                    </div>
                    {slot.vehicles.length > 0 ? (
                      <div className="space-y-2">
                        {slot.vehicles.map((vehicle: any) => (
                          <div key={vehicle.id} className="text-sm">
                            <p className="font-mono font-semibold">{vehicle.registrationNumber}</p>
                            <p className="text-xs text-fg-secondary">{vehicle.type}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-fg-secondary italic">Available</p>
                    )}
                  </div>
                ))}
              </div>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === "villas" && villaVehicles && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="stat-card">
                <p className="stat-card-label">Total Villas</p>
                <p className="stat-card-value text-brand-primary">{villaVehicles.summary.totalVillas}</p>
              </div>
              <div className="stat-card">
                <p className="stat-card-label">With Vehicles</p>
                <p className="stat-card-value text-approved-solid">{villaVehicles.summary.villasWithVehicles}</p>
              </div>
              <div className="stat-card">
                <p className="stat-card-label">Without Vehicles</p>
                <p className="stat-card-value text-fg-secondary">{villaVehicles.summary.villasWithoutVehicles}</p>
              </div>
              <div className="stat-card">
                <p className="stat-card-label">Avg per Villa</p>
                <p className="stat-card-value text-brand-primary">{villaVehicles.summary.avgVehiclesPerVilla}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {villaVehicles.villaVehicles.map((villa: any) => (
                <div key={villa.villaId} className="bg-surface rounded-lg shadow p-6 border-l-4 border-brand-primary">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-fg-primary">
                        Villa {villa.villaNumber}
                        {villa.block && ` (Block ${villa.block})`}
                      </h3>
                      <p className="text-sm text-fg-secondary">{villa.ownerName}</p>
                    </div>
                    <span className="badge badge-info font-semibold">
                      {villa.vehicleCount} {villa.vehicleCount === 1 ? "vehicle" : "vehicles"}
                    </span>
                  </div>

                  {villa.vehicles.length > 0 ? (
                    <div className="space-y-3">
                      {villa.vehicles.map((vehicle: any) => (
                        <div key={vehicle.id} className="bg-surface-background rounded p-3">
                          <p className="font-mono font-semibold text-fg-primary">{vehicle.registrationNumber}</p>
                          <p className="text-sm text-fg-secondary">
                            {vehicle.type} - {vehicle.model || "Unknown"}
                          </p>
                          {vehicle.parkingSlot && (
                            <p className="text-xs text-brand-primary mt-1">
                              🅿️ Slot: {vehicle.parkingSlot}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-fg-tertiary italic text-sm">No vehicles registered</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
