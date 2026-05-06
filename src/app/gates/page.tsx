"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

type Gate = {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
};

type GateForm = {
  name: string;
  location: string;
  isActive: boolean;
};

export default function GatesPage() {
  const [gates, setGates] = useState<Gate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGate, setEditingGate] = useState<Gate | null>(null);
  const [formData, setFormData] = useState<GateForm>({
    name: "",
    location: "",
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);

  const loadGates = () => {
    setLoading(true);
    api
      .get("/gates")
      .then((response) => setGates(response.data.gates ?? []))
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load gates";
        showToast(message, "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGates();
  }, []);

  const handleOpenForm = (gate?: Gate) => {
    if (gate) {
      setEditingGate(gate);
      setFormData({
        name: gate.name,
        location: gate.location,
        isActive: gate.isActive
      });
    } else {
      setEditingGate(null);
      setFormData({
        name: "",
        location: "",
        isActive: true
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingGate(null);
    setFormData({
      name: "",
      location: "",
      isActive: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        location: formData.location,
        isActive: formData.isActive
      };

      if (editingGate) {
        await api.patch(`/gates/${editingGate.id}`, payload);
        showToast("Gate updated successfully", "success");
      } else {
        await api.post("/gates", payload);
        showToast("Gate created successfully", "success");
      }

      handleCloseForm();
      loadGates();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to save gate";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Gates Management">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Manage society entry/exit gates for guard assignment</p>
          <button
            onClick={() => handleOpenForm()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Add Gate
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingGate ? "Edit Gate" : "Create New Gate"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gate Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="e.g., Main Gate, Side Gate, East Entrance"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="e.g., North Side, Building A Entrance"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Gate is Active</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Inactive gates cannot be assigned to guards
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submitting ? "Saving..." : editingGate ? "Update Gate" : "Create Gate"}
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
            <p className="text-gray-500">Loading gates...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Gate Name</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {gates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      No gates found. Click "Add Gate" to create your first gate.
                    </td>
                  </tr>
                ) : (
                  gates.map((gate) => (
                    <tr key={gate.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 font-medium">{gate.name}</td>
                      <td>{gate.location}</td>
                      <td>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            gate.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {gate.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleOpenForm(gate)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {gates.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="font-medium text-blue-900 mb-1">Next Steps</h3>
            <p className="text-sm text-blue-800">
              Now you can schedule guard shifts and assign guards to these gates from the{" "}
              <strong>Guard Shifts</strong> page.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
