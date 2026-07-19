"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Smartphone,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
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
  monthlyActiveUsers?: number;
  stickinessPct?: number;
  logins?: number;
  sessions?: number;
  screenViews?: number;
  actions?: number;
  flowCompletions?: number;
  errors?: number;
  avgSessionDurationMs?: number;
  registeredAccounts?: number;
  uniqueDevices?: number;
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

type FlowRow = {
  flowId: string;
  count: number;
  successRate: number;
  avgDurationMs: number;
};

type ActionRow = {
  action: string;
  label: string;
  count: number;
  uniqueUsers: number;
  adoptionPct: number;
};

type ErrorRow = {
  error: string;
  count: number;
  uniqueUsers: number;
  lastOccurredAt: string;
};

type Insights = {
  stickiness?: {
    dailyActiveUsers?: number;
    weeklyActiveUsers?: number;
    monthlyActiveUsers?: number;
    stickinessPct?: number;
    wauMauPct?: number;
  };
  retention?: { d7Pct?: number; d30Pct?: number };
  peakHours?: { hour: number; label: string; count: number }[];
  hourlyData?: { hour: number; label: string; count: number }[];
  weekdayUsage?: { day: number; label: string; count: number }[];
  sessionsByRole?: { role: string; count: number }[];
};

const PERIOD_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

