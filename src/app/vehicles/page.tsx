"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

type Vehicle = {
  id: string;
  vehicleNumber: string;
  vehicleType?: "TWO_WHEELER" | "FOUR_WHEELER" | "BICYCLE" | "OTHER" | string | null;
  model: string;
  color: string;
  parkingSlot: string;
  villa: {
    villaNumber: string;
    block: string;
  };
};

function formatVehicleType(vehicleType: Vehicle["vehicleType"]): string {
  const raw = typeof vehicleType === "string" ? vehicleType.trim() : "";
  if (!raw) return "-";
  return raw
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type Villa = {
  id: string;
  villaNumber: string;
  block: string;
  ownerName: string;
};

type VehicleForm = {
  vehicleNumber: string;
  vehicleType: "TWO_WHEELER" | "FOUR_WHEELER" | "BICYCLE" | "OTHER";
  model: string;
  color: string;
  parkingSlot: string;
  villaId: string;
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<VehicleForm>({
    vehicleNumber: "",
    vehicleType: "FOUR_WHEELER",
    model: "",
    color: "",
    parkingSlot: "",
    villaId: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const loadVehicles = () => {
    setLoading(true);
    api
      .get("/vehicles")
      .then((response) => setVehicles(response.data.vehicles ?? []))
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load vehicles";
        showToast(message, "error");
      })
      .finally(() => setLoading(false));
  };

  const loadVillas = () => {
    api
      .get("/villas")
      .then((response) => setVillas(response.data.villas ?? []))
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load villas";
        showToast(message, "error");
      });
  };

  useEffect(() => {
    loadVehicles();
    loadVillas();
  }, []);

  const handleOpenForm = () => {
    setFormData({
      vehicleNumber: "",
      vehicleType: "FOUR_WHEELER",
      model: "",
      color: "",
      parkingSlot: "",
      villaId: ""
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        vehicleNumber: formData.vehicleNumber.toUpperCase(),
        vehicleType: formData.vehicleType,
        model: formData.model,
        color: formData.color,
        parkingSlot: formData.parkingSlot,
        villaId: formData.villaId
      };

      await api.post("/vehicles", payload);
      showToast("Vehicle registered successfully", "success");
      handleCloseForm();
      loadVehicles();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to register vehicle";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

    try {
      await api.delete(`/vehicles/${id}`);
      showToast("Vehicle deleted successfully", "success");
      loadVehicles();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to delete vehicle";
      showToast(message, "error");
    }
  };

  return (
    <AppShell title="Vehicle Management">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Register and manage resident vehicles</p>
          <button
            onClick={handleOpenForm}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Register Vehicle
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">Register New Vehicle</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Villa *
                  </label>
                  <select
                    required
                    value={formData.villaId}
                    onChange={(e) => setFormData({ ...formData, villaId: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">Select villa</option>
                    {villas.map((villa) => (
                      <option key={villa.id} value={villa.id}>
                        {villa.villaNumber} {villa.block ? `(Block ${villa.block})` : ""} - {villa.ownerName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Type *
                  </label>
                  <select
                    required
                    value={formData.vehicleType}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicleType: e.target.value as VehicleForm["vehicleType"] })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="TWO_WHEELER">Two Wheeler</option>
                    <option value="FOUR_WHEELER">Four Wheeler</option>
                    <option value="BICYCLE">Bicycle</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="MH12AB1234"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Honda City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="White"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parking Slot
                  </label>
                  <input
                    type="text"
                    value={formData.parkingSlot}
                    onChange={(e) => setFormData({ ...formData, parkingSlot: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="P-12"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submitting ? "Registering..." : "Register Vehicle"}
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

        <div className="rounded bg-white border border-gray-200 p-4">
          {loading ? (
            <p className="text-gray-500">Loading vehicles...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Vehicle No.</th>
                  <th>Type</th>
                  <th>Model</th>
                  <th>Color</th>
                  <th>Villa</th>
                  <th>Parking</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No vehicles registered. Click "Register Vehicle" to add one.
                    </td>
                  </tr>
                ) : (
                  vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 font-medium">{vehicle.vehicleNumber}</td>
                      <td>
                        {formatVehicleType(vehicle.vehicleType)}
                      </td>
                      <td>{vehicle.model || "-"}</td>
                      <td>{vehicle.color || "-"}</td>
                      <td>
                        {vehicle.villa.villaNumber}
                        {vehicle.villa.block ? ` (${vehicle.villa.block})` : ""}
                      </td>
                      <td>{vehicle.parkingSlot || "-"}</td>
                      <td>
                        <button
                          onClick={() => handleDelete(vehicle.id)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
