"use client";

import { Plus, Route } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { useConfirm } from "@/components/ConfirmDialog";
import { useGuardPatrols } from "@/hooks/useGuardPatrols";
import { useGuards } from "@/hooks/useGuardShifts";
import { useGates } from "@/hooks/useGates";
import { GuardPatrol } from "@/types/guard";

export default function GuardPatrolsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingPatrol, setEditingPatrol] = useState<GuardPatrol | null>(null);
  const [deletingPatrolId, setDeletingPatrolId] = useState<string | null>(null);
  const { confirm, ConfirmUI } = useConfirm();
  const [formData, setFormData] = useState({
    guardId: "",
    gateId: "",
    checkpointName: "",
    checkpointLocation: "",
    scheduledTime: "",
    notes: ""
  });

  const { data: patrolsData, isLoading: loading } = useGuardPatrols();
  const patrols = patrolsData?.patrols ?? [];

  const { data: guards = [] } = useGuards();
  const { data: gatesData } = useGates();
  const gates = gatesData?.gates ?? [];

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
    if (!(await confirm({ title: "Delete patrol", message: "Are you sure you want to delete this patrol? This action cannot be undone.", confirmLabel: "Delete" }))) {
      return;
    }

    setDeletingPatrolId(patrolId);
    try {
      await api.delete(`/guard-patrols/${patrolId}`);
      showToast("Patrol deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["guard-patrols"] });
    } catch (error: unknown) {
      const message = parseApiError(error, "Failed to delete patrol").message;
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
      queryClient.invalidateQueries({ queryKey: ["guard-patrols"] });
    } catch (error: unknown) {
      const message = parseApiError(error, editingPatrol ? "Failed to update patrol" : "Failed to schedule patrol").message;
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
      SCHEDULED: "badge-primary",
      IN_PROGRESS: "badge-warning",
      COMPLETED: "badge-success",
      MISSED: "badge-danger",
    };
    return badges[status] || "badge-gray";
  };

  return (
    <AppShell title="Guard Patrols">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Field supervision"
          title="Guard patrols"
          description="Schedule patrol checkpoints, review guard activity, and keep patrol execution more visible for day-to-day security operations."
          icon={<Route className="h-6 w-6" />}
          actions={
            <button onClick={handleOpenForm} className="btn btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Schedule Patrol
            </button>
          }
        />

        {showForm && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">{editingPatrol ? "Edit Patrol" : "Schedule New Patrol"}</h2>
            </div>
            <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingPatrol ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-1">
                      Guard *
                    </label>
                    <select
                      required
                      value={formData.guardId}
                      onChange={(e) => setFormData({ ...formData, guardId: e.target.value })}
                      className="input"
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
                    <label className="block text-sm font-medium text-fg-primary mb-1">
                      Gate *
                    </label>
                    <select
                      required
                      value={formData.gateId}
                      onChange={(e) => setFormData({ ...formData, gateId: e.target.value })}
                      className="input"
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
                <div className="bg-surface-background p-3 rounded">
                  <p className="text-sm text-fg-secondary">
                    <span className="font-medium">Guard:</span> {editingPatrol.guard.name} | 
                    <span className="font-medium ml-2">Gate:</span> {editingPatrol.gate.name}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">
                  Checkpoint Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.checkpointName}
                  onChange={(e) => setFormData({ ...formData, checkpointName: e.target.value })}
                  className="input"
                  placeholder="e.g., Main Gate Area, Block A Perimeter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">
                  Checkpoint Location (Optional)
                </label>
                <input
                  type="text"
                  value={formData.checkpointLocation}
                  onChange={(e) => setFormData({ ...formData, checkpointLocation: e.target.value })}
                  className="input"
                  placeholder="Detailed location description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">
                  Scheduled Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  placeholder="Additional instructions or notes..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? (editingPatrol ? "Updating..." : "Scheduling...") : (editingPatrol ? "Update Patrol" : "Schedule Patrol")}
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

        <div className="table-wrapper">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner w-10 h-10"></div>
              <p className="loading-state-text">Loading patrols...</p>
            </div>
          ) : patrols.length === 0 ? (
            <EmptyState
              icon={<Route className="h-12 w-12" />}
              title="No Patrols Recorded"
              description="Click &quot;Schedule Patrol&quot; to add one."
            />
          ) : (
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th scope="col" className="table-th">Checkpoint</th>
                    <th scope="col" className="table-th">Guard</th>
                    <th scope="col" className="table-th">Gate</th>
                    <th scope="col" className="table-th">Scheduled</th>
                    <th scope="col" className="table-th">Actual</th>
                    <th scope="col" className="table-th">Status</th>
                    <th scope="col" className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patrols.map((patrol) => (
                    <tr key={patrol.id} className="table-row">
                      <td className="table-td">
                        <div className="font-medium">{patrol.checkpointName}</div>
                        <div className="text-xs text-fg-secondary">{patrol.checkpointLocation}</div>
                      </td>
                      <td className="table-td">{patrol.guard?.name || "N/A"}</td>
                      <td className="table-td">{patrol.gate?.name || "N/A"}</td>
                      <td className="table-td text-xs">{formatDateTime(patrol.scheduledTime)}</td>
                      <td className="table-td text-xs">{patrol.actualTime ? formatDateTime(patrol.actualTime) : "-"}</td>
                      <td className="table-td">
                        <span className={`badge ${getStatusBadge(patrol.status)}`}>
                          {patrol.status}
                        </span>
                      </td>
                      <td className="table-td">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(patrol)}
                            className="p-1 text-brand-primary hover:bg-brand-primary-light rounded"
                            title="Edit patrol"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(patrol.id)}
                            disabled={deletingPatrolId === patrol.id}
                            className="p-1 text-brand-danger hover:bg-denied-bg rounded disabled:opacity-50"
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
          )}
        </div>
      </div>
      {ConfirmUI}
    </AppShell>
  );
}
