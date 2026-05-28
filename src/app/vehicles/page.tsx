"use client";

import { CarFront, Plus, Search } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { Pagination } from "@/components/Pagination";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { sortByVillaNumber } from "@/utils/villaSort";

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
  return (
    <Suspense fallback={<AppShell title="Vehicle Management"><div className="loading-state"><div className="loading-spinner w-10 h-10" /></div></AppShell>}>
      <VehiclesPageInner />
    </Suspense>
  );
}

function VehiclesPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<VehicleForm>({
    vehicleNumber: "",
    vehicleType: "FOUR_WHEELER",
    model: "",
    color: "",
    parkingSlot: "",
    villaId: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [pgMeta, setPgMeta] = useState({ total: 0, limit: 50, offset: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const { confirm, ConfirmUI } = useConfirm();

  const initialOffset = Number(searchParams.get("offset")) || 0;

  const loadVehicles = useCallback((offset = initialOffset, signal?: AbortSignal) => {
    setLoading(true);
    api
      .get(`/vehicles?limit=50&offset=${offset}`, { signal })
      .then((response) => {
        setVehicles(
          sortByVillaNumber(
            (response.data.vehicles ?? []) as Vehicle[],
            (v) => v.villa?.villaNumber ?? null,
          ),
        );
        setPgMeta({
          total: response.data.total ?? 0,
          limit: response.data.limit ?? 50,
          offset: response.data.offset ?? 0,
        });
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === "CanceledError") return;
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load vehicles";
        showToast(message, "error");
      })
      .finally(() => setLoading(false));
  }, [initialOffset]);

  const loadVillas = useCallback((signal?: AbortSignal) => {
    api
      .get("/villas", { signal })
      .then((response) =>
        setVillas(
          sortByVillaNumber(
            (response.data.villas ?? []) as Villa[],
            (v) => v.villaNumber,
          ),
        ),
      )
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === "CanceledError") return;
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load villas";
        showToast(message, "error");
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadVehicles(initialOffset, controller.signal);
    loadVillas(controller.signal);
    return () => controller.abort();
  }, [loadVehicles, loadVillas, initialOffset]);

  const handlePageChange = (newOffset: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newOffset > 0) params.set("offset", String(newOffset));
    else params.delete("offset");
    router.replace(`?${params.toString()}`, { scroll: false });
    loadVehicles(newOffset);
  };

  /* ---- Summary stats ---- */
  const stats = useMemo(() => {
    const byType: Record<string, number> = {
      TWO_WHEELER: 0,
      FOUR_WHEELER: 0,
      BICYCLE: 0,
      OTHER: 0,
    };
    for (const v of vehicles) {
      const t = typeof v.vehicleType === "string" ? v.vehicleType.trim() : "";
      if (t in byType) byType[t]++;
      else byType.OTHER++;
    }
    return { total: vehicles.length, byType };
  }, [vehicles]);

  /* ---- Client-side search filter ---- */
  const filteredVehicles = useMemo(() => {
    if (!searchQuery.trim()) return vehicles;
    const q = searchQuery.toLowerCase().trim();
    return vehicles.filter(
      (v) =>
        v.vehicleNumber.toLowerCase().includes(q) ||
        (v.model && v.model.toLowerCase().includes(q)) ||
        (v.villa?.villaNumber && v.villa.villaNumber.toLowerCase().includes(q)),
    );
  }, [vehicles, searchQuery]);

  /* ---- Form handlers ---- */
  const handleOpenForm = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      // Find the villaId from the villas list by matching villaNumber + block
      const matchedVilla = villas.find(
        (v) => v.villaNumber === vehicle.villa.villaNumber && v.block === vehicle.villa.block,
      );
      setFormData({
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: (vehicle.vehicleType as VehicleForm["vehicleType"]) || "FOUR_WHEELER",
        model: vehicle.model && vehicle.model !== "Unknown" ? vehicle.model : "",
        color: vehicle.color && vehicle.color !== "Unknown" ? vehicle.color : "",
        parkingSlot: vehicle.parkingSlot || "",
        villaId: matchedVilla?.id ?? "",
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        vehicleNumber: "",
        vehicleType: "FOUR_WHEELER",
        model: "",
        color: "",
        parkingSlot: "",
        villaId: ""
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingVehicle(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingVehicle) {
        // PATCH - update existing vehicle (villaId is not changeable)
        const payload = {
          vehicleNumber: formData.vehicleNumber.toUpperCase(),
          vehicleType: formData.vehicleType,
          model: formData.model,
          color: formData.color,
          parkingSlot: formData.parkingSlot,
        };
        await api.patch(`/vehicles/${editingVehicle.id}`, payload);
        showToast("Vehicle updated successfully", "success");
      } else {
        // POST - create new vehicle
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
      }

      handleCloseForm();
      loadVehicles(pgMeta.offset);
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { message?: string; issues?: { path?: (string | number)[]; message?: string }[] } } })?.response?.data;
      let message = data?.message ?? (editingVehicle ? "Failed to update vehicle" : "Failed to register vehicle");
      const firstIssue = data?.issues?.[0];
      if (firstIssue?.path?.length && firstIssue.message) {
        message = `${message}: ${firstIssue.path.join(".")} — ${firstIssue.message}`;
      }
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Delete vehicle", message: "Are you sure you want to delete this vehicle?", confirmLabel: "Delete" }))) return;

    try {
      await api.delete(`/vehicles/${id}`);
      showToast("Vehicle deleted successfully", "success");
      loadVehicles(pgMeta.offset);
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
            <button onClick={() => handleOpenForm()} className="btn btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Register Vehicle
            </button>
          }
        />

        {/* Summary stats */}
        {!loading && vehicles.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="card">
              <div className="card-body py-3 px-4">
                <p className="text-xs text-fg-secondary">Total</p>
                <p className="text-2xl font-semibold text-fg-primary">{stats.total}</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body py-3 px-4">
                <p className="text-xs text-fg-secondary">Four Wheeler</p>
                <p className="text-2xl font-semibold text-fg-primary">{stats.byType.FOUR_WHEELER}</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body py-3 px-4">
                <p className="text-xs text-fg-secondary">Two Wheeler</p>
                <p className="text-2xl font-semibold text-fg-primary">{stats.byType.TWO_WHEELER}</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body py-3 px-4">
                <p className="text-xs text-fg-secondary">Bicycle</p>
                <p className="text-2xl font-semibold text-fg-primary">{stats.byType.BICYCLE}</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body py-3 px-4">
                <p className="text-xs text-fg-secondary">Other</p>
                <p className="text-2xl font-semibold text-fg-primary">{stats.byType.OTHER}</p>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">
                {editingVehicle ? "Edit Vehicle" : "Register New Vehicle"}
              </h2>
            </div>
            <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!editingVehicle && (
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
                )}

                {editingVehicle && (
                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-1">
                      Villa
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${editingVehicle.villa.villaNumber}${editingVehicle.villa.block ? ` (Block ${editingVehicle.villa.block})` : ""}`}
                      className="input opacity-60"
                    />
                    <p className="text-xs text-fg-secondary mt-1">Villa cannot be changed after registration.</p>
                  </div>
                )}

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
                  {submitting ? "Saving..." : editingVehicle ? "Update Vehicle" : "Register Vehicle"}
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

        {/* Search filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-secondary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9"
              placeholder="Search by vehicle no., model, or villa..."
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="btn btn-ghost text-sm"
            >
              Clear
            </button>
          )}
        </div>

        <div className="table-wrapper overflow-x-auto">
          {loading ? (
            <div className="loading-state"><div className="loading-spinner w-10 h-10"></div><p className="loading-state-text">Loading vehicles...</p></div>
          ) : filteredVehicles.length === 0 && pgMeta.total === 0 && !searchQuery ? (
            <div className="empty-state">
              <span className="empty-state-icon">&#x1f697;</span>
              <p className="empty-state-title">No vehicles registered</p>
              <p className="empty-state-text">Click &quot;Register Vehicle&quot; to add one.</p>
            </div>
          ) : filteredVehicles.length === 0 && searchQuery ? (
            <div className="empty-state">
              <span className="empty-state-icon">&#x1f50d;</span>
              <p className="empty-state-title">No vehicles match &quot;{searchQuery}&quot;</p>
              <p className="empty-state-text">Try a different search term.</p>
            </div>
          ) : (
            <>
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th scope="col" className="table-th">Vehicle No.</th>
                    <th scope="col" className="table-th">Type</th>
                    <th scope="col" className="table-th">Model</th>
                    <th scope="col" className="table-th">Color</th>
                    <th scope="col" className="table-th">Villa</th>
                    <th scope="col" className="table-th">Parking</th>
                    <th scope="col" className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="table-row">
                      <td className="table-td font-medium">{vehicle.vehicleNumber}</td>
                      <td className="table-td">
                        {formatVehicleType(vehicle.vehicleType)}
                      </td>
                      <td className="table-td">{vehicle.model && vehicle.model !== "Unknown" ? vehicle.model : "-"}</td>
                      <td className="table-td">{vehicle.color && vehicle.color !== "Unknown" ? vehicle.color : "-"}</td>
                      <td className="table-td">
                        {vehicle.villa.villaNumber}
                        {vehicle.villa.block ? ` (${vehicle.villa.block})` : ""}
                      </td>
                      <td className="table-td">{vehicle.parkingSlot || "-"}</td>
                      <td className="table-td">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenForm(vehicle)}
                            className="text-brand-primary hover:text-info-fg text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(vehicle.id)}
                            className="text-brand-danger hover:text-denied-fg text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!searchQuery && (
                <Pagination
                  total={pgMeta.total}
                  limit={pgMeta.limit}
                  offset={pgMeta.offset}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </div>
      </div>
      {ConfirmUI}
    </AppShell>
  );
}
