"use client";

import { MapPinned, Plus, Power, PowerOff, LogIn, LogOut } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { captureError } from "@/lib/captureError";
import { Gate, GateForm } from "@/types/gate";
import { useGates } from "@/hooks/useGates";

export default function GatesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading: loading } = useGates();
  const gates = data?.gates ?? [];
  const [showForm, setShowForm] = useState(false);
  const [editingGate, setEditingGate] = useState<Gate | null>(null);
  const [formData, setFormData] = useState<GateForm>({
    name: "",
    location: "",
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);

  // --- Water Supply state ---
  const [waterGateId, setWaterGateId] = useState("");
  const [waterReason, setWaterReason] = useState("");
  const [waterToggling, setWaterToggling] = useState(false);
  const [waterStatus, setWaterStatus] = useState<Record<string, string>>({});
  // Snapshot of the intended toggle taken when the confirmation modal opens,
  // so a background status refresh can't flip the gate/direction mid-confirm.
  const [waterConfirmTarget, setWaterConfirmTarget] = useState<{
    gateId: string;
    gateName: string;
    turnOn: boolean;
  } | null>(null);

  const fetchWaterStatus = useCallback(async () => {
    try {
      const res = await api.get("/water-supply/status");
      const map: Record<string, string> = {};
      for (const s of res.data?.status ?? []) {
        map[s.gateId] = s.status;
      }
      setWaterStatus(map);
    } catch (err: unknown) {
      captureError(err, { source: "gates.fetchWaterStatus" });
    }
  }, []);

  useEffect(() => { void fetchWaterStatus(); }, [fetchWaterStatus]);

  const openWaterConfirm = (turnOn: boolean) => {
    const gate = gates.find((g) => g.id === (waterGateId || gates[0]?.id));
    if (!gate) return;
    setWaterConfirmTarget({ gateId: gate.id, gateName: gate.name, turnOn });
  };

  const confirmWaterToggle = async () => {
    if (!waterConfirmTarget) return;
    const { gateId, turnOn } = waterConfirmTarget;
    try {
      setWaterToggling(true);
      await api.post("/water-supply/toggle", {
        gateId,
        turnedOn: turnOn,
        reason: waterReason || undefined,
      });
      showToast(
        turnOn
          ? "Water supply ON — residents notified"
          : "Water supply OFF — admins notified",
        "success",
      );
      setWaterReason("");
      setWaterConfirmTarget(null);
      void fetchWaterStatus();
    } catch (err: unknown) {
      showToast(parseApiError(err, "Failed to toggle water supply").message, "error");
    } finally {
      setWaterToggling(false);
    }
  };

  // --- Garbage Collection state ---
  const [garbageGateId, setGarbageGateId] = useState("");
  const [garbageNotes, setGarbageNotes] = useState("");
  const [garbageSubmitting, setGarbageSubmitting] = useState(false);
  const [activeGarbageEvent, setActiveGarbageEvent] = useState<{ id: string; entryTime: string; gate?: { name: string } | null } | null>(null);

  const fetchActiveGarbage = useCallback(async () => {
    try {
      const res = await api.get("/garbage-collection/active");
      setActiveGarbageEvent(res.data?.event ?? null);
    } catch (err: unknown) {
      captureError(err, { source: "gates.fetchActiveGarbage" });
    }
  }, []);

  useEffect(() => { void fetchActiveGarbage(); }, [fetchActiveGarbage]);

  const handleGarbageEntry = async () => {
    const gateId = garbageGateId || gates[0]?.id;
    if (!gateId) return;
    try {
      setGarbageSubmitting(true);
      await api.post("/garbage-collection/entry", { gateId, notes: garbageNotes || undefined });
      showToast("Garbage collector entry logged", "success");
      setGarbageNotes("");
      void fetchActiveGarbage();
    } catch (err: unknown) {
      showToast(parseApiError(err, "Failed to log entry").message, "error");
    } finally {
      setGarbageSubmitting(false);
    }
  };

  const handleGarbageExit = async () => {
    if (!activeGarbageEvent) return;
    try {
      setGarbageSubmitting(true);
      await api.patch(`/garbage-collection/${activeGarbageEvent.id}/exit`, { notes: garbageNotes || undefined });
      showToast("Garbage collector exit logged", "success");
      setGarbageNotes("");
      void fetchActiveGarbage();
    } catch (err: unknown) {
      showToast(parseApiError(err, "Failed to log exit").message, "error");
    } finally {
      setGarbageSubmitting(false);
    }
  };

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
      queryClient.invalidateQueries({ queryKey: ["gates"] });
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to save gate").message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedWaterGateId = waterGateId || gates[0]?.id || "";
  const selectedWaterStatus = selectedWaterGateId ? waterStatus[selectedWaterGateId] : undefined;

  return (
    <AppShell title="Gates Management">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Access points"
          title="Gates management"
          description="Configure entry and exit gates used by guards, visitor workflows, and shift assignments across the society perimeter."
          icon={<MapPinned className="h-6 w-6" />}
          actions={
            <button onClick={() => handleOpenForm()} className="btn btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Gate
            </button>
          }
        />

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
                  <th scope="col" className="table-th">Gate Name</th>
                  <th scope="col" className="table-th">Location</th>
                  <th scope="col" className="table-th">Status</th>
                  <th scope="col" className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {gates.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState
                        icon={<MapPinned className="h-12 w-12" />}
                        title="No gates found"
                        description="Click &quot;Add Gate&quot; to create your first gate."
                      />
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

        {/* Gate Utility Controls */}
        {gates.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Water Supply Control */}
            <div className="card p-5">
              <h2 className="text-lg font-semibold text-fg-primary mb-4 flex items-center gap-2">
                <Power className="h-5 w-5 text-brand-primary" />
                Water Supply
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-fg-secondary mb-1">Gate</label>
                  <select
                    value={waterGateId || gates[0]?.id || ""}
                    onChange={(e) => setWaterGateId(e.target.value)}
                    className="input w-full"
                  >
                    {gates.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} {waterStatus[g.id] ? `(${waterStatus[g.id]})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-secondary mb-1">Reason (optional)</label>
                  <input
                    type="text"
                    value={waterReason}
                    onChange={(e) => setWaterReason(e.target.value)}
                    placeholder="e.g. Scheduled maintenance"
                    className="input w-full"
                  />
                </div>
                <div className="flex gap-3">
                  {/* Only offer the action that changes state; show both when status is unknown */}
                  {selectedWaterStatus !== "ON" && (
                    <button
                      onClick={() => openWaterConfirm(true)}
                      disabled={waterToggling}
                      className="btn bg-approved-solid hover:bg-approved-solid/90 text-white flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Power className="h-4 w-4" />
                      Turn ON
                    </button>
                  )}
                  {selectedWaterStatus !== "OFF" && (
                    <button
                      onClick={() => openWaterConfirm(false)}
                      disabled={waterToggling}
                      className="btn bg-brand-danger hover:bg-brand-danger/90 text-white flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <PowerOff className="h-4 w-4" />
                      Turn OFF
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Garbage Collection Control */}
            <div className="card p-5">
              <h2 className="text-lg font-semibold text-fg-primary mb-4 flex items-center gap-2">
                <LogIn className="h-5 w-5 text-brand-primary" />
                Garbage Collection
              </h2>
              {activeGarbageEvent && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-approved-bg text-approved-fg text-sm">
                  <div className="h-2.5 w-2.5 rounded-full bg-approved-solid animate-pulse" />
                  Collector inside{activeGarbageEvent.gate ? ` (${activeGarbageEvent.gate.name})` : ""}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-fg-secondary mb-1">Gate</label>
                  <select
                    value={garbageGateId || gates[0]?.id || ""}
                    onChange={(e) => setGarbageGateId(e.target.value)}
                    className="input w-full"
                  >
                    {gates.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-secondary mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={garbageNotes}
                    onChange={(e) => setGarbageNotes(e.target.value)}
                    placeholder="e.g. Municipal truck"
                    className="input w-full"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleGarbageEntry}
                    disabled={garbageSubmitting || !!activeGarbageEvent}
                    className="btn bg-approved-solid hover:bg-approved-solid/90 text-white flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                    title={activeGarbageEvent ? "A collector is already inside" : ""}
                  >
                    <LogIn className="h-4 w-4" />
                    Inside
                  </button>
                  <button
                    onClick={handleGarbageExit}
                    disabled={garbageSubmitting || !activeGarbageEvent}
                    className="btn bg-brand-danger hover:bg-brand-danger/90 text-white flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                    title={!activeGarbageEvent ? "No active collection event" : ""}
                  >
                    <LogOut className="h-4 w-4" />
                    Left from Society
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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

      <Modal open={!!waterConfirmTarget} onClose={() => setWaterConfirmTarget(null)}>
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-fg-primary">Toggle water supply</h3>
          </div>
          <div className="card-body space-y-3">
            <p className="text-sm text-fg-secondary">
              Water will be turned <strong>{waterConfirmTarget?.turnOn ? "ON" : "OFF"}</strong> for{" "}
              {waterConfirmTarget?.gateName ?? "the gate"}.
            </p>
            <p className="text-sm text-fg-secondary">
              {waterConfirmTarget?.turnOn ? (
                <>Residents will receive: &quot;Water supply will begin shortly.&quot;</>
              ) : (
                <>Only society admins will be notified (residents will not).</>
              )}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn btn-ghost text-sm"
                onClick={() => setWaterConfirmTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary text-sm"
                disabled={waterToggling}
                onClick={() => void confirmWaterToggle()}
              >
                {waterToggling ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
