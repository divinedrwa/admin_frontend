"use client";

import { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);
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
        {/* Water Supply Control */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Water Supply Control</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {waterStatus.map((status) => (
              <div
                key={status.gate}
                className={`p-6 rounded border-2 ${
                  status.status === "ON"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">{status.gate}</h3>
                  <span
                    className={`px-3 py-1 rounded font-bold ${
                      status.status === "ON"
                        ? "bg-green-600 text-white"
                        : "bg-gray-400 text-white"
                    }`}
                  >
                    {status.status}
                  </span>
                </div>
                {status.location && (
                  <p className="text-sm text-gray-600 mb-2">{status.location}</p>
                )}
                {status.lastChanged && (
                  <p className="text-xs text-gray-500">
                    Last changed: {new Date(status.lastChanged).toLocaleString("en-IN")}
                  </p>
                )}
                {status.reason && (
                  <p className="text-xs text-gray-600 mt-1">Reason: {status.reason}</p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Guards can turn water supply ON/OFF from their respective gates.
              All residents are automatically notified of status changes.
            </p>
          </div>
        </div>

        {/* Garbage Collection Alert */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Garbage Collection</h2>
          
          {garbageEvent ? (
            <div className="bg-yellow-50 border-2 border-yellow-500 rounded p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🚛</span>
                <div>
                  <h3 className="text-lg font-bold text-yellow-900">
                    Garbage Collector is Inside the Society
                  </h3>
                  <p className="text-sm text-yellow-800">
                    All residents have been notified to prepare their garbage
                  </p>
                </div>
              </div>
              <div className="flex gap-6 text-sm text-yellow-900">
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
            <div className="bg-white border border-gray-200 rounded p-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✅</span>
                <div>
                  <h3 className="text-lg font-medium text-gray-700">
                    No Garbage Collector Currently Inside
                  </h3>
                  <p className="text-sm text-gray-600">
                    Guards can log entry when garbage collector arrives
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-4">
            <p className="text-sm text-blue-800">
              <strong>How it works:</strong> When a guard logs garbage collector entry, all
              residents receive an instant notification (SMS/App) to prepare their garbage. The
              guard marks exit when the collector leaves.
            </p>
          </div>
        </div>

        {/* Quick Actions for Guards */}
        <div className="bg-gray-50 border border-gray-200 rounded p-6">
          <h3 className="font-semibold mb-3">Guard Quick Actions</h3>
          <div className="flex gap-3">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={handleToggleWater}
              disabled={actionLoading}
            >
              Toggle Water Supply
            </button>
            {garbageEvent ? (
              <button
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                onClick={handleGarbageEntryExit}
                disabled={actionLoading}
              >
                Log Garbage Collector Exit
              </button>
            ) : (
              <button
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                onClick={handleGarbageEntryExit}
                disabled={actionLoading}
              >
                Log Garbage Collector Entry
              </button>
            )}
            <button
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
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
