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
    byRole?: {
      role: string;
      label?: string;
      totalInSociety?: number;
      registered?: number;
      active: number;
      inactive: number;
      neverUsed: number;
    }[];
  };
  activeUsersByRole?: { role: string; count: number }[];
};

type EngagementUser = {
  userId: string;
  name: string;
  username?: string;
  email?: string;
  phone?: string | null;
  role: string;
  villaNumber?: string | null;
  status?: string;
  lastSeenAt?: string | null;
};

type RoleAdoptionRow = {
  role: string;
  label: string;
  totalInSociety: number;
  registered: number;
  active: number;
  dormant: number;
  neverUsed: number;
  deactivated?: number;
  everUsed: number;
  notUsingApp: number;
  usingApp: number;
  activeRatePct: number;
  activationRatePct: number;
  listCounts?: {
    usingApp: number;
    neverUsed: number;
    dormant: number;
    deactivated: number;
  };
  notUsingAppUsers?: {
    neverUsed?: EngagementUser[];
    dormant?: EngagementUser[];
  };
  usingAppUsers?: EngagementUser[];
  deactivatedUsers?: EngagementUser[];
};

type RoleAdoption = {
  period?: { days: number };
  meta?: { totalUsersInDatabase?: number; source?: string };
  roles?: RoleAdoptionRow[];
  totals?: {
    registeredActiveAccounts?: number;
    activeInPeriod?: number;
    neverUsedApp?: number;
    totalUsersInDatabase?: number;
    accountsByRole?: { role: string; label: string; count: number }[];
  };
  dataSources?: { custom?: string; firebase?: string };
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

type GrowthKpi = {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  pillar: string;
  status: "good" | "watch" | "critical";
  hint: string;
};

type GrowthDashboard = {
  healthScore?: number;
  kpis?: GrowthKpi[];
  funnel?: { stage: string; count: number; ratePct: number }[];
  growthLevers?: {
    action: string;
    label: string;
    pillar: string;
    adoptionPct: number;
    count: number;
    recommendation: string;
  }[];
  dataSources?: {
    primary?: { id: string; label: string; description: string };
    mirror?: { id: string; label: string; description: string };
  };
  firebaseFreeMetrics?: {
    id: string;
    label: string;
    source: string;
    firebaseEvent: string;
    consolePath: string;
    description: string;
  }[];
  pillars?: Record<string, Record<string, number | null | undefined>>;
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
  const [growth, setGrowth] = useState<GrowthDashboard | null>(null);
  const [roleAdoption, setRoleAdoption] = useState<RoleAdoption | null>(null);
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
          growthRes,
          roleAdoptionRes,
        ] = await Promise.all([
          api.get("/app-analytics/summary", { params: { days }, signal }),
          api.get("/app-analytics/daily-trend", { params: { days: trendDays }, signal }),
          api.get("/app-analytics/screens", { params: { days }, signal }),
          api.get("/app-analytics/flows", { params: { days }, signal }),
          api.get("/app-analytics/actions", { params: { days }, signal }),
          api.get("/app-analytics/errors", { params: { days }, signal }),
          api.get("/app-analytics/insights", { params: { days }, signal }),
          api.get("/app-analytics/active-users", { params: { days: 7, limit: 30 }, signal }),
          api.get("/app-analytics/user-engagement", { params: { days }, signal }),
          api.get("/app-analytics/growth-dashboard", { params: { days }, signal }),
          api.get("/app-analytics/role-adoption", { params: { days }, signal }),
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
        setGrowth(growthRes.data.growth ?? null);
        setRoleAdoption(roleAdoptionRes.data.adoption ?? null);
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
            {(roleAdoption?.roles?.length ?? 0) > 0 && (
              <section className="rounded-xl border border-border bg-card p-4">
                <div className="mb-4">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <Users className="h-5 w-5 text-primary" />
                    App usage by role
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Counts and names loaded from your society&apos;s User table —{" "}
                    {roleAdoption?.meta?.totalUsersInDatabase ?? roleAdoption?.totals?.totalUsersInDatabase ?? 0}{" "}
                    accounts in database. Firebase filters by{" "}
                    <code className="text-xs">user_role</code> for app-wide trends.
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {roleAdoption!.roles!.map((role) => (
                    <div
                      key={role.role}
                      className="rounded-lg border border-border/80 bg-muted/20 p-4"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{role.label}</h3>
                          <p className="text-sm text-muted-foreground">
                            {role.totalInSociety} in database · {role.registered} active accounts ·{" "}
                            {role.active} using app · {role.notUsingApp} not using
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{role.activeRatePct}%</div>
                          <div className="text-xs text-muted-foreground">active</div>
                        </div>
                      </div>
                      <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${role.registered > 0 ? (role.active / role.registered) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                        <div>
                          <dt className="text-muted-foreground">Using app</dt>
                          <dd className="font-semibold text-green-700 dark:text-green-400">
                            {role.active}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Never used</dt>
                          <dd className="font-semibold text-destructive">{role.neverUsed}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Dormant</dt>
                          <dd className="font-semibold text-amber-700 dark:text-amber-400">
                            {role.dormant}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Ever used</dt>
                          <dd className="font-semibold">{role.activationRatePct}%</dd>
                        </div>
                      </dl>
                      {(role.notUsingAppUsers?.neverUsed?.length ?? 0) > 0 && (
                        <div className="mt-3">
                          <p className="mb-1 text-xs font-semibold text-destructive">
                            Never used app ({role.listCounts?.neverUsed ?? role.notUsingAppUsers!.neverUsed!.length})
                          </p>
                          <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
                            {role.notUsingAppUsers!.neverUsed!.map((u) => (
                              <li key={u.userId} className="flex justify-between gap-2 border-b border-border/40 py-1">
                                <span>
                                  {u.name}{" "}
                                  <span className="text-muted-foreground">({u.username})</span>
                                </span>
                                <span className="shrink-0 text-right text-muted-foreground">
                                  {u.villaNumber ?? "—"}
                                  {u.phone ? ` · ${u.phone}` : u.email ? ` · ${u.email}` : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(role.notUsingAppUsers?.dormant?.length ?? 0) > 0 && (
                        <div className="mt-3">
                          <p className="mb-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                            Dormant ({role.listCounts?.dormant ?? role.notUsingAppUsers!.dormant!.length})
                          </p>
                          <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
                            {role.notUsingAppUsers!.dormant!.map((u) => (
                              <li key={u.userId} className="flex justify-between gap-2 border-b border-border/40 py-1">
                                <span>
                                  {u.name}{" "}
                                  <span className="text-muted-foreground">({u.username})</span>
                                </span>
                                <span className="shrink-0 text-right text-muted-foreground">
                                  {u.lastSeenAt?.slice(0, 10) ?? "—"}
                                  {u.villaNumber ? ` · ${u.villaNumber}` : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {growth && (
              <section className="rounded-xl border border-border bg-gradient-to-br from-slate-900 to-teal-900 p-5 text-white shadow-lg">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                      <Target className="h-5 w-5" />
                      Business growth
                    </h2>
                    <p className="mt-1 text-sm text-white/70">
                      {growth.dataSources?.primary?.label ?? "Server analytics"} +{" "}
                      {growth.dataSources?.mirror?.label ?? "Firebase mirror"} — unified view for
                      adoption, operations, and revenue signals.
                    </p>
                  </div>
                  <div className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-lg font-bold">
                    {growth.healthScore ?? 0}/100
                  </div>
                </div>

                <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {(growth.kpis ?? []).slice(0, 4).map((kpi) => (
                    <div
                      key={kpi.id}
                      className="rounded-lg border border-white/20 bg-white/10 p-3"
                    >
                      <div className="text-xl font-bold">{kpi.displayValue}</div>
                      <div className="text-xs font-medium text-white/80">{kpi.label}</div>
                      <div className="mt-1 text-[11px] text-white/60">{kpi.hint}</div>
                    </div>
                  ))}
                </div>

                {(growth.funnel?.length ?? 0) > 0 && (
                  <div className="mb-5">
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/80">
                      Growth funnel
                    </h3>
                    <div className="space-y-2">
                      {growth.funnel!.map((stage) => (
                        <div key={stage.stage}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span>{stage.stage}</span>
                            <span className="text-white/80">
                              {stage.count} · {stage.ratePct}%
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/15">
                            <div
                              className="h-full rounded-full bg-teal-300"
                              style={{ width: `${stage.ratePct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(growth.growthLevers?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/80">
                      <Zap className="h-4 w-4" />
                      Improve next
                    </h3>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {growth.growthLevers!.slice(0, 4).map((lever) => (
                        <li
                          key={lever.action}
                          className="rounded-lg border border-white/15 bg-white/5 p-3 text-sm"
                        >
                          <div className="font-medium">{lever.label}</div>
                          <div className="mt-1 text-white/70">{lever.recommendation}</div>
                          <div className="mt-1 text-xs text-teal-200">
                            {lever.adoptionPct}% adoption · {lever.count} events
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {(growth?.firebaseFreeMetrics?.length ?? 0) > 0 && (
              <section className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Firebase Analytics (free / Spark plan)
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      These metrics appear in your Firebase console at no cost. Society-scoped
                      breakdowns with user names live in this dashboard above; Firebase adds
                      geography, device models, and GA4 funnels across all societies.
                    </p>
                  </div>
                  <a
                    href="https://console.firebase.google.com/project/_/analytics"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                  >
                    Open Firebase console
                  </a>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {growth!.firebaseFreeMetrics!.map((metric) => (
                    <div
                      key={metric.id}
                      className="rounded-lg border border-border/80 bg-muted/30 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{metric.label}</span>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                            metric.source === "automatic"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                              : metric.source === "crashlytics"
                                ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200"
                                : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200"
                          }`}
                        >
                          {metric.source.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{metric.description}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Event: <code className="text-foreground">{metric.firebaseEvent}</code> ·{" "}
                        {metric.consolePath}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

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
                  <dt className="text-muted-foreground">No app signals</dt>
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
                        <th className="py-2 pr-4">In database</th>
                        <th className="py-2 pr-4">Active accts</th>
                        <th className="py-2 pr-4">Using app</th>
                        <th className="py-2 pr-4">Dormant</th>
                        <th className="py-2 pr-4">Never used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eng.byRole!.map((r) => (
                        <tr key={r.role} className="border-b border-border/60">
                          <td className="py-2 pr-4 font-medium">{r.label ?? r.role}</td>
                          <td className="py-2 pr-4">{r.totalInSociety ?? "—"}</td>
                          <td className="py-2 pr-4">{r.registered ?? "—"}</td>
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
                      {inactive.map((u) => (
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
                    <h2 className="mb-3 text-lg font-semibold">No app signals (onboarding gap)</h2>
                    <p className="mb-3 text-sm text-muted-foreground">
                      Only accounts with no analytics session, push device, or login token. Users who
                      open the app but lack telemetry still appear under Active or Dormant.
                    </p>
                    <ul className="space-y-2 text-sm">
                      {neverUsed.map((u) => (
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
