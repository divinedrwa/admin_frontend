"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { Save } from "lucide-react";

type SocietySettings = {
  id: string;
  name: string;
  status: string;
  visitorMultiVillaApprovalMode: string;
  visitorApprovalRequired: boolean;
  guardCanApproveVisitors: boolean;
  upiVpa: string | null;
  upiQrCodeUrl: string | null;
  lateFeePercentage: number;
  lateFeeFixedAmount: number;
  maintenanceGracePeriodDays: number;
};

export default function SocietySettingsPage() {
  const [settings, setSettings] = useState<SocietySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingVisitor, setSavingVisitor] = useState(false);
  const [savingLateFee, setSavingLateFee] = useState(false);
  const [savingUpi, setSavingUpi] = useState(false);

  // Visitor settings form
  const [visitorForm, setVisitorForm] = useState({
    visitorApprovalRequired: false,
    guardCanApproveVisitors: false,
    visitorMultiVillaApprovalMode: "ANY_ONE_APPROVAL",
  });

  // Late fee form
  const [lateFeeForm, setLateFeeForm] = useState({
    lateFeePercentage: 0,
    lateFeeFixedAmount: 0,
    maintenanceGracePeriodDays: 15,
  });

  // UPI form
  const [upiForm, setUpiForm] = useState({ upiVpa: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await api.get("/society-settings");
      const s = data.society as SocietySettings;
      setSettings(s);
      setVisitorForm({
        visitorApprovalRequired: s.visitorApprovalRequired,
        guardCanApproveVisitors: s.guardCanApproveVisitors,
        visitorMultiVillaApprovalMode: s.visitorMultiVillaApprovalMode,
      });
      setLateFeeForm({
        lateFeePercentage: s.lateFeePercentage,
        lateFeeFixedAmount: s.lateFeeFixedAmount,
        maintenanceGracePeriodDays: s.maintenanceGracePeriodDays,
      });
      setUpiForm({ upiVpa: s.upiVpa || "" });
    } catch (error) {
      const msg = parseApiError(error, "Failed to load settings").message;
      setLoadError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveVisitor = async () => {
    setSavingVisitor(true);
    try {
      await api.patch("/society-settings", visitorForm);
      showToast("Visitor settings saved", "success");
      await load();
    } catch (error) {
      showToast(parseApiError(error, "Failed to save").message, "error");
    } finally {
      setSavingVisitor(false);
    }
  };

  const saveLateFee = async () => {
    setSavingLateFee(true);
    try {
      await api.patch("/society-settings/late-fee", lateFeeForm);
      showToast("Late fee settings saved", "success");
      await load();
    } catch (error) {
      showToast(parseApiError(error, "Failed to save").message, "error");
    } finally {
      setSavingLateFee(false);
    }
  };

  const saveUpi = async () => {
    setSavingUpi(true);
    try {
      await api.patch("/society-settings", {
        upiVpa: upiForm.upiVpa || null,
      });
      showToast("UPI settings saved", "success");
      await load();
    } catch (error) {
      showToast(parseApiError(error, "Failed to save").message, "error");
    } finally {
      setSavingUpi(false);
    }
  };

  if (loading) return <AppShell title="Society Settings"><div className="loading-state"><div className="loading-spinner w-10 h-10"></div><p className="loading-state-text">Loading settings...</p></div></AppShell>;
  if (loadError || !settings) return <AppShell title="Society Settings"><p className="text-brand-danger">{loadError ?? "Failed to load settings."}</p></AppShell>;

  return (
    <AppShell title="Society Settings">
      <div className="space-y-6 max-w-3xl">
        {/* Society info */}
        <div className="card card-body">
          <h3 className="font-semibold text-fg-primary mb-2">Society Info</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-fg-secondary">Name:</span>
              <span className="ml-2 font-medium text-fg-primary">{settings.name}</span>
            </div>
            <div>
              <span className="text-fg-secondary">Status:</span>
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${settings.status === "ACTIVE" ? "bg-approved-bg text-approved-fg" : "bg-denied-bg text-denied-fg"}`}>
                {settings.status}
              </span>
            </div>
          </div>
        </div>

        {/* Visitor settings */}
        <div className="card card-body">
          <h3 className="font-semibold text-fg-primary mb-3">Visitor & Gate Settings</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm text-fg-primary">
              <input type="checkbox" checked={visitorForm.visitorApprovalRequired}
                onChange={(e) => setVisitorForm({ ...visitorForm, visitorApprovalRequired: e.target.checked })} />
              <span>Require resident approval before visitor entry</span>
            </label>
            <label className="flex items-center gap-3 text-sm text-fg-primary">
              <input type="checkbox" checked={visitorForm.guardCanApproveVisitors}
                onChange={(e) => setVisitorForm({ ...visitorForm, guardCanApproveVisitors: e.target.checked })} />
              <span>Guards can approve visitors directly (without resident confirmation)</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Multi-villa approval mode</label>
              <select value={visitorForm.visitorMultiVillaApprovalMode}
                onChange={(e) => setVisitorForm({ ...visitorForm, visitorMultiVillaApprovalMode: e.target.value })}
                className="input max-w-xs">
                <option value="ANY_ONE_APPROVAL">Any one villa approves</option>
                <option value="ALL_MUST_APPROVE">All villas must approve</option>
              </select>
            </div>
            <button onClick={saveVisitor} disabled={savingVisitor} className="btn btn-primary flex items-center gap-1">
              <Save size={14} /> {savingVisitor ? "Saving…" : "Save Visitor Settings"}
            </button>
          </div>
        </div>

        {/* Late fee settings */}
        <div className="card card-body">
          <h3 className="font-semibold text-fg-primary mb-3">Late Fee Automation</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-fg-primary">Late fee percentage (%)</label>
              <input type="number" step="0.1" min="0" max="100" value={lateFeeForm.lateFeePercentage}
                onChange={(e) => setLateFeeForm({ ...lateFeeForm, lateFeePercentage: parseFloat(e.target.value) || 0 })}
                className="input mt-1" />
              <p className="mt-0.5 text-xs text-fg-tertiary">0 = disabled. Typical: 1-5%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary">Fixed late fee (INR)</label>
              <input type="number" step="1" min="0" value={lateFeeForm.lateFeeFixedAmount}
                onChange={(e) => setLateFeeForm({ ...lateFeeForm, lateFeeFixedAmount: parseFloat(e.target.value) || 0 })}
                className="input mt-1" />
              <p className="mt-0.5 text-xs text-fg-tertiary">Applied only if percentage is 0</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary">Grace period (days)</label>
              <input type="number" min="0" max="90" value={lateFeeForm.maintenanceGracePeriodDays}
                onChange={(e) => setLateFeeForm({ ...lateFeeForm, maintenanceGracePeriodDays: parseInt(e.target.value) || 0 })}
                className="input mt-1" />
              <p className="mt-0.5 text-xs text-fg-tertiary">Days after due date before late fee</p>
            </div>
          </div>
          <button onClick={saveLateFee} disabled={savingLateFee} className="btn btn-primary mt-3 flex items-center gap-1">
            <Save size={14} /> {savingLateFee ? "Saving…" : "Save Late Fee Settings"}
          </button>
        </div>

        {/* UPI settings */}
        <div className="card card-body">
          <h3 className="font-semibold text-fg-primary mb-3">UPI Payment Settings</h3>
          <div>
            <label className="block text-sm font-medium text-fg-primary">UPI VPA</label>
            <input value={upiForm.upiVpa}
              onChange={(e) => setUpiForm({ upiVpa: e.target.value })}
              className="input mt-1 max-w-md"
              placeholder="e.g. society@upi" />
          </div>
          {settings.upiQrCodeUrl && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-fg-primary">QR Code</label>
              <img src={settings.upiQrCodeUrl} alt="UPI QR" className="mt-1 h-32 w-32 rounded border border-surface-border object-contain" loading="lazy" />
            </div>
          )}
          <button onClick={saveUpi} disabled={savingUpi} className="btn btn-primary mt-3 flex items-center gap-1">
            <Save size={14} /> {savingUpi ? "Saving…" : "Save UPI Settings"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
