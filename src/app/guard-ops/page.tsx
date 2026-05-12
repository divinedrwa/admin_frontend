"use client";

import { Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";

type WaterStatus = {
  gateId: string;
  gate: string;
  location: string | null;
  status: "ON" | "OFF";
  lastChanged: string | null;
  reason: string | null;
};

type GarbageEvent = {
  id: string;
  entryTime: string;
  exitTime: string | null;
  gate: {
    name: string;
  };
};

export default function GuardOperationsPage() {
  const [waterStatus, setWaterStatus] = useState<WaterStatus[]>([]);
  const [garbageEvent, setGarbageEvent] = useState<GarbageEvent | null>(null);
  const [_loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = () => {
    Promise.all([
      api.get("/water-supply/status"),
      api.get("/garbage-collection/active"),
    ])
      .then(([waterRes, garbageRes]) => {
        setWaterStatus(waterRes.data.status ?? []);
        setGarbageEvent(garbageRes.data.isInside ? garbageRes.data.event : null);
      })
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load data";
        showToast(message, "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleToggleWater = async () => {
    if (waterStatus.length === 0) return;
    const gate = waterStatus[0];
    const turnOn = gate.status !== "ON";
    const reason = window.prompt("Reason for status change (optional):") ?? undefined;
    try {
      setActionLoading(true);
      await api.post("/water-supply/toggle", {
        gateId: gate.gateId,
        turnedOn: turnOn,
        reason: reason || undefined,
      });
      showToast(`Water supply turned ${turnOn ? "ON" : "OFF"}`, "success");
      loadData();
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to toggle water supply").message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGarbageEntryExit = async () => {
    try {
      setActionLoading(true);
      if (garbageEvent) {
        await api.patch(`/garbage-collection/${garbageEvent.id}/exit`, {
          notes: "Marked exit from Guard Ops dashboard",
        });
        showToast("Garbage collector exit logged", "success");
      } else {
        if (waterStatus.length === 0) {
          showToast("No gate available to log entry", "error");
          return;
        }
        await api.post("/garbage-collection/entry", {
          gateId: waterStatus[0].gateId,
          notes: "Marked entry from Guard Ops dashboard",
        });
        showToast("Garbage collector entry logged", "success");
      }
      loadData();
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to update garbage event").message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppShell title="Guard Operations">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Live operations"
          title="Guard operations"
          description="Give guards a faster operational surface for water supply updates, garbage collection events, and linked security workflows."
          icon={<Shield className="h-6 w-6" />}
        />

        {/* Water Supply Control */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Water Supply Control</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {waterStatus.map((status) => (
              <div
                key={status.gate}
                className={`p-6 rounded border-2 ${
                  status.status === "ON"
                    ? "border-approved-solid bg-approved-bg"
                    : "border-surface-border bg-surface-background"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">{status.gate}</h3>
                  <span
                    className={`badge font-bold ${
                      status.status === "ON"
                        ? "badge-success"
                        : "badge-gray"
                    }`}
                  >
                    {status.status}
                  </span>
                </div>
                {status.location && (
                  <p className="text-sm text-fg-secondary mb-2">{status.location}</p>
                )}
                {status.lastChanged && (
                  <p className="text-xs text-fg-secondary">
                    Last changed: {new Date(status.lastChanged).toLocaleString("en-IN")}
                  </p>
                )}
                {status.reason && (
                  <p className="text-xs text-fg-secondary mt-1">Reason: {status.reason}</p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 bg-brand-primary-light border border-surface-border rounded p-4">
            <p className="text-sm text-info-fg">
              <strong>Note:</strong> Guards can turn water supply ON/OFF from their respective gates.
              All residents are automatically notified of status changes.
            </p>
          </div>
        </div>

        {/* Garbage Collection Alert */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Garbage Collection</h2>
          
          {garbageEvent ? (
            <div className="bg-pending-bg border-2 border-pending-solid rounded p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🚛</span>
                <div>
                  <h3 className="text-lg font-bold text-pending-fg">
                    Garbage Collector is Inside the Society
                  </h3>
                  <p className="text-sm text-pending-fg">
                    All residents have been notified to prepare their garbage
                  </p>
                </div>
              </div>
              <div className="flex gap-6 text-sm text-pending-fg">
                <div>
                  <span className="font-medium">Entry Gate:</span> {garbageEvent.gate.name}
                </div>
                <div>
                  <span className="font-medium">Entry Time:</span>{" "}
                  {new Date(garbageEvent.entryTime).toLocaleTimeString("en-IN")}
                </div>
                <div>
                  <span className="font-medium">Duration:</span>{" "}
                  {Math.floor(
                    (Date.now() - new Date(garbageEvent.entryTime).getTime()) / 60000
                  )}{" "}
                  minutes
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-surface-border rounded p-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✅</span>
                <div>
                  <h3 className="text-lg font-medium text-fg-primary">
                    No Garbage Collector Currently Inside
                  </h3>
                  <p className="text-sm text-fg-secondary">
                    Guards can log entry when garbage collector arrives
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 bg-brand-primary-light border border-surface-border rounded p-4">
            <p className="text-sm text-info-fg">
              <strong>How it works:</strong> When a guard logs garbage collector entry, all
              residents receive an instant notification (SMS/App) to prepare their garbage. The
              guard marks exit when the collector leaves.
            </p>
          </div>
        </div>

        {/* Quick Actions for Guards */}
        <div className="bg-surface-background border border-surface-border rounded p-6">
          <h3 className="font-semibold mb-3">Guard Quick Actions</h3>
          <div className="flex gap-3">
            <button
              className="btn btn-primary"
              onClick={handleToggleWater}
              disabled={actionLoading}
            >
              Toggle Water Supply
            </button>
            {garbageEvent ? (
              <button
                className="btn btn-danger"
                onClick={handleGarbageEntryExit}
                disabled={actionLoading}
              >
                Log Garbage Collector Exit
              </button>
            ) : (
              <button
                className="btn btn-success"
                onClick={handleGarbageEntryExit}
                disabled={actionLoading}
              >
                Log Garbage Collector Entry
              </button>
            )}
            <button
              className="btn btn-ghost"
              onClick={() => (window.location.href = "/guard-patrols")}
            >
              View History
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
