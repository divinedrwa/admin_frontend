"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Radio, Send, TestTube } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { api } from "@/lib/api";
import { parseApiError } from "@/utils/errorHandler";
import { captureError } from "@/lib/captureError";

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

  const loadDiagnostics = useCallback(async (signal?: AbortSignal) => {
    setLoadingDiag(true);
    try {
      const res = await api.get("/notifications/diagnostics", { signal });
      setDiagnostics(res.data);
    } catch (error) {
      if ((error as { name?: string }).name === "CanceledError") return;
      captureError(error, { source: "notifications.loadDiagnostics" });
      setDiagnostics(null);
    } finally {
      setLoadingDiag(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadDiagnostics(controller.signal);
    return () => controller.abort();
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
        `Message delivered to the in-app inbox of ${data.rowsCreated ?? 0} recipient(s). Push delivery: ${data.firebaseConfigured ? "attempted" : "not configured, inbox only"}.`
      );
      setTitle("");
      setBody("");
      loadDiagnostics();
    } catch (err: unknown) {
      setLastResult(parseApiError(err, "Failed to send broadcast").message);
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
        `Test notification created for your account. Push delivery ${data.pushAttempted ? "was attempted to your registered device" : "was skipped — check your inbox in the app"}.`
      );
      loadDiagnostics();
    } catch (err: unknown) {
      setLastResult(parseApiError(err, "Failed to send test notification").message);
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
    <div className="max-w-4xl mx-auto space-y-6">
      <AdminPageHeader
        eyebrow="Communications"
        title="Push & notifications"
        description="Send society-wide messages to residents, guards, and admins. Every message lands in the recipient's in-app inbox, and is also delivered as a push notification when available."
        icon={<Bell className="h-6 w-6" />}
      />

      <div className="card">
        <div className="card-body">
          <h2 className="font-semibold text-fg-primary mb-3 flex items-center gap-2">
            <Radio size={18} /> Delivery status
          </h2>
          {loadingDiag ? (
            <div className="loading-state">
              <div className="loading-spinner w-6 h-6"></div>
              <p className="loading-state-text text-sm">Loading...</p>
            </div>
          ) : diagnostics ? (
            <>
              <ul className="text-sm space-y-2 text-fg-primary">
                <li>
                  <strong>Push delivery:</strong>{" "}
                  {diagnostics.firebaseConfigured ? (
                    <span className="text-approved-fg">Active</span>
                  ) : (
                    <span className="text-pending-fg">Not configured</span>
                  )}
                </li>
                <li>
                  <strong>Registered devices:</strong> {diagnostics.registeredDevices}
                </li>
                <li>
                  <strong>Users reachable:</strong> {diagnostics.usersWithAtLeastOneDevice}
                </li>
                <li>
                  <strong>Notifications sent (last 24h):</strong>{" "}
                  {diagnostics.notificationsCreatedLast24h}
                </li>
              </ul>
              {!diagnostics.firebaseConfigured && (
                <p className="mt-3 text-sm text-fg-secondary">
                  Push notifications are not yet configured for this platform — contact support.
                  Messages are still delivered to each recipient&apos;s in-app inbox.
                </p>
              )}
            </>
          ) : (
            <p className="text-brand-danger text-sm">Could not load delivery status.</p>
          )}
          <button
            type="button"
            onClick={() => loadDiagnostics()}
            className="mt-3 text-sm text-brand-primary hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>

      <form onSubmit={sendBroadcast} className="card">
        <div className="card-header">
          <h2 className="font-semibold text-fg-primary flex items-center gap-2">
            <Send size={18} /> Broadcast a message
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
              Sends a sample notification to your own account so you can check how it looks before broadcasting.
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
