"use client";

import { useState } from "react";
import {
  Activity,
  BellRing,
  CheckCircle2,
  CreditCard,
  Scale,
  Send,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { api } from "@/lib/api";
import { useApiHealth } from "@/hooks/useApiHealth";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";

type SystemHealth = {
  api: { ok: boolean; checkedAt: string };
  reconciliation: {
    status: "HEALTHY" | "WARNING" | "CRITICAL";
    unresolvedAlerts: number;
    criticalAlerts: number;
    lastActivityAt: string | null;
    lastSeverity: string | null;
  };
  gateway: {
    lastPaymentLog: {
      id: string;
      status: string;
      at: string;
      cycleId: string;
    } | null;
    webhookEndpoint: string;
  };
  push: {
    firebaseConfigured: boolean;
    registeredDevices: number;
    usersWithAtLeastOneDevice: number;
    notificationsCreatedLast24h: number;
  };
  maintenance: {
    paymentsRecordedLast7Days: number;
  };
};

function statusBadge(status: SystemHealth["reconciliation"]["status"]) {
  if (status === "HEALTHY") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" /> Healthy
      </span>
    );
  }
  if (status === "CRITICAL") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
        <Scale className="h-3.5 w-3.5" /> Critical
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
      <Scale className="h-3.5 w-3.5" /> Warning
    </span>
  );
}

export default function SystemHealthPage() {
  const queryClient = useQueryClient();
  const [sendingTest, setSendingTest] = useState(false);
  const apiHealth = useApiHealth();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["systemHealth"],
    queryFn: async () => {
      const res = await api.get<SystemHealth>("/admin-ops/system-health");
      return res.data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  async function sendTestPush() {
    setSendingTest(true);
    try {
      await api.post("/notifications/send-test");
      showToast("Test notification sent to your account", "success");
      await queryClient.invalidateQueries({ queryKey: ["systemHealth"] });
    } catch (e) {
      showToast(parseApiError(e, "Failed to send test").message, "error");
    } finally {
      setSendingTest(false);
    }
  }

  return (
    <AppShell title="System health">
      <div className="space-y-6 p-6">
        <AdminPageHeader
          eyebrow="Operations"
          title="System health"
          description="API, reconciliation, gateway webhooks, and push delivery — self-diagnose without engineering."
          icon={<Activity className="h-6 w-6" />}
        />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-base font-semibold">API</h2>
            {apiHealth.data === true ? (
              <span className="text-xs text-emerald-700">/health OK</span>
            ) : apiHealth.data === false ? (
              <span className="text-xs text-red-700">/health failing</span>
            ) : (
              <span className="text-xs text-fg-secondary">checking…</span>
            )}
          </div>
          <div className="card-body text-sm text-fg-secondary space-y-1">
            <p>Origin health poll runs every 60s from the admin shell.</p>
            {data?.api.checkedAt && (
              <p>Server snapshot: {new Date(data.api.checkedAt).toLocaleString()}</p>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-base font-semibold">Reconciliation</h2>
            {data ? statusBadge(data.reconciliation.status) : null}
          </div>
          <div className="card-body text-sm space-y-2">
            {isLoading && <p className="text-fg-secondary">Loading…</p>}
            {isError && (
              <p className="text-red-700">Could not load system health. Check API session.</p>
            )}
            {data && (
              <>
                <p>
                  Unresolved alerts: <strong>{data.reconciliation.unresolvedAlerts}</strong>
                  {data.reconciliation.criticalAlerts > 0 && (
                    <> ({data.reconciliation.criticalAlerts} critical)</>
                  )}
                </p>
                {data.reconciliation.lastActivityAt && (
                  <p className="text-fg-secondary">
                    Last alert activity:{" "}
                    {new Date(data.reconciliation.lastActivityAt).toLocaleString()}
                  </p>
                )}
                <a href="/reconciliation" className="text-sm text-brand hover:underline">
                  Open reconciliation →
                </a>
              </>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-header flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <h2 className="text-base font-semibold">Gateway / webhooks</h2>
          </div>
          <div className="card-body text-sm space-y-2">
            <p className="text-fg-secondary">
              Webhook route: <code className="text-xs">{data?.gateway.webhookEndpoint ?? "—"}</code>
            </p>
            {data?.gateway.lastPaymentLog ? (
              <div>
                <p>
                  Last payment log: <strong>{data.gateway.lastPaymentLog.status}</strong>
                </p>
                <p className="text-fg-secondary">
                  {new Date(data.gateway.lastPaymentLog.at).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-fg-secondary">No gateway payment logs for this society yet.</p>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4" />
              <h2 className="text-base font-semibold">Push (FCM)</h2>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm inline-flex items-center gap-1"
              disabled={sendingTest || !data?.push.firebaseConfigured}
              onClick={() => void sendTestPush()}
            >
              <Send className="h-3.5 w-3.5" />
              {sendingTest ? "Sending…" : "Send test"}
            </button>
          </div>
          <div className="card-body text-sm space-y-1">
            {data && (
              <>
                <p>
                  Firebase:{" "}
                  {data.push.firebaseConfigured ? (
                    <span className="text-emerald-700">configured</span>
                  ) : (
                    <span className="text-amber-800">not configured (inbox only)</span>
                  )}
                </p>
                <p>Registered devices: {data.push.registeredDevices}</p>
                <p>Users with device: {data.push.usersWithAtLeastOneDevice}</p>
                <p>Notifications (24h): {data.push.notificationsCreatedLast24h}</p>
              </>
            )}
          </div>
        </section>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      </div>
    </AppShell>
  );
}
