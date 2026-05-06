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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🅿️ Parking Management</h1>
          <p className="text-gray-600">Monitor and manage parking slots and vehicles</p>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            {[
              { id: "overview", label: "📊 Overview" },
              { id: "slots", label: "🅿️ Slot Analysis" },
              { id: "villas", label: "🏘️ By Villa" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 font-medium ${
                  activeTab === tab.id
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading data...</p>
          </div>
        )}

        {!loading && activeTab === "overview" && overview && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Total Vehicles</p>
                <p className="text-3xl font-bold text-blue-600">{overview.summary.totalVehicles}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Occupied Slots</p>
                <p className="text-3xl font-bold text-green-600">{overview.summary.occupiedSlots}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">With Parking</p>
                <p className="text-3xl font-bold text-purple-600">{overview.summary.withSlots}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Without Parking</p>
                <p className="text-3xl font-bold text-red-600">{overview.summary.withoutSlots}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Vehicles by Type</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(overview.typeBreakdown).map(([type, count]: any) => (
                  <div key={type} className="text-center p-4 bg-gray-50 rounded">
                    <p className="text-2xl font-bold text-blue-600">{count}</p>
                    <p className="text-sm text-gray-600">{type}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">All Vehicles</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Villa</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parking Slot</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {overview.vehicles.map((vehicle: any) => (
                      <tr key={vehicle.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{vehicle.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono font-semibold text-sm">{vehicle.registrationNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{vehicle.model || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {vehicle.villa ? `${vehicle.villa.villaNumber} (${vehicle.villa.ownerName})` : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {vehicle.parkingSlot ? (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {vehicle.parkingSlot}
                            </span>
                          ) : (
                            <span className="text-gray-400">Unassigned</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === "slots" && slotAnalysis && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Total Slots</p>
                <p className="text-3xl font-bold text-blue-600">{slotAnalysis.summary.totalSlots}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Occupied</p>
                <p className="text-3xl font-bold text-red-600">{slotAnalysis.summary.occupiedSlots}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Available</p>
                <p className="text-3xl font-bold text-green-600">{slotAnalysis.summary.availableSlots}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Unassigned Vehicles</p>
                <p className="text-3xl font-bold text-orange-600">{slotAnalysis.summary.unassignedCount}</p>
              </div>
            </div>

            {slotAnalysis.unassignedVehicles.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-orange-800 mb-4">⚠️ Vehicles Without Parking Slots</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {slotAnalysis.unassignedVehicles.map((vehicle: any) => (
                    <div key={vehicle.id} className="bg-white rounded p-4">
                      <p className="font-mono font-semibold text-lg">{vehicle.registrationNumber}</p>
                      <p className="text-sm text-gray-600">{vehicle.type} - {vehicle.model || "Unknown Model"}</p>
                      {vehicle.villa && (
                        <p className="text-xs text-gray-500 mt-1">Villa: {vehicle.villa.villaNumber}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Slot-by-Slot Analysis</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {slotAnalysis.slots.map((slot: any) => (
                  <div
                    key={slot.slot}
                    className={`border-2 rounded-lg p-4 ${
                      slot.status === "OCCUPIED"
                        ? "border-red-500 bg-red-50"
                        : "border-green-500 bg-green-50"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{slot.slot}</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          slot.status === "OCCUPIED"
                            ? "bg-red-200 text-red-800"
                            : "bg-green-200 text-green-800"
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
                            <p className="text-xs text-gray-600">{vehicle.type}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Available</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === "villas" && villaVehicles && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Total Villas</p>
                <p className="text-3xl font-bold text-blue-600">{villaVehicles.summary.totalVillas}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">With Vehicles</p>
                <p className="text-3xl font-bold text-green-600">{villaVehicles.summary.villasWithVehicles}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Without Vehicles</p>
                <p className="text-3xl font-bold text-gray-600">{villaVehicles.summary.villasWithoutVehicles}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Avg per Villa</p>
                <p className="text-3xl font-bold text-purple-600">{villaVehicles.summary.avgVehiclesPerVilla}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {villaVehicles.villaVehicles.map((villa: any) => (
                <div key={villa.villaId} className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Villa {villa.villaNumber}
                        {villa.block && ` (Block ${villa.block})`}
                      </h3>
                      <p className="text-sm text-gray-600">{villa.ownerName}</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded font-semibold">
                      {villa.vehicleCount} {villa.vehicleCount === 1 ? "vehicle" : "vehicles"}
                    </span>
                  </div>

                  {villa.vehicles.length > 0 ? (
                    <div className="space-y-3">
                      {villa.vehicles.map((vehicle: any) => (
                        <div key={vehicle.id} className="bg-gray-50 rounded p-3">
                          <p className="font-mono font-semibold text-gray-900">{vehicle.registrationNumber}</p>
                          <p className="text-sm text-gray-600">
                            {vehicle.type} - {vehicle.model || "Unknown"}
                          </p>
                          {vehicle.parkingSlot && (
                            <p className="text-xs text-blue-600 mt-1">
                              🅿️ Slot: {vehicle.parkingSlot}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic text-sm">No vehicles registered</p>
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
