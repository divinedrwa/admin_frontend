"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

type GuardPatrol = {
  id: string;
  checkpointName: string;
  checkpointLocation: string;
  scheduledTime: string;
  actualTime?: string;
  status: string;
  notes?: string;
  createdAt: string;
  guard: {
    name: string;
  };
  gate: {
    name: string;
  };
};

type Guard = {
  id: string;
  name: string;
};

type Gate = {
  id: string;
  name: string;
};

export default function GuardPatrolsPage() {
  const [patrols, setPatrols] = useState<GuardPatrol[]>([]);
  const [guards, setGuards] = useState<Guard[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingPatrol, setEditingPatrol] = useState<GuardPatrol | null>(null);
  const [deletingPatrolId, setDeletingPatrolId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    guardId: "",
    gateId: "",
    checkpointName: "",
    checkpointLocation: "",
    scheduledTime: "",
    notes: ""
  });

  const loadPatrols = () => {
    setLoading(true);
    api
      .get("/guard-patrols")
      .then((response) => setPatrols(response.data.patrols ?? []))
      .catch(() => showToast("Failed to load patrols", "error"))
      .finally(() => setLoading(false));
  };

  const loadDropdownData = () => {
    api
      .get("/users?role=GUARD")
      .then((response) => setGuards(response.data.users ?? []))
      .catch(() => showToast("Failed to load guards", "error"));

    api
      .get("/gates")
      .then((response) => setGates(response.data.gates ?? []))
      .catch(() => showToast("Failed to load gates", "error"));
  };

  useEffect(() => {
    loadPatrols();
    loadDropdownData();
  }, []);

  const handleOpenForm = () => {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30); // Round to next 30 min
    const scheduledTimeStr = now.toISOString().slice(0, 16);

    setEditingPatrol(null);
    setFormData({
      guardId: "",
      gateId: "",
      checkpointName: "",
      checkpointLocation: "",
      scheduledTime: scheduledTimeStr,
      notes: ""
    });
    setShowForm(true);
  };

  const handleEdit = (patrol: GuardPatrol) => {
    setEditingPatrol(patrol);
    setFormData({
      guardId: "", // Guard can't be changed for existing patrol
      gateId: "", // Gate can't be changed for existing patrol
      checkpointName: patrol.checkpointName,
      checkpointLocation: patrol.checkpointLocation,
      scheduledTime: patrol.scheduledTime.slice(0, 16),
      notes: patrol.notes || ""
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPatrol(null);
  };

  const handleDelete = async (patrolId: string) => {
    if (!window.confirm("Are you sure you want to delete this patrol? This action cannot be undone.")) {
      return;
    }

    setDeletingPatrolId(patrolId);
    try {
      await api.delete(`/guard-patrols/${patrolId}`);
      showToast("Patrol deleted successfully", "success");
      loadPatrols();
    } catch (error: any) {
      const message = error.response?.data?.message ?? "Failed to delete patrol";
      showToast(message, "error");
    } finally {
      setDeletingPatrolId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingPatrol && (!formData.guardId || !formData.gateId)) {
      showToast("Please select guard and gate", "error");
      return;
    }

    if (!formData.checkpointName || !formData.scheduledTime) {
      showToast("Please fill all required fields", "error");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        guardId: editingPatrol ? undefined : formData.guardId,
        gateId: editingPatrol ? undefined : formData.gateId,
        checkpointName: formData.checkpointName,
        checkpointLocation: formData.checkpointLocation || formData.checkpointName,
        scheduledTime: new Date(formData.scheduledTime).toISOString(),
        notes: formData.notes || undefined
      };

      if (editingPatrol) {
        await api.put(`/guard-patrols/${editingPatrol.id}`, payload);
        showToast("Patrol updated successfully", "success");
      } else {
        await api.post("/guard-patrols", payload);
        showToast("Patrol scheduled successfully", "success");
      }

      handleCloseForm();
      loadPatrols();
    } catch (error: any) {
      const message = error.response?.data?.message ?? (editingPatrol ? "Failed to update patrol" : "Failed to schedule patrol");
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      SCHEDULED: "bg-blue-100 text-blue-800",
      IN_PROGRESS: "bg-yellow-100 text-yellow-800",
      COMPLETED: "bg-green-100 text-green-800",
      MISSED: "bg-red-100 text-red-800",
    };
    return badges[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <AppShell title="Guard Patrols">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Monitor and schedule guard patrol activities</p>
          <button
            onClick={handleOpenForm}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Schedule Patrol
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">{editingPatrol ? "Edit Patrol" : "Schedule New Patrol"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingPatrol ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Guard *
                    </label>
                    <select
                      required
                      value={formData.guardId}
                      onChange={(e) => setFormData({ ...formData, guardId: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="">Select guard</option>
                      {guards.map((guard) => (
                        <option key={guard.id} value={guard.id}>
                          {guard.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gate *
                    </label>
                    <select
                      required
                      value={formData.gateId}
                      onChange={(e) => setFormData({ ...formData, gateId: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="">Select gate</option>
                      {gates.map((gate) => (
                        <option key={gate.id} value={gate.id}>
                          {gate.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Guard:</span> {editingPatrol.guard.name} | 
                    <span className="font-medium ml-2">Gate:</span> {editingPatrol.gate.name}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Checkpoint Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.checkpointName}
                  onChange={(e) => setFormData({ ...formData, checkpointName: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="e.g., Main Gate Area, Block A Perimeter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Checkpoint Location (Optional)
                </label>
                <input
                  type="text"
                  value={formData.checkpointLocation}
                  onChange={(e) => setFormData({ ...formData, checkpointLocation: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Detailed location description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Additional instructions or notes..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submitting ? (editingPatrol ? "Updating..." : "Scheduling...") : (editingPatrol ? "Update Patrol" : "Schedule Patrol")}
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

        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Loading patrols...</p>
            </div>
          ) : patrols.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No patrols recorded yet. Click "Schedule Patrol" to add one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checkpoint</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guard</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {patrols.map((patrol) => (
                    <tr key={patrol.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{patrol.checkpointName}</div>
                        <div className="text-xs text-gray-500">{patrol.checkpointLocation}</div>
                      </td>
                      <td className="px-4 py-3">{patrol.guard?.name || "N/A"}</td>
                      <td className="px-4 py-3">{patrol.gate?.name || "N/A"}</td>
                      <td className="px-4 py-3 text-xs">{formatDateTime(patrol.scheduledTime)}</td>
                      <td className="px-4 py-3 text-xs">{patrol.actualTime ? formatDateTime(patrol.actualTime) : "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${getStatusBadge(patrol.status)}`}>
                          {patrol.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(patrol)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit patrol"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(patrol.id)}
                            disabled={deletingPatrolId === patrol.id}
                            className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                            title="Delete patrol"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
