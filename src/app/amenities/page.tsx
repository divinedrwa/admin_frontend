"use client";

import { Building, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

/** Must match Prisma `AmenityType` (see `POST /api/amenities`). */
type AmenityTypeId =
  | "CLUBHOUSE"
  | "GYM"
  | "SWIMMING_POOL"
  | "SPORTS_COURT"
  | "BANQUET_HALL"
  | "GUEST_ROOM"
  | "PLAYGROUND"
  | "PARKING"
  | "OTHER";

const AMENITY_TYPE_OPTIONS: { value: AmenityTypeId; label: string }[] = [
  { value: "CLUBHOUSE", label: "Clubhouse" },
  { value: "GYM", label: "Gym" },
  { value: "SWIMMING_POOL", label: "Swimming pool" },
  { value: "SPORTS_COURT", label: "Sports court" },
  { value: "BANQUET_HALL", label: "Banquet / community hall" },
  { value: "GUEST_ROOM", label: "Guest room" },
  { value: "PLAYGROUND", label: "Playground" },
  { value: "PARKING", label: "Parking" },
  { value: "OTHER", label: "Other" }
];

function formatAmenityType(type: string): string {
  const found = AMENITY_TYPE_OPTIONS.find((o) => o.value === type);
  return found ? found.label : type;
}

type Amenity = {
  id: string;
  name: string;
  /** API value; may be legacy if data predates enum alignment */
  type: string;
  description: string | null;
  capacity: number | null;
  isActive: boolean;
  pricePerHour: number | string | null;
};

type AmenityForm = {
  name: string;
  type: AmenityTypeId;
  description: string;
  capacity: string;
  isActive: boolean;
  pricePerHour: string;
};

export default function AmenitiesPage() {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);
  const [formData, setFormData] = useState<AmenityForm>({
    name: "",
    type: "SWIMMING_POOL",
    description: "",
    capacity: "",
    isActive: true,
    pricePerHour: "0"
  });
  const [submitting, setSubmitting] = useState(false);

  const loadAmenities = () => {
    setLoading(true);
    api
      .get("/amenities")
      .then((response) => setAmenities(response.data.amenities ?? []))
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load amenities";
        showToast(message, "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAmenities();
  }, []);

  const handleOpenForm = (amenity?: Amenity) => {
    if (amenity) {
      setEditingAmenity(amenity);
      setFormData({
        name: amenity.name,
        type: (AMENITY_TYPE_OPTIONS.some((o) => o.value === amenity.type)
          ? amenity.type
          : "OTHER") as AmenityTypeId,
        description: amenity.description ?? "",
        capacity: amenity.capacity != null ? amenity.capacity.toString() : "",
        isActive: amenity.isActive,
        pricePerHour:
          amenity.pricePerHour != null && amenity.pricePerHour !== ""
            ? String(amenity.pricePerHour)
            : "0"
      });
    } else {
      setEditingAmenity(null);
      setFormData({
        name: "",
        type: "SWIMMING_POOL",
        description: "",
        capacity: "",
        isActive: true,
        pricePerHour: "0"
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAmenity(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const cap = parseInt(formData.capacity, 10);
      const payload = {
        name: formData.name,
        type: formData.type,
        description: formData.description.trim() || undefined,
        capacity: Number.isFinite(cap) && cap > 0 ? cap : undefined,
        isActive: formData.isActive,
        pricePerHour: Math.max(0, parseFloat(formData.pricePerHour) || 0)
      };

      if (editingAmenity) {
        await api.patch(`/amenities/${editingAmenity.id}`, payload);
        showToast("Amenity updated successfully", "success");
      } else {
        await api.post("/amenities", payload);
        showToast("Amenity created successfully", "success");
      }

      handleCloseForm();
      loadAmenities();
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { message?: string; issues?: { path?: (string | number)[]; message?: string }[] } } })?.response?.data;
      let message = data?.message ?? "Failed to save amenity";
      const firstIssue = data?.issues?.[0];
      if (firstIssue?.path?.length && firstIssue.message) {
        message = `${message}: ${firstIssue.path.join(".")} — ${firstIssue.message}`;
      }
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Amenities">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Facility catalog"
          title="Amenities"
          description="Define bookable facilities, configure pricing and capacity, and keep the amenity calendar aligned with what residents can reserve."
          icon={<Building className="h-6 w-6" />}
          actions={
            <button onClick={() => handleOpenForm()} className="btn btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Amenity
            </button>
          }
        />

        {showForm && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">
                {editingAmenity ? "Edit Amenity" : "Create New Amenity"}
              </h2>
            </div>
            <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="e.g., Swimming Pool, Community Hall"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">Type *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as AmenityTypeId
                      })
                    }
                    className="input"
                  >
                    {AMENITY_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Describe the amenity and its facilities"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Capacity *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="input"
                    placeholder="Max people"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Price per Hour (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.pricePerHour}
                    onChange={(e) => setFormData({ ...formData, pricePerHour: e.target.value })}
                    className="input"
                    placeholder="0 for free"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-fg-primary">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? "Saving..." : editingAmenity ? "Update" : "Create"}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="loading-state col-span-full">
              <div className="loading-spinner w-10 h-10"></div>
              <p className="loading-state-text">Loading amenities...</p>
            </div>
          ) : amenities.length === 0 ? (
            <div className="empty-state col-span-full">
              <span className="empty-state-icon">🏊</span>
              <p className="empty-state-title">No amenities found</p>
              <p className="empty-state-text">Click &quot;Add Amenity&quot; to create your first amenity.</p>
            </div>
          ) : (
            amenities.map((amenity) => (
              <div key={amenity.id} className="card">
                <div className="card-body">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{amenity.name}</h3>
                  <span
                    className={`badge ${
                      amenity.isActive
                        ? "badge-success"
                        : "badge-gray"
                    }`}
                  >
                    {amenity.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-fg-secondary">
                  <div>
                    <span className="font-medium">Type:</span> {formatAmenityType(amenity.type)}
                  </div>
                  {amenity.description && (
                    <div>
                      <span className="font-medium">Description:</span> {amenity.description}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Capacity:</span> {amenity.capacity} people
                  </div>
                  <div>
                    <span className="font-medium">Price:</span> ₹
                    {amenity.pricePerHour != null && amenity.pricePerHour !== ""
                      ? Number(amenity.pricePerHour)
                      : 0}
                    /hour
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleOpenForm(amenity)}
                    className="text-brand-primary hover:text-info-fg text-sm"
                  >
                    Edit
                  </button>
                </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