function fmtDuration(ms: number): string {
  if (!ms || ms <= 0) return "—";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function BarChart({
  items,
  valueKey,
  labelKey,
  maxBars = 24,
}: {
  items: Record<string, unknown>[];
  valueKey: string;
  labelKey: string;
  maxBars?: number;
}) {
  const slice = items.slice(0, maxBars);
  const max = Math.max(...slice.map((i) => Number(i[valueKey] ?? 0)), 1);
  return (
    <div className="space-y-2">
      {slice.map((item, idx) => {
        const val = Number(item[valueKey] ?? 0);
        const pct = (val / max) * 100;
        return (
          <div key={`${item[labelKey]}-${idx}`} className="flex items-center gap-3">
            <div className="w-20 shrink-0 truncate text-xs text-muted-foreground">
              {String(item[labelKey])}
            </div>
            <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-md bg-primary/80"
                style={{ width: `${pct}%` }}
              />
              <span className="relative z-10 px-2 text-xs font-medium leading-7">{val}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AppAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<TrendRow[]>([]);
  const [screens, setScreens] = useState<{ screen: string; views: number }[]>([]);
  const [flows, setFlows] = useState<FlowRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [errorTotals, setErrorTotals] = useState<{ errorRatePct?: number }>({});
  const [insights, setInsights] = useState<Insights | null>(null);
  const [users, setUsers] = useState<
    {
      name: string;
      role: string;
      lastSeenAt: string;
      appVersion?: string | null;
      platform?: string;
      sessionCount?: number;
    }[]
  >([]);
  const [engagement, setEngagement] = useState<{
    inactiveUsers?: EngagementUser[];
    neverUsedUsers?: EngagementUser[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true);
        setError("");
        const trendDays = Math.min(days, 14);
        const [
          summaryRes,
          trendRes,
          screensRes,
          flowsRes,
          actionsRes,
          errorsRes,
          insightsRes,
          usersRes,
          engagementRes,
        ] = await Promise.all([
          api.get("/app-analytics/summary", { params: { days }, signal }),
          api.get("/app-analytics/daily-trend", { params: { days: trendDays }, signal }),
          api.get("/app-analytics/screens", { params: { days }, signal }),
          api.get("/app-analytics/flows", { params: { days }, signal }),
          api.get("/app-analytics/actions", { params: { days }, signal }),
          api.get("/app-analytics/errors", { params: { days }, signal }),
          api.get("/app-analytics/insights", { params: { days }, signal }),
          api.get("/app-analytics/active-users", { params: { days: 7, limit: 30 }, signal }),
          api.get("/app-analytics/user-engagement", { params: { days, limit: 30 }, signal }),
        ]);
        setSummary(summaryRes.data.summary ?? null);
        setTrend(trendRes.data.trendData ?? []);
        setScreens(screensRes.data.screens ?? []);
        setFlows(flowsRes.data.flows ?? []);
        setActions(actionsRes.data.actions ?? []);
        setErrors(errorsRes.data.errors ?? []);
        setErrorTotals(errorsRes.data.totals ?? {});
        setInsights(insightsRes.data.insights ?? null);
        setUsers(usersRes.data.users ?? []);
        setEngagement(engagementRes.data.engagement ?? null);
      } catch (err: unknown) {
        if ((err as { name?: string }).name === "CanceledError") return;
        setError(parseApiError(err, "Failed to load app analytics").message);
      } finally {
        setLoading(false);
      }
    },
    [days],
  );

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
  const stickiness = insights?.stickiness ?? {};
  const retention = insights?.retention ?? {};

  return (
    <AppShell title="App usage analytics">
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <AdminPageHeader
          eyebrow="Mobile & web analytics"
          title="App usage"
          description="Dual telemetry: Firebase Analytics + first-party server data. Tracks residents, guards, and admins for adoption, retention, and business growth."
          icon={<Smartphone className="h-6 w-6" />}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Last {o.label}
              </option>
            ))}
          </select>
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
              <MetricCard label="Daily active (DAU)" value={t.dailyActiveUsers ?? 0} />
              <MetricCard label="Weekly active (WAU)" value={t.weeklyActiveUsers ?? 0} />
              <MetricCard
                label="Monthly active (MAU)"
                value={t.monthlyActiveUsers ?? t.uniqueActiveUsers ?? 0}
              />
              <MetricCard label="Stickiness (DAU/MAU)" value={`${t.stickinessPct ?? stickiness.stickinessPct ?? 0}%`} />
              <MetricCard label="Logins" value={t.logins ?? 0} />
              <MetricCard label="Sessions" value={t.sessions ?? 0} />
              <MetricCard label="Screen views" value={t.screenViews ?? 0} />
              <MetricCard label="Business actions" value={t.actions ?? 0} />
              <MetricCard label="Guard flows" value={t.flowCompletions ?? 0} />
              <MetricCard label="Errors" value={t.errors ?? 0} accent={t.errors ? "danger" : undefined} />
              <MetricCard label="Avg session" value={fmtDuration(t.avgSessionDurationMs ?? 0)} />
              <MetricCard label="Registered accounts" value={t.registeredAccounts ?? 0} />
            </div>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <TrendingUp className="h-5 w-5 text-primary" />
                Growth & retention
              </h2>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">7-day retention</dt>
                  <dd className="text-2xl font-semibold">{retention.d7Pct ?? 0}%</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">30-day retention</dt>
                  <dd className="text-2xl font-semibold">{retention.d30Pct ?? 0}%</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">WAU / MAU</dt>
                  <dd className="text-2xl font-semibold">{stickiness.wauMauPct ?? 0}%</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Unique devices</dt>
                  <dd className="text-2xl font-semibold">{t.uniqueDevices ?? 0}</dd>
                </div>
              </dl>
              {(insights?.peakHours?.length ?? 0) > 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Peak usage:{" "}
                  {insights!.peakHours!.map((p) => `${p.label} (${p.count})`).join(" · ")}
                </p>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Users className="h-5 w-5" />
                User engagement ({days} days)
              </h2>
              <dl className="grid gap-2 sm:grid-cols-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Active in period</dt>
                  <dd className="text-xl font-semibold">{eng.activeInPeriod ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Dormant</dt>
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
              {(eng.byRole?.length ?? 0) > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-4">Role</th>
                        <th className="py-2 pr-4">Active</th>
                        <th className="py-2 pr-4">Dormant</th>
                        <th className="py-2 pr-4">Never used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eng.byRole!.map((r) => (
                        <tr key={r.role} className="border-b border-border/60">
                          <td className="py-2 pr-4 font-medium">{r.role}</td>
                          <td className="py-2 pr-4">{r.active}</td>
                          <td className="py-2 pr-4">{r.inactive}</td>
                          <td className="py-2 pr-4">{r.neverUsed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <BarChart3 className="h-5 w-5" />
                  Daily active users
                </h2>
                {trend.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No trend data yet.</p>
                ) : (
                  <BarChart
                    items={trend.map((r) => ({
                      label: r.displayDate.slice(5),
                      value: r.activeUsers,
                    }))}
                    labelKey="label"
                    valueKey="value"
                  />
                )}
              </section>

              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <Zap className="h-5 w-5" />
                  Peak hours (sessions)
                </h2>
                {(insights?.hourlyData?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No hourly data yet.</p>
                ) : (
                  <BarChart
                    items={
                      insights!.hourlyData!.filter((h) => h.count > 0) as unknown as Record<
                        string,
                        unknown
                      >[]
                    }
                    labelKey="label"
                    valueKey="count"
                    maxBars={12}
                  />
                )}
              </section>
            </div>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Target className="h-5 w-5 text-primary" />
                Business actions & feature adoption
              </h2>
              {actions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No business actions yet. Tracks payments, complaints, visitor pre-approvals, notice
                  publishes, and more.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-4">Feature</th>
                        <th className="py-2 pr-4">Events</th>
                        <th className="py-2 pr-4">Unique users</th>
                        <th className="py-2 pr-4">Adoption</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actions.map((a) => (
                        <tr key={a.action} className="border-b border-border/60">
                          <td className="py-2 pr-4">{a.label}</td>
                          <td className="py-2 pr-4">{a.count}</td>
                          <td className="py-2 pr-4">{a.uniqueUsers}</td>
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${Math.min(a.adoptionPct, 100)}%` }}
                                />
                              </div>
                              <span>{a.adoptionPct}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 text-lg font-semibold">Guard flows</h2>
                {flows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No guard flow data yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {flows.slice(0, 12).map((f) => (
                      <li key={f.flowId} className="flex justify-between gap-4">
                        <span className="font-mono text-xs">{f.flowId.replace(/_/g, " ")}</span>
                        <span className="text-muted-foreground shrink-0">
                          {f.count} · {f.successRate}% ok · {fmtDuration(f.avgDurationMs)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Errors ({errorTotals.errorRatePct ?? 0}% of sessions)
                </h2>
                {errors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No errors recorded — great reliability.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {errors.slice(0, 10).map((e) => (
                      <li key={e.error} className="flex justify-between gap-4">
                        <span className="truncate font-mono text-xs">{e.error}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {e.count}× · {e.uniqueUsers} users
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Activity className="h-5 w-5 text-primary" />
                Push devices
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
                          <span className="text-muted-foreground">
                            ({u.role}
                            {u.platform ? ` · ${u.platform}` : ""})
                          </span>
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

            <div className="grid gap-4 lg:grid-cols-2">
              {(summary?.byPlatform?.length ?? 0) > 0 && (
                <section className="rounded-xl border border-border bg-card p-4">
                  <h2 className="mb-3 text-lg font-semibold">Platform breakdown</h2>
                  <ul className="space-y-2 text-sm">
                    {summary!.byPlatform!.map((p) => (
                      <li key={p.platform} className="flex justify-between">
                        <span className="font-medium">{p.platform}</span>
                        <span>{p.sessionCount} sessions</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {(summary?.byAppVersion?.length ?? 0) > 0 && (
                <section className="rounded-xl border border-border bg-card p-4">
                  <h2 className="mb-3 text-lg font-semibold">App versions</h2>
                  <ul className="space-y-2 text-sm">
                    {summary!.byAppVersion!.map((v) => (
                      <li key={v.appVersion} className="flex justify-between">
                        <span className="font-medium">{v.appVersion}</span>
                        <span>{v.sessionCount} sessions</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {(inactive.length > 0 || neverUsed.length > 0) && (
              <div className="grid gap-4 lg:grid-cols-2">
                {inactive.length > 0 && (
                  <section className="rounded-xl border border-border bg-card p-4">
                    <h2 className="mb-3 text-lg font-semibold">Dormant users (outreach list)</h2>
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
                    <h2 className="mb-3 text-lg font-semibold">Never used app (onboarding gap)</h2>
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
          </>
        )}
      </div>
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "danger";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p
        className={`text-2xl font-bold ${accent === "danger" ? "text-destructive" : "text-primary"}`}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
