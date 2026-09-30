"use client";

import { BarChart3, DoorOpen, ShieldCheck, ShieldOff } from "lucide-react";
import { useState } from "react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import {
  AnalyticsHubEyebrow,
  AnalyticsTabSwitcher,
} from "@/components/analytics/AnalyticsTabSwitcher";
import {
  AttentionList,
  BarChart,
  ErrorBlock,
  formatMinutes,
  KpiCard,
  KpiGrid,
  LoadingBlock,
  PeriodSelect,
  RefreshButton,
  Section,
  ShareList,
  StatusPill,
  toneFor,
  useAnalyticsData,
  type AttentionItem,
} from "@/components/analytics/AnalyticsKit";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";

interface GateRow {
  id: string;
  name: string;
  location: string | null;
  isActive: boolean;
  assignedGuard: { name: string; phone: string | null; onShift?: boolean; shiftType?: string | null } | null;
  todayEntries?: number;
  todayVisitors: number;
  todayRequests?: number;
  insideNow?: number;
  activeVisitors: number;
  waitingNow?: number;
}

interface Overview {
  gates: GateRow[];
  totals?: {
    gates: number;
    activeGates: number;
    guardsOnShift: number;
    todayEntries: number;
    todayRequests: number;
    insideNow: number;
    waitingNow: number;
  };
}

interface Statistics {
  totalVisitors: number;
  typeBreakdown: Record<string, number>;
  avgDurationMinutes: number;
  outcomes?: {
    requests: number;
    entries: number;
    preApprovedEntries: number;
    rejected: number;
    expired: number;
    waiting: number;
    leftWithoutEntering: number;
    insideNow: number;
  };
  approvals?: {
    asked: number;
    answered: number;
    approvalRatePct: number;
    answeredInAppPct: number;
    noReplyPct: number;
    medianResponseMinutes: number;
    guardOverrides: number;
  };
  stay?: { avgMinutes: number; medianMinutes: number; exitNotMarked: number; exitNotMarkedPct: number };
}

interface PeakHours {
  hourlyData: { hour: number; label: string; count: number }[];
  peakHours: { hour: number; label: string; count: number }[];
}

interface DailyTrend {
  trendData: { date: string; displayDate: string; total: number; requests?: number; rejected?: number }[];
}

const TYPE_LABELS: Record<string, string> = {
  GUEST: "Guests",
  DELIVERY: "Deliveries",
  CAB: "Cabs",
  SERVICE_PROVIDER: "Service",
  SERVICE: "Service",
  VENDOR: "Vendors",
};
const TYPE_COLORS: Record<string, string> = {
  GUEST: "bg-brand-primary",
  DELIVERY: "bg-approved-solid",
  CAB: "bg-pending-solid",
  SERVICE_PROVIDER: "bg-info-solid",
  SERVICE: "bg-info-solid",
  VENDOR: "bg-brand-secondary",
};

