"use client";

import { Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
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
      <div className="max-w-3xl space-y-6">
        <AdminPageHeader
          eyebrow="Approval policy"
          title="Gate visitor rules"
          description="Configure how multi-flat visitor approvals behave and control the operating status used by residents, guards, and admins."
          icon={<Settings2 className="h-6 w-6" />}
        />

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner w-10 h-10"></div>
            <p className="loading-state-text">Loading settings...</p>
          </div>
        ) : !society ? (
          <p className="text-brand-danger">Could not load society settings.</p>
        ) : (
          <form onSubmit={handleSave} className="card card-body space-y-6">
            <div>
              <label className="block text-sm font-semibold text-fg-primary mb-1">Society</label>
              <p className="text-fg-primary">{society.name}</p>
              <div className="mt-4">
                <label className="block text-sm font-semibold text-fg-primary mb-1">Operating status</label>
                <p className="text-sm text-fg-secondary mb-2">
                  When inactive, guards and residents cannot sign in or use the app. Society admins can still sign
                  in and change this back to active. Use with care.
                </p>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SocStatus)}
                  className="input max-w-xs"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-fg-primary mb-3">
                Multi-flat approval rule
              </label>
              <div className="space-y-3">
                {(Object.keys(modeLabels) as Mode[]).map((key) => (
                  <label
                    key={key}
                    className={`flex gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      mode === key ? "border-brand-primary bg-brand-primary-light/60" : "border-surface-border hover:border-surface-border"
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
                      <div className="font-medium text-fg-primary">{modeLabels[key].title}</div>
                      <div className="text-sm text-fg-secondary mt-1">{modeLabels[key].description}</div>
                    </div>
                  </label>
                ))}
              </div>

              {(society.visitorMultiVillaApprovalMode !== mode || (society.status ?? "ACTIVE") !== status) && (
                <p className="text-sm text-pending-fg mt-3">You have unsaved changes.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={
                saving ||
                (mode === society.visitorMultiVillaApprovalMode && (society.status ?? "ACTIVE") === status)
              }
              className="btn btn-primary"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
