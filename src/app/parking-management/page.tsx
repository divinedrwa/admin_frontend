"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { sortByVillaNumber } from "@/utils/villaSort";
import { parseApiError } from "@/utils/errorHandler";

type ParkingTab = "overview" | "slots" | "villas";

type VehicleRecord = {
  id: string;
  type: string;
  registrationNumber: string;
  model?: string | null;
  parkingSlot?: string | null;
  villa?: {
    villaNumber: string;
    ownerName: string;
  } | null;
};

type ParkingOverview = {
  summary: {
    totalVehicles: number;
    occupiedSlots: number;
    withSlots: number;
    withoutSlots: number;
  };
  typeBreakdown: Record<string, number>;
  vehicles: VehicleRecord[];
};

type SlotVehicle = {
  id: string;
  type: string;
  registrationNumber: string;
};

type SlotAnalysis = {
  summary: {
    totalSlots: number;
    occupiedSlots: number;
    availableSlots: number;
    unassignedCount: number;
  };
  unassignedVehicles: VehicleRecord[];
  slots: Array<{
    slot: string;
    status: "OCCUPIED" | "AVAILABLE";
    vehicles: SlotVehicle[];
  }>;
};

type VillaVehicleGroup = {
  villaId: string;
  villaNumber: string;
  block?: string | null;
  ownerName: string;
  vehicleCount: number;
  vehicles: VehicleRecord[];
};

type VillaVehicles = {
  summary: {
    totalVillas: number;
    villasWithVehicles: number;
    villasWithoutVehicles: number;
    avgVehiclesPerVilla: number;
  };
  villaVehicles: VillaVehicleGroup[];
};

export default function ParkingManagementPage() {
  const [activeTab, setActiveTab] = useState<ParkingTab>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<ParkingOverview | null>(null);
  const [slotAnalysis, setSlotAnalysis] = useState<SlotAnalysis | null>(null);
  const [villaVehicles, setVillaVehicles] = useState<VillaVehicles | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (activeTab === "overview") fetchOverview(controller.signal);
    else if (activeTab === "slots") fetchSlotAnalysis(controller.signal);
    else if (activeTab === "villas") fetchVillaVehicles(controller.signal);
    return () => controller.abort();
  }, [activeTab]);

  const fetchOverview = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/parking-management/overview`, { signal });
      setOverview(response.data);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "CanceledError") return;
      setError(parseApiError(err, "Failed to fetch overview").message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSlotAnalysis = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/parking-management/slot-analysis`, { signal });
      setSlotAnalysis(response.data);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "CanceledError") return;
      setError(parseApiError(err, "Failed to fetch slot analysis").message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVillaVehicles = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/parking-management/villa-vehicles`, { signal });
      const data = response.data as VillaVehicles;
      setVillaVehicles({
        ...data,
        villaVehicles: sortByVillaNumber(
          data.villaVehicles ?? [],
          (v) => v.villaNumber,
        ),
      });
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "CanceledError") return;
      setError(parseApiError(err, "Failed to fetch villa vehicles").message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Parking Management">
      <div className="space-y-6">

        <div className="tabs mb-6">
            {[
              { id: "overview", label: "📊 Overview" },
              { id: "slots", label: "🅿️ Slot Analysis" },
              { id: "villas", label: "🏘️ By Villa" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ParkingTab)}
                className={activeTab === tab.id ? "tab tab-active" : "tab tab-inactive"}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {error && (
          <div className="bg-denied-bg border border-denied-bg text-denied-fg px-4 py-3 rounded mb-4">
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
                {Object.entries(overview.typeBreakdown).map(([type, count]) => (
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
                      <th scope="col" className="table-th">Type</th>
                      <th scope="col" className="table-th">Number</th>
                      <th scope="col" className="table-th">Model</th>
                      <th scope="col" className="table-th">Villa</th>
                      <th scope="col" className="table-th">Parking Slot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.vehicles.map((vehicle) => (
                      <tr key={vehicle.id} className="table-row">
                        <td className="table-td">{vehicle.type}</td>
                        <td className="table-td font-mono font-semibold">{vehicle.registrationNumber}</td>
                        <td className="table-td">{vehicle.model && vehicle.model !== "Unknown" ? vehicle.model : "-"}</td>
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
                <p className="stat-card-value text-pending-fg">{slotAnalysis.summary.unassignedCount}</p>
              </div>
            </div>

            {slotAnalysis.unassignedVehicles.length > 0 && (
              <div className="bg-pending-bg border border-pending-bg rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-pending-fg mb-4">⚠️ Vehicles Without Parking Slots</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {slotAnalysis.unassignedVehicles.map((vehicle) => (
                    <div key={vehicle.id} className="bg-surface rounded p-4">
                      <p className="font-mono font-semibold text-lg">{vehicle.registrationNumber}</p>
                      <p className="text-sm text-fg-secondary">{vehicle.type} - {vehicle.model && vehicle.model !== "Unknown" ? vehicle.model : "-"}</p>
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
                {slotAnalysis.slots.map((slot) => (
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
                        {slot.vehicles.map((vehicle) => (
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
              {villaVehicles.villaVehicles.map((villa) => (
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
                      {villa.vehicles.map((vehicle) => (
                        <div key={vehicle.id} className="bg-surface-background rounded p-3">
                          <p className="font-mono font-semibold text-fg-primary">{vehicle.registrationNumber}</p>
                          <p className="text-sm text-fg-secondary">
                            {vehicle.type} - {vehicle.model && vehicle.model !== "Unknown" ? vehicle.model : "-"}
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
    </AppShell>
  );
}
