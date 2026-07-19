"use client";

import { Activity, RefreshCw, Smartphone, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { api } from "@/lib/api";
import { parseApiError } from "@/utils/errorHandler";

type SummaryTotals = {
  dailyActiveUsers?: number;
  weeklyActiveUsers?: number;
  uniqueActiveUsers?: number;
  logins?: number;
  sessions?: number;
  screenViews?: number;
  avgSessionDurationMs?: number;
  registeredAccounts?: number;
  uniqueDevices?: number;
  flowCompletions?: number;
  errors?: number;
};

type Summary = {
  period?: { days: number; startDate: string; endDate: string };
  totals?: SummaryTotals;
  pushDevices?: {
    registered?: number;
    activeToday?: number;
    activeWeek?: number;
    byPlatform?: Record<string, number>;
  };
  byPlatform?: { platform: string; sessionCount: number }[];
  byAppVersion?: { appVersion: string; sessionCount: number }[];
  accountsByRole?: { role: string; count: number }[];
  engagement?: {
    activeInPeriod?: number;
    inactiveInPeriod?: number;
    neverUsedApp?: number;
    deactivatedAccounts?: number;
    byRole?: { role: string; active: number; inactive: number; neverUsed: number }[];
  };
  activeUsersByRole?: { role: string; count: number }[];
};

type EngagementUser = {
  userId: string;
  name: string;
  username?: string;
  role: string;
  villaNumber?: string | null;
  status?: string;
  lastSeenAt?: string | null;
};

type TrendRow = {
  date: string;
  displayDate: string;
  activeUsers: number;
  logins: number;
  sessions: number;
  events: number;
};

function fmtDuration(ms: number): string {
  if (!ms || ms <= 0) return "—";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function AppAnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<TrendRow[]>([]);
  const [screens, setScreens] = useState<{ screen: string; views: number }[]>([]);
  const [users, setUsers] = useState<
    { name: string; role: string; lastSeenAt: string; appVersion?: string | null; isActive?: boolean }[]
  >([]);
  const [engagement, setEngagement] = useState<{
    inactiveUsers?: EngagementUser[];
    neverUsedUsers?: EngagementUser[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError("");
      const [summaryRes, trendRes, screensRes, usersRes, engagementRes] = await Promise.all([
        api.get("/app-analytics/summary", { params: { days: 30 }, signal }),
        api.get("/app-analytics/daily-trend", { params: { days: 14 }, signal }),
        api.get("/app-analytics/screens", { params: { days: 30 }, signal }),
        api.get("/app-analytics/active-users", { params: { days: 7, limit: 30 }, signal }),
        api.get("/app-analytics/user-engagement", { params: { days: 30, limit: 30 }, signal }),
      ]);
      setSummary(summaryRes.data.summary ?? null);
      setTrend(trendRes.data.trendData ?? []);
      setScreens(screensRes.data.screens ?? []);
      setUsers(usersRes.data.users ?? []);
      setEngagement(engagementRes.data.engagement ?? null);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "CanceledError") return;
      setError(parseApiError(err, "Failed to load app analytics").message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const t = summary?.totals ?? {};
  const push = summary?.pushDevices ?? {};
  const eng = summary?.engagement ?? {};
  const inactive = engagement?.inactiveUsers ?? [];
  const neverUsed = engagement?.neverUsedUsers ?? [];

  return (
    <AppShell title="App usage analytics">
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <AdminPageHeader
          eyebrow="Mobile & web analytics"
          title="App usage"
          description="Firebase Analytics + first-party server dashboard — all roles (resident, guard, admin)."
          icon={<Smartphone className="h-6 w-6" />}
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error ? (
          <EmptyState
            icon={<Activity className="h-12 w-12" />}
            title="Could not load analytics"
            description={error}
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Daily active users" value={t.dailyActiveUsers ?? 0} />
              <MetricCard label="Weekly active users" value={t.weeklyActiveUsers ?? 0} />
              <MetricCard label="Logins (30 days)" value={t.logins ?? 0} />
              <MetricCard label="Sessions (30 days)" value={t.sessions ?? 0} />
              <MetricCard label="Screen views" value={t.screenViews ?? 0} />
              <MetricCard label="Avg session length" value={fmtDuration(t.avgSessionDurationMs ?? 0)} />
              <MetricCard label="Registered accounts" value={t.registeredAccounts ?? 0} />
              <MetricCard label="Unique devices" value={t.uniqueDevices ?? 0} />
            </div>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Users className="h-5 w-5" />
                User engagement (30 days)
              </h2>
              <dl className="grid gap-2 sm:grid-cols-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Active in period</dt>
                  <dd className="text-xl font-semibold">{eng.activeInPeriod ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Inactive (dormant)</dt>
                  <dd className="text-xl font-semibold">{eng.inactiveInPeriod ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Never opened app</dt>
                  <dd className="text-xl font-semibold">{eng.neverUsedApp ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Deactivated</dt>
                  <dd className="text-xl font-semibold">{eng.deactivatedAccounts ?? 0}</dd>
                </div>
              </dl>
              {(summary?.activeUsersByRole?.length ?? 0) > 0 && (
                <ul className="mt-4 flex flex-wrap gap-4 text-sm">
                  {summary!.activeUsersByRole!.map((r) => (
                    <li key={r.role}>
                      <span className="font-medium">{r.role}</span>: {r.count} active
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Activity className="h-5 w-5 text-primary" />
                Push devices (install proxy)
              </h2>
              <dl className="grid gap-2 sm:grid-cols-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Registered</dt>
                  <dd className="text-xl font-semibold">{push.registered ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Active today</dt>
                  <dd className="text-xl font-semibold">{push.activeToday ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Active this week</dt>
                  <dd className="text-xl font-semibold">{push.activeWeek ?? 0}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-lg font-semibold">Daily trend (14 days)</h2>
              {trend.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No data yet. Metrics appear after residents, guards, or admins open the app.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4">Active users</th>
                        <th className="py-2 pr-4">Logins</th>
                        <th className="py-2 pr-4">Sessions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trend.map((row) => (
                        <tr key={row.date} className="border-b border-border/60">
                          <td className="py-2 pr-4">{row.displayDate}</td>
                          <td className="py-2 pr-4">{row.activeUsers}</td>
                          <td className="py-2 pr-4">{row.logins}</td>
                          <td className="py-2 pr-4">{row.sessions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 text-lg font-semibold">Top screens</h2>
                {screens.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No screen views recorded yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {screens.slice(0, 15).map((s) => (
                      <li key={s.screen} className="flex justify-between gap-4">
                        <span className="truncate font-mono text-xs">{s.screen}</span>
                        <span className="text-muted-foreground">{s.views} views</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <Users className="h-5 w-5" />
                  Recently active users
                </h2>
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {users.map((u) => (
                      <li key={`${u.name}-${u.lastSeenAt}`} className="flex justify-between gap-4">
                        <span>
                          {u.name}{" "}
                          <span className="text-muted-foreground">({u.role})</span>
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          {u.lastSeenAt?.slice(0, 10)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {(inactive.length > 0 || neverUsed.length > 0) && (
              <div className="grid gap-4 lg:grid-cols-2">
                {inactive.length > 0 && (
                  <section className="rounded-xl border border-border bg-card p-4">
                    <h2 className="mb-3 text-lg font-semibold">Dormant users</h2>
                    <ul className="space-y-2 text-sm">
                      {inactive.slice(0, 15).map((u) => (
                        <li key={u.userId} className="flex justify-between gap-4">
                          <span>
                            {u.name}{" "}
                            <span className="text-muted-foreground">({u.role})</span>
                          </span>
                          <span className="shrink-0 text-muted-foreground">
                            {u.villaNumber ?? u.username ?? "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {neverUsed.length > 0 && (
                  <section className="rounded-xl border border-border bg-card p-4">
                    <h2 className="mb-3 text-lg font-semibold">Never used app</h2>
                    <ul className="space-y-2 text-sm">
                      {neverUsed.slice(0, 15).map((u) => (
                        <li key={u.userId} className="flex justify-between gap-4">
                          <span>
                            {u.name}{" "}
                            <span className="text-muted-foreground">({u.role})</span>
                          </span>
                          <span className="shrink-0 text-muted-foreground">{u.username}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}

            {(summary?.byPlatform?.length ?? 0) > 0 && (
              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 text-lg font-semibold">Platform breakdown</h2>
                <ul className="flex flex-wrap gap-4 text-sm">
                  {summary!.byPlatform!.map((p) => (
                    <li key={p.platform}>
                      <span className="font-medium">{p.platform}</span>: {p.sessionCount} sessions
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
