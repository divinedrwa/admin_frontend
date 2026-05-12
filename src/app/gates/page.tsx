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
        <div className="page-action-bar">
          <p className="text-fg-secondary">Manage society entry/exit gates for guard assignment</p>
          <button
            onClick={() => handleOpenForm()}
            className="btn btn-primary"
          >
            + Add Gate
          </button>
        </div>

        {showForm && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">
                {editingGate ? "Edit Gate" : "Create New Gate"}
              </h2>
            </div>
            <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Gate Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="e.g., Main Gate, Side Gate, East Entrance"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="input"
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
                  <span className="text-sm font-medium text-fg-primary">Gate is Active</span>
                </label>
                <p className="text-xs text-fg-secondary mt-1">
                  Inactive gates cannot be assigned to guards
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? "Saving..." : editingGate ? "Update Gate" : "Create Gate"}
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
            <div className="loading-state"><div className="loading-spinner w-10 h-10"></div><p className="loading-state-text">Loading gates...</p></div>
          ) : (
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th className="table-th">Gate Name</th>
                  <th className="table-th">Location</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {gates.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state">
                        <span className="empty-state-icon">🚧</span>
                        <p className="empty-state-title">No gates found</p>
                        <p className="empty-state-text">Click &quot;Add Gate&quot; to create your first gate.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  gates.map((gate) => (
                    <tr key={gate.id} className="table-row">
                      <td className="table-td font-medium">{gate.name}</td>
                      <td className="table-td">{gate.location}</td>
                      <td className="table-td">
                        <span className={`badge ${gate.isActive ? "badge-success" : "badge-gray"}`}>
                          {gate.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="table-td">
                        <button
                          onClick={() => handleOpenForm(gate)}
                          className="text-brand-primary hover:text-info-fg text-xs"
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
          <div className="bg-brand-primary-light border border-surface-border rounded p-4">
            <h3 className="font-medium text-fg-primary mb-1">Next Steps</h3>
            <p className="text-sm text-info-fg">
              Now you can schedule guard shifts and assign guards to these gates from the{" "}
              <strong>Guard Shifts</strong> page.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
