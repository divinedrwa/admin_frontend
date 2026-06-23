"use client";

import { CarFront, Plus, Search } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { VillaTypeahead } from "@/components/VillaTypeahead";
import { Pagination } from "@/components/Pagination";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { useConfirm } from "@/components/ConfirmDialog";
import { sortByVillaNumber } from "@/utils/villaSort";
import { useVehicles } from "@/hooks/useVehicles";
import { Vehicle, VehicleForm } from "@/types/vehicle";

function formatVehicleType(vehicleType: Vehicle["vehicleType"]): string {
  const raw = typeof vehicleType === "string" ? vehicleType.trim() : "";
  if (!raw) return "-";
  return raw
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  const queryClient = useQueryClient();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { confirm, ConfirmUI } = useConfirm();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const initialOffset = Number(searchParams.get("offset")) || 0;

  const vehicleParams = useMemo(() => {
    const p: Record<string, unknown> = { limit: 50, offset: initialOffset };
    if (debouncedSearch) p.search = debouncedSearch;
    return p;
  }, [initialOffset, debouncedSearch]);

  const { data: vehicleData, isLoading: loading } = useVehicles(vehicleParams);
  const vehicles = useMemo(
    () => sortByVillaNumber(
      (vehicleData?.vehicles ?? []) as Vehicle[],
      (v) => v.villa?.villaNumber ?? null,
    ),
    [vehicleData?.vehicles],
  );
  const pgMeta = {
    total: vehicleData?.total ?? 0,
    limit: vehicleData?.limit ?? 50,
    offset: vehicleData?.offset ?? 0,
  };

  const handlePageChange = (newOffset: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newOffset > 0) params.set("offset", String(newOffset));
    else params.delete("offset");
    router.replace(`?${params.toString()}`, { scroll: false });
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
    return { total: pgMeta.total, byType };
  }, [vehicles, pgMeta.total]);

  /* Search is now server-side; filteredVehicles = vehicles */
  const filteredVehicles = vehicles;

  /* ---- Form handlers ---- */
  const handleOpenForm = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: (vehicle.vehicleType as VehicleForm["vehicleType"]) || "FOUR_WHEELER",
        model: vehicle.model && vehicle.model !== "Unknown" ? vehicle.model : "",
        color: vehicle.color && vehicle.color !== "Unknown" ? vehicle.color : "",
        parkingSlot: vehicle.parkingSlot || "",
        villaId: "",
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
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { issues?: { path?: (string | number)[]; message?: string }[] } } })?.response?.data;
      let message = parseApiError(error, editingVehicle ? "Failed to update vehicle" : "Failed to register vehicle").message;
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
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to delete vehicle").message, "error");
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
                    <VillaTypeahead
                      required
                      value={formData.villaId}
                      onChange={(villaId) => setFormData({ ...formData, villaId })}
                    />
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
