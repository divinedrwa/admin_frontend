"use client";

import {
  Briefcase,
  Building2,
  Clock3,
  Users,
  CreditCard,
  Landmark,
  Shield,
  AlertTriangle,
  UserCheck,
  Package,
  LayoutDashboard,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  type FundTrendPoint,
  useDashboard,
} from "@/hooks/useDashboard";

const fmtInr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );

const STAT_ACCENTS = {
  blue:   { iconBg: "bg-brand-primary-light", iconColor: "text-brand-primary", badge: "bg-info-bg text-info-fg" },
  green:  { iconBg: "bg-approved-bg", iconColor: "text-approved-fg", badge: "bg-approved-bg text-approved-fg" },
  purple: { iconBg: "bg-info-bg",     iconColor: "text-info-fg",     badge: "bg-info-bg text-info-fg" },
  red:    { iconBg: "bg-denied-bg",   iconColor: "text-denied-fg",   badge: "bg-denied-bg text-denied-fg" },
  cyan:   { iconBg: "bg-info-bg",     iconColor: "text-info-fg",     badge: "bg-info-bg text-info-fg" },
  orange: { iconBg: "bg-pending-bg",  iconColor: "text-pending-fg",  badge: "bg-pending-bg text-pending-fg" },
  yellow: { iconBg: "bg-pending-bg",  iconColor: "text-pending-fg",  badge: "bg-pending-bg text-pending-fg" },
  pink:   { iconBg: "bg-denied-bg",   iconColor: "text-denied-fg",   badge: "bg-denied-bg text-denied-fg" },
} as const;

