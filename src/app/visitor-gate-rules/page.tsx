"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

type Mode = "ANY_ONE_APPROVAL" | "ALL_VILLAS_REQUIRED";

type SocStatus = "ACTIVE" | "INACTIVE";

type SocietyPayload = {
  id: string;
  name: string;
  status: SocStatus;
  visitorMultiVillaApprovalMode: Mode;
};

const modeLabels: Record<Mode, { title: string; description: string }> = {
  ANY_ONE_APPROVAL: {
    title: "Any one flat may approve",
    description:
      "When a guard selects multiple flats, the first resident approval allows entry. Other flats may still see the request until it is fully resolved.",
  },
  ALL_VILLAS_REQUIRED: {
    title: "Every flat must approve",
    description:
      "All selected flats must approve before the guest is allowed in. If any flat rejects, entry is denied.",
  },
};

export default function VisitorGateRulesPage() {
  const [society, setSociety] = useState<SocietyPayload | null>(null);
  const [mode, setMode] = useState<Mode>("ANY_ONE_APPROVAL");
  const [status, setStatus] = useState<SocStatus>("ACTIVE");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get("/society-settings")
      .then((res) => {
        const s = res.data?.society as SocietyPayload | undefined;
        if (s) {
          setSociety(s);
          setMode(s.visitorMultiVillaApprovalMode);
          setStatus(s.status ?? "ACTIVE");
        }
      })
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load settings";
        showToast(message, "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!society) return;

    const payload: { visitorMultiVillaApprovalMode?: Mode; status?: SocStatus } = {};
    if (mode !== society.visitorMultiVillaApprovalMode) {
      payload.visitorMultiVillaApprovalMode = mode;
    }
    if ((society.status ?? "ACTIVE") !== status) {
      payload.status = status;
    }
    if (Object.keys(payload).length === 0) {
      showToast("No changes to save", "success");
      return;
    }

    setSaving(true);
    try {
      await api.patch("/society-settings", payload);
      showToast("Society settings saved", "success");
      load();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not save";
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Gate visitor rules">
      <div className="max-w-2xl">
        <p className="text-gray-600 mb-6">
          When security adds a visitor for more than one flat and residents must approve, this
          setting defines how those approvals combine.
        </p>

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : !society ? (
          <p className="text-red-600">Could not load society settings.</p>
        ) : (
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Society</label>
              <p className="text-gray-700">{society.name}</p>
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-800 mb-1">Operating status</label>
                <p className="text-sm text-gray-600 mb-2">
                  When inactive, guards and residents cannot sign in or use the app. Society admins can still sign
                  in and change this back to active. Use with care.
                </p>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SocStatus)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white max-w-xs"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                Multi-flat approval rule
              </label>
              <div className="space-y-3">
                {(Object.keys(modeLabels) as Mode[]).map((key) => (
                  <label
                    key={key}
                    className={`flex gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      mode === key ? "border-blue-500 bg-blue-50/60" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      className="mt-1"
                      checked={mode === key}
                      onChange={() => setMode(key)}
                    />
                    <div>
                      <div className="font-medium text-gray-900">{modeLabels[key].title}</div>
                      <div className="text-sm text-gray-600 mt-1">{modeLabels[key].description}</div>
                    </div>
                  </label>
                ))}
              </div>

              {(society.visitorMultiVillaApprovalMode !== mode || (society.status ?? "ACTIVE") !== status) && (
                <p className="text-sm text-amber-700 mt-3">You have unsaved changes.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={
                saving ||
                (mode === society.visitorMultiVillaApprovalMode && (society.status ?? "ACTIVE") === status)
              }
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
