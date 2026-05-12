"use client";

import { CarFront, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
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
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Mobility records"
          title="Vehicle management"
          description="Register resident vehicles, link them to villas, and keep parking and ownership details easier to audit."
          icon={<CarFront className="h-6 w-6" />}
          actions={
            <button onClick={handleOpenForm} className="btn btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Register Vehicle
            </button>
          }
        />

        {showForm && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">Register New Vehicle</h2>
            </div>
            <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Villa *
                  </label>
                  <select
                    required
                    value={formData.villaId}
                    onChange={(e) => setFormData({ ...formData, villaId: e.target.value })}
                    className="input"
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
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Vehicle Type *
                  </label>
                  <select
                    required
                    value={formData.vehicleType}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicleType: e.target.value as VehicleForm["vehicleType"] })
                    }
                    className="input"
                  >
                    <option value="TWO_WHEELER">Two Wheeler</option>
                    <option value="FOUR_WHEELER">Four Wheeler</option>
                    <option value="BICYCLE">Bicycle</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Vehicle Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    className="input"
                    placeholder="MH12AB1234"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="input"
                    placeholder="Honda City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Color
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="input"
                    placeholder="White"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Parking Slot
                  </label>
                  <input
                    type="text"
                    value={formData.parkingSlot}
                    onChange={(e) => setFormData({ ...formData, parkingSlot: e.target.value })}
                    className="input"
                    placeholder="P-12"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? "Registering..." : "Register Vehicle"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        )}

        <div className="table-wrapper overflow-x-auto">
          {loading ? (
            <div className="loading-state"><div className="loading-spinner w-10 h-10"></div><p className="loading-state-text">Loading vehicles...</p></div>
          ) : (
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th className="table-th">Vehicle No.</th>
                  <th className="table-th">Type</th>
                  <th className="table-th">Model</th>
                  <th className="table-th">Color</th>
                  <th className="table-th">Villa</th>
                  <th className="table-th">Parking</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <span className="empty-state-icon">🚗</span>
                        <p className="empty-state-title">No vehicles registered</p>
                        <p className="empty-state-text">Click &quot;Register Vehicle&quot; to add one.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="table-row">
                      <td className="table-td font-medium">{vehicle.vehicleNumber}</td>
                      <td className="table-td">
                        {formatVehicleType(vehicle.vehicleType)}
                      </td>
                      <td className="table-td">{vehicle.model || "-"}</td>
                      <td className="table-td">{vehicle.color || "-"}</td>
                      <td className="table-td">
                        {vehicle.villa.villaNumber}
                        {vehicle.villa.block ? ` (${vehicle.villa.block})` : ""}
                      </td>
                      <td className="table-td">{vehicle.parkingSlot || "-"}</td>
                      <td className="table-td">
                        <button
                          onClick={() => handleDelete(vehicle.id)}
                          className="text-brand-danger hover:text-denied-fg text-xs"
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
