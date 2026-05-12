"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Radio, Send, TestTube } from "lucide-react";
import { api } from "@/lib/api";

type Diagnostics = {
  firebaseConfigured: boolean;
  registeredDevices: number;
  usersWithAtLeastOneDevice: number;
  notificationsCreatedLast24h: number;
};

const ROLE_OPTIONS = [
  { id: "RESIDENT", label: "Residents" },
  { id: "GUARD", label: "Guards" },
  { id: "ADMIN", label: "Admins" },
] as const;

export default function NotificationsAdminPage() {
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [roles, setRoles] = useState<string[]>(["RESIDENT"]);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const loadDiagnostics = useCallback(async () => {
    setLoadingDiag(true);
    try {
      const res = await api.get("/notifications/diagnostics");
      setDiagnostics(res.data);
    } finally {
      setLoadingDiag(false);
    }
  }, []);

  useEffect(() => {
    loadDiagnostics();
  }, [loadDiagnostics]);

  async function sendBroadcast(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setLastResult(null);
    try {
      const res = await api.post("/notifications/broadcast", {
        title,
        body,
        targetRoles: roles,
        category: "BROADCAST",
      });
      const data = res.data ?? {};
      setLastResult(
        `Sent to inbox for targeted roles. Rows created: ${data.rowsCreated ?? 0}. Firebase push: ${data.firebaseConfigured ? "attempted" : "skipped (configure Firebase)"}.`
      );
      setTitle("");
      setBody("");
      loadDiagnostics();
    } catch (err: any) {
      setLastResult(err?.response?.data?.message || "Failed to send broadcast");
    } finally {
      setSending(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setLastResult(null);
    try {
      const res = await api.post("/notifications/send-test");
      const data = res.data ?? {};
      setLastResult(
        `Test queued for your user only. Rows: ${data.rowsCreated ?? 0}. Push attempted: ${data.pushAttempted ?? false}. Configure FIREBASE_SERVICE_ACCOUNT_JSON on the API server for real device delivery.`
      );
      loadDiagnostics();
    } catch (err: any) {
      setLastResult(err?.response?.data?.message || "Failed to send test notification");
    } finally {
      setTesting(false);
    }
  }

  function toggleRole(id: string) {
    setRoles((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-fg-primary flex items-center gap-2">
          <Bell className="text-brand-primary" />
          Push & notifications
        </h1>
        <p className="text-fg-secondary mt-1">
          Society-wide messages create rows for each recipient&apos;s in-app inbox and optionally deliver via Firebase Cloud Messaging.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-body">
            <h2 className="font-semibold text-fg-primary mb-3 flex items-center gap-2">
              <Radio size={18} /> Registration snapshot
            </h2>
            {loadingDiag ? (
              <div className="loading-state">
                <div className="loading-spinner w-6 h-6"></div>
                <p className="loading-state-text text-sm">Loading...</p>
              </div>
            ) : diagnostics ? (
              <ul className="text-sm space-y-2 text-fg-primary">
                <li>
                  <strong>Firebase env on API:</strong>{" "}
                  {diagnostics.firebaseConfigured ? (
                    <span className="text-approved-fg">configured</span>
                  ) : (
                    <span className="text-pending-fg">not set — inbox rows still created</span>
                  )}
                </li>
                <li>
                  <strong>Registered device tokens:</strong> {diagnostics.registeredDevices}
                </li>
                <li>
                  <strong>Users with ≥1 device:</strong> {diagnostics.usersWithAtLeastOneDevice}
                </li>
                <li>
                  <strong>Notifications (24h):</strong> {diagnostics.notificationsCreatedLast24h}
                </li>
              </ul>
            ) : (
              <p className="text-brand-danger text-sm">Could not load diagnostics.</p>
            )}
            <button
              type="button"
              onClick={loadDiagnostics}
              className="mt-3 text-sm text-brand-primary hover:underline"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="card bg-brand-primary-light">
          <div className="card-body text-sm text-info-fg">
            <p className="font-medium mb-2">Backend setup</p>
            <p className="mb-2">
              Add <code className="bg-info-bg px-1 rounded">FIREBASE_SERVICE_ACCOUNT_JSON</code> to{" "}
              <code className="bg-info-bg px-1 rounded">backend/.env</code> with your Firebase service account JSON (single line).
            </p>
            <p>
              Automatic pushes fire on: <strong>SOS</strong> (guards + admins),{" "}
              <strong>new notices</strong> (residents), <strong>garbage entry</strong> &{" "}
              <strong>water toggle</strong> (residents). Mobile apps must register tokens via{" "}
              <code className="bg-info-bg px-1 rounded">POST /api/notifications/devices</code>.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={sendBroadcast} className="card">
        <div className="card-header">
          <h2 className="font-semibold text-fg-primary flex items-center gap-2">
            <Send size={18} /> Broadcast (common notification)
          </h2>
        </div>
        <div className="card-body space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="e.g. Annual general meeting"
              required
              maxLength={120}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input min-h-[100px]"
              placeholder="Message body shown in inbox + push"
              required
              maxLength={500}
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-fg-primary mb-2">Deliver to roles</span>
            <div className="flex flex-wrap gap-3">
              {ROLE_OPTIONS.map((r) => (
                <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roles.includes(r.id)}
                    onChange={() => toggleRole(r.id)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
            {roles.length === 0 && (
              <p className="text-brand-danger text-xs mt-1">Select at least one role.</p>
            )}
          </div>
          <button
            type="submit"
            disabled={sending || roles.length === 0}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Send size={18} />
            {sending ? "Sending..." : "Send broadcast"}
          </button>
        </div>
      </form>

      <div className="card">
        <div className="card-body flex flex-wrap items-center gap-4">
          <div>
            <h2 className="font-semibold text-fg-primary flex items-center gap-2 mb-1">
              <TestTube size={18} /> Send test to yourself
            </h2>
            <p className="text-sm text-fg-secondary">
              Creates one notification for the logged-in admin and attempts FCM if your device token is registered.
            </p>
          </div>
          <button
            type="button"
            onClick={sendTest}
            disabled={testing}
            className="btn btn-secondary"
          >
            {testing ? "Sending..." : "Send test"}
          </button>
        </div>
      </div>

      {lastResult && (
        <div className="rounded-lg bg-surface-background border border-surface-border px-4 py-3 text-sm text-fg-primary">
          {lastResult}
        </div>
      )}
    </div>
  );
}
