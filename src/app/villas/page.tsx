"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

type Villa = {
  id: string;
  villaNumber: string;
  floors: number;
  area: number;
  block: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  monthlyMaintenance: number;
  users: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  _count: {
    users: number;
  };
};

type VillaForm = {
  villaNumber: string;
  floors: string;
  area: string;
  block: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  monthlyMaintenance: string;
};

export default function VillasPage() {
  const [villas, setVillas] = useState<Villa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVilla, setEditingVilla] = useState<Villa | null>(null);
  const [formData, setFormData] = useState<VillaForm>({
    villaNumber: "",
    floors: "2",
    area: "",
    block: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    monthlyMaintenance: "5000"
  });
  const [submitting, setSubmitting] = useState(false);

  const loadVillas = () => {
    setLoading(true);
    api
      .get("/villas")
      .then((response) => setVillas(response.data.villas ?? []))
      .catch((error: unknown) => {
        const status = (error as any)?.response?.status;
        const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
        
        // Only show error toast for non-auth errors
        if (status !== 401 && status !== 403) {
          showToast(message ?? "Failed to load villas", "error");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Small delay to ensure token is loaded from localStorage
    const timer = setTimeout(() => {
      loadVillas();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleOpenForm = (villa?: Villa) => {
    if (villa) {
      setEditingVilla(villa);
      setFormData({
        villaNumber: villa.villaNumber,
        floors: villa.floors.toString(),
        area: villa.area.toString(),
        block: villa.block || "",
        ownerName: villa.ownerName,
        ownerEmail: villa.ownerEmail || "",
        ownerPhone: villa.ownerPhone || "",
        monthlyMaintenance: villa.monthlyMaintenance.toString()
      });
    } else {
      setEditingVilla(null);
      setFormData({
        villaNumber: "",
        floors: "2",
        area: "",
        block: "",
        ownerName: "",
        ownerEmail: "",
        ownerPhone: "",
        monthlyMaintenance: "5000"
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingVilla(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        villaNumber: formData.villaNumber,
        floors: parseInt(formData.floors),
        area: parseFloat(formData.area),
        block: formData.block,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        ownerPhone: formData.ownerPhone,
        monthlyMaintenance: parseFloat(formData.monthlyMaintenance)
      };

      if (editingVilla) {
        await api.patch(`/villas/${editingVilla.id}`, payload);
        showToast("Villa updated successfully", "success");
      } else {
        await api.post("/villas", payload);
        showToast("Villa created successfully", "success");
      }

      handleCloseForm();
      loadVillas();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to save villa";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (villaId: string) => {
    if (!confirm("Are you sure you want to delete this villa?")) return;

    try {
      await api.delete(`/villas/${villaId}`);
      showToast("Villa deleted successfully", "success");
      loadVillas();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to delete villa";
      showToast(message, "error");
    }
  };

  return (
    <AppShell title="Villas Management">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600">Manage society villas and residents</p>
            <p className="text-sm text-gray-500">Total: {villas.length} villas</p>
          </div>
          <button
            onClick={() => handleOpenForm()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Add Villa
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingVilla ? "Edit Villa" : "Create New Villa"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Villa Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.villaNumber}
                    onChange={(e) => setFormData({ ...formData, villaNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="e.g., V-001, V-002"
                    disabled={!!editingVilla}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Floors *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="10"
                    value={formData.floors}
                    onChange={(e) => setFormData({ ...formData, floors: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Block
                  </label>
                  <input
                    type="text"
                    value={formData.block}
                    onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="e.g., A, B, C"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area (sq. ft.) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="e.g., 1500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Maintenance (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.monthlyMaintenance}
                    onChange={(e) => setFormData({ ...formData, monthlyMaintenance: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="e.g., 5000"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Owner Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Owner Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Owner Email
                    </label>
                    <input
                      type="email"
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="owner@example.com"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Owner Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submitting ? "Saving..." : editingVilla ? "Update Villa" : "Create Villa"}
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

        <div className="rounded bg-white border border-gray-200 p-4 overflow-x-auto">
          {loading ? (
            <p className="text-gray-500">Loading villas...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Villa No.</th>
                  <th>Block</th>
                  <th>Floors</th>
                  <th>Area (sq.ft.)</th>
                  <th>Owner</th>
                  <th>Maintenance</th>
                  <th>Residents</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {villas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">
                      No villas found. Click "Add Villa" to create your first villa.
                    </td>
                  </tr>
                ) : (
                  villas.map((villa) => (
                    <tr key={villa.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 font-medium">{villa.villaNumber}</td>
                      <td>{villa.block || "-"}</td>
                      <td>{villa.floors}</td>
                      <td>{villa.area}</td>
                      <td>
                        <div>
                          <div className="font-medium">{villa.ownerName}</div>
                          {villa.ownerPhone && (
                            <div className="text-xs text-gray-500">{villa.ownerPhone}</div>
                          )}
                        </div>
                      </td>
                      <td className="font-medium text-green-600">₹{villa.monthlyMaintenance}</td>
                      <td>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {villa._count.users} active
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenForm(villa)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(villa.id)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Delete
                          </button>
                        </div>
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
