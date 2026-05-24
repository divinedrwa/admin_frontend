"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { showToast } from "@/components/Toast";
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
  const [saving, setSaving] = useState(false);

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
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveVisitor = async () => {
    setSaving(true);
    try {
      await api.patch("/society-settings", visitorForm);
      showToast("Visitor settings saved", "success");
      load();
    } catch { showToast("Failed to save", "error"); } finally { setSaving(false); }
  };

  const saveLateFee = async () => {
    setSaving(true);
    try {
      await api.patch("/society-settings/late-fee", lateFeeForm);
      showToast("Late fee settings saved", "success");
      load();
    } catch { showToast("Failed to save", "error"); } finally { setSaving(false); }
  };

  const saveUpi = async () => {
    setSaving(true);
    try {
      await api.patch("/society-settings", {
        upiVpa: upiForm.upiVpa || null,
      });
      showToast("UPI settings saved", "success");
      load();
    } catch { showToast("Failed to save", "error"); } finally { setSaving(false); }
  };

  if (loading) return <AppShell title="Society Settings"><p className="text-gray-500">Loading...</p></AppShell>;
  if (!settings) return <AppShell title="Society Settings"><p className="text-red-500">Failed to load settings.</p></AppShell>;

  return (
    <AppShell title="Society Settings">
      <div className="space-y-6 max-w-3xl">
        {/* Society info */}
        <div className="rounded border bg-white p-4">
          <h3 className="font-semibold mb-2">Society Info</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Name:</span>
              <span className="ml-2 font-medium">{settings.name}</span>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${settings.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {settings.status}
              </span>
            </div>
          </div>
        </div>

        {/* Visitor settings */}
        <div className="rounded border bg-white p-4">
          <h3 className="font-semibold mb-3">Visitor & Gate Settings</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={visitorForm.visitorApprovalRequired}
                onChange={(e) => setVisitorForm({ ...visitorForm, visitorApprovalRequired: e.target.checked })} />
              <span>Require resident approval before visitor entry</span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={visitorForm.guardCanApproveVisitors}
                onChange={(e) => setVisitorForm({ ...visitorForm, guardCanApproveVisitors: e.target.checked })} />
              <span>Guards can approve visitors directly (without resident confirmation)</span>
            </label>
            <div>
              <label className="block text-sm font-medium mb-1">Multi-villa approval mode</label>
              <select value={visitorForm.visitorMultiVillaApprovalMode}
                onChange={(e) => setVisitorForm({ ...visitorForm, visitorMultiVillaApprovalMode: e.target.value })}
                className="rounded border px-3 py-2 text-sm">
                <option value="ANY_ONE_APPROVAL">Any one villa approves</option>
                <option value="ALL_MUST_APPROVE">All villas must approve</option>
              </select>
            </div>
            <button onClick={saveVisitor} disabled={saving} className="flex items-center gap-1 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              <Save size={14} /> Save Visitor Settings
            </button>
          </div>
        </div>

        {/* Late fee settings */}
        <div className="rounded border bg-white p-4">
          <h3 className="font-semibold mb-3">Late Fee Automation</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium">Late fee percentage (%)</label>
              <input type="number" step="0.1" min="0" max="100" value={lateFeeForm.lateFeePercentage}
                onChange={(e) => setLateFeeForm({ ...lateFeeForm, lateFeePercentage: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              <p className="mt-0.5 text-xs text-gray-400">0 = disabled. Typical: 1-5%</p>
            </div>
            <div>
              <label className="block text-sm font-medium">Fixed late fee (INR)</label>
              <input type="number" step="1" min="0" value={lateFeeForm.lateFeeFixedAmount}
                onChange={(e) => setLateFeeForm({ ...lateFeeForm, lateFeeFixedAmount: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              <p className="mt-0.5 text-xs text-gray-400">Applied only if percentage is 0</p>
            </div>
            <div>
              <label className="block text-sm font-medium">Grace period (days)</label>
              <input type="number" min="0" max="90" value={lateFeeForm.maintenanceGracePeriodDays}
                onChange={(e) => setLateFeeForm({ ...lateFeeForm, maintenanceGracePeriodDays: parseInt(e.target.value) || 0 })}
                className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              <p className="mt-0.5 text-xs text-gray-400">Days after due date before late fee</p>
            </div>
          </div>
          <button onClick={saveLateFee} disabled={saving} className="mt-3 flex items-center gap-1 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
            <Save size={14} /> Save Late Fee Settings
          </button>
        </div>

        {/* UPI settings */}
        <div className="rounded border bg-white p-4">
          <h3 className="font-semibold mb-3">UPI Payment Settings</h3>
          <div>
            <label className="block text-sm font-medium">UPI VPA</label>
            <input value={upiForm.upiVpa}
              onChange={(e) => setUpiForm({ upiVpa: e.target.value })}
              className="mt-1 w-full max-w-md rounded border px-3 py-2 text-sm"
              placeholder="e.g. society@upi" />
          </div>
          {settings.upiQrCodeUrl && (
            <div className="mt-2">
              <label className="block text-sm font-medium">QR Code</label>
              <img src={settings.upiQrCodeUrl} alt="UPI QR" className="mt-1 h-32 w-32 rounded border object-contain" />
            </div>
          )}
          <button onClick={saveUpi} disabled={saving} className="mt-3 flex items-center gap-1 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
            <Save size={14} /> Save UPI Settings
          </button>
        </div>
      </div>
    </AppShell>
  );
}