export default function GateAnalyticsPage() {
  const [days, setDays] = useState(30);
  const overview = useAnalyticsData<Overview>("/gate-analytics/overview");
  const stats = useAnalyticsData<Statistics>(`/gate-analytics/visitor-statistics?days=${days}`);
  const peaks = useAnalyticsData<PeakHours>(`/gate-analytics/peak-hours?days=${days}`);
  const trend = useAnalyticsData<DailyTrend>(`/gate-analytics/daily-trend?days=${Math.min(days, 30)}`);

  const reloadAll = () => {
    overview.reload();
    stats.reload();
    peaks.reload();
    trend.reload();
  };

  const t = overview.data?.totals;
  const gates = overview.data?.gates ?? [];
  const s = stats.data;
  const o = s?.outcomes;
  const a = s?.approvals;
  const st = s?.stay;

  const attention: AttentionItem[] = [];
  for (const g of gates.filter((g) => g.isActive && !g.assignedGuard?.onShift)) {
    attention.push({
      id: `noguard-${g.id}`,
      tone: "critical",
      title: `${g.name}: no guard on shift`,
      detail: g.assignedGuard ? `${g.assignedGuard.name} is assigned but not on an active shift.` : "No guard assigned.",
    });
  }
  if ((t?.waitingNow ?? 0) > 0) {
    attention.push({
      id: "waiting",
      tone: "watch",
      title: `${t!.waitingNow} ${t!.waitingNow === 1 ? "visitor is" : "visitors are"} waiting for a resident's reply`,
      detail: "Guards see a call button after 3 minutes without a reply.",
    });
  }
  if (a && a.asked >= 5 && a.noReplyPct >= 30) {
    attention.push({
      id: "noreply",
      tone: "watch",
      title: `${a.noReplyPct}% of gate requests got no reply in the app`,
      detail: "Remind residents to keep GatePass+ notifications on.",
    });
  }
  if (st && st.exitNotMarkedPct >= 20) {
    attention.push({
      id: "exit",
      tone: "watch",
      title: `${st.exitNotMarkedPct}% of visits had no exit marked`,
      detail: "Guards should tap Mark exit when visitors leave — it keeps 'inside now' accurate.",
    });
  }
  if (a && a.guardOverrides > 0) {
    attention.push({
      id: "override",
      tone: "neutral",
      title: `Guards let in ${a.guardOverrides} ${a.guardOverrides === 1 ? "visitor" : "visitors"} without an app reply`,
      detail: "Each override is logged with its reason and the residents are told.",
    });
  }

  const outcomeItems = o
    ? [
        { label: "Let in", value: o.entries, className: "bg-approved-solid" },
        { label: "Rejected by residents", value: o.rejected, className: "bg-brand-danger" },
        { label: "Expired (no answer in 12 h)", value: o.expired, className: "bg-pending-solid" },
        { label: "Left without entering", value: o.leftWithoutEntering, className: "bg-fg-tertiary" },
        { label: "Still waiting", value: o.waiting, className: "bg-info-solid" },
      ].filter((i) => i.value > 0)
    : [];

  const firstError = overview.error || stats.error;
  const initialLoading = overview.loading && !overview.data;

  return (
    <AppShell title="Gate & Visitor Analytics">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Security analytics"
          title="Gate & visitor analytics"
          description="Who came in, how fast residents answered, and what needs attention at your gates."
          icon={<BarChart3 className="h-6 w-6" />}
        />

        <div className="space-y-2">
          <AnalyticsHubEyebrow />
          <AnalyticsTabSwitcher />
        </div>

        {firstError && <ErrorBlock message={firstError} onRetry={reloadAll} />}

        {initialLoading ? (
          <LoadingBlock />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-fg-primary">Right now</h2>
              <RefreshButton onClick={reloadAll} loading={overview.loading} />
            </div>
            <KpiGrid>
              <KpiCard label="Inside now" value={t?.insideNow ?? 0} tone="good" hint="Let in and not yet exited." />
              <KpiCard
                label="Waiting for residents"
                value={t?.waitingNow ?? 0}
                tone={(t?.waitingNow ?? 0) > 0 ? "watch" : "good"}
                hint="Requests with no reply yet."
              />
              <KpiCard
                label="Let in today"
                value={t?.todayEntries ?? 0}
                hint={`${t?.todayRequests ?? 0} requests logged today.`}
              />
              <KpiCard
                label="Guards on shift"
                value={`${t?.guardsOnShift ?? 0}/${t?.activeGates ?? 0}`}
                tone={(t?.guardsOnShift ?? 0) >= (t?.activeGates ?? 0) ? "good" : "critical"}
                hint="Active gates with a guard on duty."
              />
            </KpiGrid>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <h2 className="text-lg font-semibold text-fg-primary">Last {days} days</h2>
              <PeriodSelect value={days} onChange={setDays} />
            </div>
            {stats.loading && !s ? (
              <LoadingBlock />
            ) : (
              <KpiGrid>
                <KpiCard
                  label="People let in"
                  value={o?.entries ?? s?.totalVisitors ?? 0}
                  hint={o ? `${o.requests} requests · ${o.preApprovedEntries} pre-approved guests` : undefined}
                />
                <KpiCard
                  label="Residents approved"
                  value={a && a.answered > 0 ? `${a.approvalRatePct}%` : "—"}
                  tone={a && a.answered > 0 ? toneFor(a.approvalRatePct, 80, 60) : "neutral"}
                  hint={a ? `${a.answered} of ${a.asked} requests answered.` : undefined}
                />
                <KpiCard
                  label="Answered in the app"
                  value={a && a.asked > 0 ? `${a.answeredInAppPct}%` : "—"}
                  tone={a && a.asked > 0 ? toneFor(a.answeredInAppPct, 75, 50) : "neutral"}
                  hint="Rest needed a call, an override or expired."
                />
                <KpiCard
                  label="Typical reply time"
                  value={a && a.answered > 0 ? formatMinutes(a.medianResponseMinutes) : "—"}
                  tone={a && a.answered > 0 ? toneFor(a.medianResponseMinutes, 3, 10, true) : "neutral"}
                  hint="Median time for a resident to approve or reject."
                />
                <KpiCard
                  label="Typical visit length"
                  value={st && st.medianMinutes > 0 ? formatMinutes(st.medianMinutes) : "—"}
                  hint={st ? `Average ${formatMinutes(st.avgMinutes)} · only visits with a real exit.` : undefined}
                />
                <KpiCard
                  label="Exit not marked"
                  value={st ? `${st.exitNotMarkedPct}%` : "—"}
                  tone={st ? toneFor(st.exitNotMarkedPct, 5, 20, true) : "neutral"}
                  hint={st ? `${st.exitNotMarked} visits closed automatically.` : undefined}
                />
                <KpiCard
                  label="Rejected by residents"
                  value={o?.rejected ?? 0}
                  hint={o ? `${o.expired} expired without an answer.` : undefined}
                />
                <KpiCard
                  label="Guard overrides"
                  value={a?.guardOverrides ?? 0}
                  hint="Let in without an app reply (reason recorded)."
                />
              </KpiGrid>
            )}

            <div className="grid gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <Section
                  title="Daily entries"
                  subtitle={`People let in vs requests logged${days > 30 ? " · last 30 days" : ""}`}
                >
                  <BarChart
                    data={(trend.data?.trendData ?? []).map((d) => ({
                      label: d.displayDate,
                      values: { entries: d.total, requests: d.requests ?? d.total },
                    }))}
                    series={[
                      { key: "requests", label: "Requests", className: "bg-brand-primary-light" },
                      { key: "entries", label: "Let in", className: "bg-brand-primary" },
                    ]}
                  />
                </Section>
              </div>
              <Section title="Needs attention">
                <AttentionList items={attention} emptyText="Gates are running smoothly." />
              </Section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Section
                title="Busiest hours"
                subtitle={
                  peaks.data?.peakHours?.length
                    ? `Peak: ${peaks.data.peakHours.map((p) => p.label).join(", ")}`
                    : "When people are let in"
                }
              >
                <BarChart
                  height={150}
                  data={(peaks.data?.hourlyData ?? [])
                    .slice()
                    .sort((x, y) => x.hour - y.hour)
                    .map((h) => ({ label: h.label.replace(":00", ""), values: { count: h.count } }))}
                  series={[{ key: "count", label: "Let in", className: "bg-info-solid" }]}
                />
              </Section>
              <Section title="Request outcomes" subtitle="What happened to every request in the period">
                <ShareList items={outcomeItems} emptyText="No gate requests in this period." />
              </Section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Section title="Who came in" subtitle="People let in, by type">
                <ShareList
                  items={Object.entries(s?.typeBreakdown ?? {})
                    .sort((x, y) => y[1] - x[1])
                    .map(([type, value]) => ({
                      label: TYPE_LABELS[type] ?? type,
                      value,
                      className: TYPE_COLORS[type],
                    }))}
                  emptyText="Nobody let in during this period."
                />
              </Section>
              <Section title="Gates" subtitle="Guard on duty and today's traffic">
                {gates.length === 0 ? (
                  <EmptyState
                    icon={<DoorOpen className="h-10 w-10" />}
                    title="No gates yet"
                    description="Add gates in Gate utilities first."
                  />
                ) : (
                  <ul className="divide-y divide-surface-border">
                    {gates.map((g) => (
                      <li key={g.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-fg-primary">
                            {g.name}
                            {!g.isActive && <span className="ml-2 text-xs font-medium text-fg-tertiary">(inactive)</span>}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-fg-secondary">
                            {g.assignedGuard?.onShift ? (
                              <ShieldCheck className="h-4 w-4 text-approved-solid" />
                            ) : (
                              <ShieldOff className="h-4 w-4 text-brand-danger" />
                            )}
                            {g.assignedGuard ? g.assignedGuard.name : "No guard assigned"}
                            {g.assignedGuard?.phone ? ` · ${g.assignedGuard.phone}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusPill tone="good">{g.insideNow ?? g.activeVisitors} inside</StatusPill>
                          {(g.waitingNow ?? 0) > 0 && <StatusPill tone="watch">{g.waitingNow} waiting</StatusPill>}
                          <StatusPill tone="neutral">{g.todayEntries ?? g.todayVisitors} today</StatusPill>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