function buildFundSparklinePath(points: FundTrendPoint[]) {
  if (points.length === 0) return "";
  const width = 100;
  const height = 28;
  const min = Math.min(...points.map((p) => p.net), 0);
  const max = Math.max(...points.map((p) => p.net), 0);
  const span = Math.max(1, max - min);
  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - ((point.net - min) / span) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function ClockDisplay() {
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="rounded-2xl border border-surface-border bg-surface px-4 py-3 text-right shadow-sm">
      <div className="flex items-center justify-end gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-fg-tertiary">
        <Clock3 className="h-4 w-4" />
        Live time
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-fg-primary md:text-3xl">
        {clock.toLocaleTimeString()}
      </div>
      <div className="mt-1 text-sm text-fg-secondary">
        {clock.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading: loading, isFetching, refetch, dataUpdatedAt } = useDashboard();
  const [dismissedFails, setDismissedFails] = useState(false);

  const lastSyncedAt = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const loadError = data?.loadError ?? null;
  const failedEndpoints = dismissedFails ? [] : (data?.failedEndpoints ?? []);

  const villaCount = data?.villaCount ?? 0;
  const residentCount = data?.residentCount ?? 0;
  const guardCount = data?.guardCount ?? 0;
  const maint = data?.maint ?? null;
  const billingMaint = data?.billingMaint ?? null;
  const fund = data?.fund ?? null;
  const fundTrend = data?.fundTrend ?? [];
  const visitorTodayCount = data?.visitorTodayCount ?? 0;
  const parcelPendingCount = data?.parcelPendingCount ?? 0;
  const complaintOpenCount = data?.complaintOpenCount ?? 0;
  const sosActiveCount = data?.sosActiveCount ?? 0;
  const gates = data?.gates ?? [];
  const billingSnippet = data?.billingSnippet ?? null;
  const timeline = data?.timeline ?? [];
  const activeProjectCount = data?.activeProjectCount ?? 0;
  const projectOutstanding = data?.projectOutstanding ?? 0;
  const userStats = data?.userStats ?? null;

  const stats = useMemo(() => {
    const maintenanceView = billingMaint ?? maint;
    const pendingRupee = maintenanceView?.totalPending ?? 0;
    const credit = fund?.totalAdvanceCredit ?? 0;
    const fundBalance = fund?.currentFundBalance ?? 0;
    const spendable = fundBalance - credit;
    const fundSub = (() => {
      if (fund == null) return "Fund snapshot unavailable";
      const parts: string[] = [];
      if (credit > 0.5) parts.push(`Credit ${fmtInr(credit)}`);
      parts.push(`Balance ${fmtInr(fundBalance)}`);
      return parts.join(" · ");
    })();
    return [
      {
        icon: Building2 as LucideIcon,
        label: "Villas",
        value: String(villaCount),
        sub: `${residentCount} residents`,
        accent: STAT_ACCENTS.blue,
      },
      {
        icon: Users as LucideIcon,
        label: "Active users",
        value: String(userStats?.totalActive ?? 0),
        sub: userStats
          ? [
              userStats.byRole.RESIDENT?.active ? `${userStats.byRole.RESIDENT.active} residents` : null,
              userStats.byRole.GUARD?.active ? `${userStats.byRole.GUARD.active} guards` : null,
              (userStats.byRole.ADMIN?.active || userStats.byRole.RESIDENT_CUM_ADMIN?.active)
                ? `${(userStats.byRole.ADMIN?.active ?? 0) + (userStats.byRole.RESIDENT_CUM_ADMIN?.active ?? 0)} admins`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "No active users"
          : "Loading...",
        accent: STAT_ACCENTS.green,
      },
      {
        icon: CreditCard as LucideIcon,
        label: "Maint. pending (month)",
        value: fmtInr(pendingRupee),
        sub: `${maintenanceView?.collectionRate ?? 0}% collected`,
        accent: STAT_ACCENTS.yellow,
      },
      {
        icon: Landmark as LucideIcon,
        label: credit > 0.5 ? "Society fund (spendable)" : "Society fund balance",
        value: fmtInr(credit > 0.5 ? spendable : fundBalance),
        sub: fundSub,
        accent: (credit > 0.5 ? spendable : fundBalance) >= 0 ? STAT_ACCENTS.green : STAT_ACCENTS.red,
        trend: fundTrend,
      },
      {
        icon: Shield as LucideIcon,
        label: "Active guards",
        value: String(guardCount),
        sub: `${gates.filter((g) => g.isActive).length} gates`,
        accent: STAT_ACCENTS.purple,
      },
      {
        icon: AlertTriangle as LucideIcon,
        label: "Active SOS",
        value: String(sosActiveCount),
        sub: sosActiveCount ? "Attention" : "Clear",
        accent: sosActiveCount ? STAT_ACCENTS.red : STAT_ACCENTS.green,
      },
      {
        icon: UserCheck as LucideIcon,
        label: "Visitors today",
        value: String(visitorTodayCount),
        sub: "Check-ins since midnight",
        accent: STAT_ACCENTS.cyan,
      },
      {
        icon: Package as LucideIcon,
        label: "Parcels queued",
        value: String(parcelPendingCount),
        sub: "Pending / awaiting pickup",
        accent: STAT_ACCENTS.orange,
      },
      {
        icon: AlertTriangle as LucideIcon,
        label: "Open complaints",
        value: String(complaintOpenCount),
        sub: "Excludes closed",
        accent: STAT_ACCENTS.pink,
      },
      {
        icon: CreditCard as LucideIcon,
        label: "Billing cycle",
        value: billingSnippet?.cycleKey ?? "—",
        sub: billingSnippet ? `${billingSnippet.status ?? ""}` : "Configure in Billing cycles",
        accent: STAT_ACCENTS.green,
      },
    ];
  }, [
    villaCount,
    residentCount,
    maint,
    billingMaint,
    fund,
    guardCount,
    gates,
    sosActiveCount,
    visitorTodayCount,
    parcelPendingCount,
    complaintOpenCount,
    billingSnippet,
    fundTrend,
    userStats,
  ]);

  const quickActions = [
    { icon: Users,        label: "Residents",      href: "/resident-management",  iconCls: "text-brand-primary", boxCls: "hover:bg-brand-primary-light border-surface-border" },
    { icon: UserCheck,    label: "Visitors",        href: "/visitors",             iconCls: "text-approved-fg",   boxCls: "hover:bg-approved-bg border-surface-border" },
    { icon: AlertTriangle,label: "SOS alerts",     href: "/sos-alerts",           iconCls: "text-denied-fg",     boxCls: "hover:bg-denied-bg border-surface-border" },
    { icon: Building2,    label: "Notices",         href: "/notices",              iconCls: "text-brand-primary", boxCls: "hover:bg-brand-primary-light border-surface-border" },
    { icon: CreditCard,   label: "Maintenance",     href: "/maintenance-management",iconCls:"text-pending-fg",    boxCls: "hover:bg-pending-bg border-surface-border" },
    { icon: Landmark,     label: "Billing cycles",  href: "/maintenance-billing",  iconCls: "text-info-fg",       boxCls: "hover:bg-info-bg border-surface-border" },
    { icon: AlertTriangle,label: "Complaints",      href: "/complaints",           iconCls: "text-pending-fg",    boxCls: "hover:bg-pending-bg border-surface-border" },
    { icon: Shield,       label: "Gates",           href: "/gates",                iconCls: "text-fg-secondary",  boxCls: "hover:bg-surface-background border-surface-border" },
  ];

  function relTime(ms: number) {
    const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <AppShell title="Dashboard">
      <div className="space-y-8">
        {loadError ? (
          <div className="rounded-xl border border-pending-bg bg-pending-bg px-4 py-3 text-sm text-pending-fg">{loadError}</div>
        ) : null}
        {failedEndpoints.length > 0 && !loadError ? (
          <div className="flex items-center justify-between rounded-xl border border-pending-bg bg-pending-bg px-4 py-3 text-sm text-pending-fg">
            <span>Some data could not be loaded ({failedEndpoints.join(", ")}). Try refreshing.</span>
            <button type="button" onClick={() => setDismissedFails(true)} className="ml-3 shrink-0 font-semibold hover:opacity-80">Dismiss</button>
          </div>
        ) : null}

        <AdminPageHeader
          eyebrow="Society overview"
          title="Live operations dashboard"
          description={`Monitor occupancy, maintenance, fund balance, and operational activity from one summary view.${lastSyncedAt ? ` Last synced ${lastSyncedAt.toLocaleString("en-IN")}.` : ""}`}
          icon={<LayoutDashboard className="h-6 w-6" />}
          actions={
            <>
              <button
                type="button"
                disabled={loading || isFetching}
                onClick={() => void refetch()}
                className="btn btn-primary gap-2 px-4 py-3 text-sm font-semibold"
              >
                <RefreshCw className={`h-4 w-4 ${loading || isFetching ? "animate-spin" : ""}`} />
                {loading || isFetching ? "Refreshing..." : "Refresh data"}
              </button>
              <ClockDisplay />
            </>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
            <div
              key={stat.label}
              className="stat-card bg-surface rounded-xl border border-surface-border shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`rounded-xl p-2.5 ${stat.accent.iconBg}`}>
                  <Icon className={`h-5 w-5 ${stat.accent.iconColor}`} />
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stat.accent.badge}`}>{stat.sub}</span>
              </div>
              <div className="mt-4 text-2xl font-bold text-fg-primary leading-tight break-words">{stat.value}</div>
              <div className="mt-1 text-sm text-fg-secondary">{stat.label}</div>
              {"trend" in stat && Array.isArray(stat.trend) && stat.trend.length > 0 ? (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-fg-secondary mb-1">
                    <span>6-month net trend</span>
                    <span className={stat.trend[stat.trend.length - 1].net >= 0 ? "text-approved-fg" : "text-denied-fg"}>
                      {fmtInr(stat.trend[stat.trend.length - 1].net)}
                    </span>
                  </div>
                  <svg viewBox="0 0 100 28" className="h-8 w-full">
                    <path d={buildFundSparklinePath(stat.trend)} fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-primary" />
                  </svg>
                  <div className="mt-1 flex justify-between text-[10px] text-fg-tertiary">
                    <span>{stat.trend[0].label}</span>
                    <span>{stat.trend[stat.trend.length - 1].label}</span>
                  </div>
                </div>
              ) : null}
            </div>
          );
          })}
        </div>

        {/* Special Projects widget */}
        {activeProjectCount > 0 && (
          <Link
            href="/special-projects"
            className="block rounded-xl border border-surface-border bg-surface p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-pending-bg p-3 text-2xl">
                  <Briefcase className="h-5 w-5 text-pending-fg" />
                </div>
                <div>
                  <p className="text-base font-semibold text-fg-primary">
                    {activeProjectCount} Active Project{activeProjectCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-fg-secondary">
                    {fmtInr(projectOutstanding)} outstanding
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-brand-primary">View all →</span>
            </div>
          </Link>
        )}

        {/* User breakdown */}
        {userStats && (userStats.totalActive > 0 || userStats.totalInactive > 0) && (
          <div className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-fg-primary">User breakdown</h2>
              <span className="text-xs font-medium text-fg-secondary">
                {userStats.totalActive + userStats.totalInactive} total
              </span>
            </div>
            <div className="space-y-3">
              {(["RESIDENT", "GUARD", "ADMIN", "RESIDENT_CUM_ADMIN"] as const).map((role) => {
                const data = userStats.byRole[role];
                if (!data) return null;
                const total = data.active + data.inactive;
                if (total === 0) return null;
                const pct = Math.round((data.active / total) * 100);
                const label =
                  role === "RESIDENT_CUM_ADMIN"
                    ? "Resident + Admin"
                    : role.charAt(0) + role.slice(1).toLowerCase();
                return (
                  <div key={role} className="flex items-center gap-4">
                    <div className="w-36 shrink-0 flex items-center justify-between">
                      {role === "RESIDENT" ? (
                        <Link href="/resident-management" className="text-sm font-medium text-brand-primary hover:underline">
                          {label}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-fg-primary">{label}</span>
                      )}
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <div className="flex-1 h-2.5 rounded-full bg-surface-elevated overflow-hidden">
                        <div
                          className="h-full rounded-full bg-approved-solid transition-[width]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-fg-secondary w-28 text-right shrink-0">
                        {data.active} active · {data.inactive} inactive
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-surface-border flex items-center gap-4 text-sm">
              <span className="text-approved-fg font-semibold">{userStats.totalActive} active</span>
              <span className="text-fg-tertiary">·</span>
              <span className="text-fg-secondary">{userStats.totalInactive} inactive</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 card">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-xl font-bold text-fg-primary">Recent activity</h2>
              <span className="badge badge-primary">Latest first</span>
            </div>
            <div className="card-body pt-4">
              {loading && timeline.length === 0 ? (
                <p className="text-fg-secondary text-sm">Fetching events…</p>
              ) : timeline.length === 0 ? (
                <p className="text-fg-secondary text-sm">No recent events yet. Data will appear as visitors, parcels, and notices are recorded.</p>
              ) : (
                <div className="space-y-2">
                  {timeline.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-4 p-4 rounded-xl border border-surface-border bg-surface-background/50 hover:bg-surface-background transition-colors"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-background text-lg border border-surface-border">{a.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fg-primary">{a.text}</p>
                        <p className="text-xs text-fg-secondary mt-1">{relTime(a.at)}</p>
                      </div>
                      <span className={`badge ${a.tagClass} shrink-0 capitalize`}>{a.tag}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-bold text-fg-primary">Quick links</h2>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action) => {
                    const QIcon = action.icon;
                    return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all hover:shadow-sm hover:scale-[1.02] ${action.boxCls}`}
                    >
                      <QIcon className={`h-5 w-5 mb-1.5 ${action.iconCls}`} />
                      <span className="text-xs font-semibold text-center text-fg-primary">{action.label}</span>
                    </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-bold text-fg-primary">Gate status</h3>
              </div>
              <div className="card-body space-y-3">
                {gates.length === 0 ? (
                  <p className="text-sm text-fg-secondary">No gates configured.</p>
                ) : (
                  gates.slice(0, 6).map((gate) => (
                    <div key={gate.id} className="flex items-center justify-between gap-3 p-3 bg-surface-background rounded-lg border border-surface-border">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-fg-primary truncate">{gate.name}</p>
                        <p className="text-xs text-fg-secondary truncate">
                          Guard: {gate.assignedGuard?.name ?? "Unassigned"}
                        </p>
                      </div>
                      <span className={`badge whitespace-nowrap ${gate.isActive ? "badge-success" : "badge-danger"}`}>
                        {gate.isActive ? "Active" : "Off"}
                      </span>
                    </div>
                  ))
                )}
                {gates.length > 6 ? (
                  <Link href="/gates" className="text-sm text-brand-primary font-medium hover:underline block text-center pt-2">
                    View all gates
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h3 className="text-lg font-bold text-fg-primary">Maintenance · this month</h3>
                <Link href="/maintenance-management" className="text-xs text-brand-primary font-semibold hover:underline">
                  Open
                </Link>
              </div>
              <div className="card-body space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-fg-secondary">Expected</span>
                  <span className="font-semibold text-fg-primary">
                    {fmtInr((billingMaint ?? maint)?.totalExpected ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-fg-secondary">Collected</span>
                  <span className="font-semibold text-approved-fg">
                    {fmtInr((billingMaint ?? maint)?.totalCollected ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-fg-secondary">Pending</span>
                  <span className="font-semibold text-pending-fg">
                    {fmtInr((billingMaint ?? maint)?.totalPending ?? 0)}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-fg-secondary mb-1">
                    <span>Collection rate</span>
                    <span>{(billingMaint ?? maint)?.collectionRate ?? 0}%</span>
                  </div>
                  <div className="w-full bg-surface-elevated rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-approved-solid to-brand-primary transition-[width]"
                      style={{
                        width: `${Math.min(100, Math.max(0, (billingMaint ?? maint)?.collectionRate ?? 0))}%`,
                      }}
                    />
                  </div>
                </div>

                {billingSnippet ? (
                  <div className="pt-2 border-t border-surface-border">
                    <div className="flex justify-between items-center mb-2 gap-2">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-fg-primary block truncate">
                          Billing cycle {billingSnippet.cycleKey}
                        </span>
                        <span className="text-[11px] text-fg-secondary">
                          Source: Billing v1 cycle ledger
                        </span>
                      </div>
                      <span className="text-xs uppercase font-medium text-brand-primary whitespace-nowrap">
                        {billingSnippet.status ?? ""}
                      </span>
                    </div>
                    <p className="text-xs text-fg-secondary">
                      Paid {billingSnippet.paidUsersCount ?? 0} · Pending {billingSnippet.pendingUsersCount ?? 0}{" "}
                      <Link href="/maintenance-billing" className="text-brand-primary hover:underline ml-1 font-medium">
                        Manage
                      </Link>
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
