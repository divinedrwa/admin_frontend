"use client";

import { Droplets } from "lucide-react";
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
  StatusPill,
  useAnalyticsData,
  type AttentionItem,
} from "@/components/analytics/AnalyticsKit";
import { AppShell } from "@/components/AppShell";

interface Overview {
  summary: {
    totalEvents: number;
    completedCycles: number;
    avgDurationMinutes: number;
    supplyMinutes?: number;
    avgSupplyMinutesPerDay?: number;
    longestSupplyMinutes?: number;
    longestGapMinutes?: number | null;
    runningNow?: number;
  };
  currentStatus: { gateId: string; gateName: string; currentStatus: "ON" | "OFF" | "UNKNOWN"; lastUpdated: string | null }[];
}
interface DailyUsage {
  usageData: { date: string; displayDate: string; supplyHours?: number; supplyMinutes?: number; totalEvents: number }[];
}
interface Hourly {
  pattern: { hour: number; label: string; onCount: number }[];
}
interface RecentEvents {
  recentEvents: { id: string; action: "ON" | "OFF"; timestamp: string; reason: string | null; gate: { name: string } | null }[];
}

function timeAgo(iso: string | null) {
  if (!iso) return "never";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (min < 24 * 60) return `${Math.floor(min / 60)} h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function WaterSupplyAnalyticsPage() {
  const [days, setDays] = useState(7);
  const overview = useAnalyticsData<Overview>(`/water-supply-analytics/overview?days=${days}`);
  const daily = useAnalyticsData<DailyUsage>(`/water-supply-analytics/daily-usage?days=${days}`);
  const hourly = useAnalyticsData<Hourly>(`/water-supply-analytics/hourly-pattern?days=${Math.max(days, 30)}`);
  const recent = useAnalyticsData<RecentEvents>("/water-supply-analytics/recent-events?limit=12");

  const reloadAll = () => {
    overview.reload();
    daily.reload();
    hourly.reload();
    recent.reload();
  };

  const s = overview.data?.summary;
  const status = overview.data?.currentStatus ?? [];
  const noData = s && s.totalEvents === 0 && (s.supplyMinutes ?? 0) === 0;

  const attention: AttentionItem[] = [];
  for (const g of status) {
    if (g.currentStatus === "ON" && g.lastUpdated) {
      const onFor = (Date.now() - new Date(g.lastUpdated).getTime()) / 60000;
      if (onFor >= 60) {
        attention.push({
          id: `on-${g.gateId}`,
          tone: onFor >= 180 ? "critical" : "watch",
          title: `${g.gateName}: water ON for ${formatMinutes(onFor)}`,
          detail: "Check the tank — the motor may have been left running.",
        });
      }
    }
  }
  if (s?.longestGapMinutes != null && s.longestGapMinutes >= 24 * 60) {
    attention.push({
      id: "gap",
      tone: "watch",
      title: `Longest stretch without water: ${formatMinutes(s.longestGapMinutes)}`,
      detail: "Residents may have gone a full day without supply.",
    });
  }

  return (
    <AppShell title="Water Supply Analytics">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Utilities"
          title="Water supply analytics"
          description="Hours of supply per day, the longest outages, and what is running right now."
          icon={<Droplets className="h-6 w-6" />}
        />

        <div className="space-y-2">
          <AnalyticsHubEyebrow />
          <AnalyticsTabSwitcher />
        </div>

        {overview.error && <ErrorBlock message={overview.error} onRetry={reloadAll} />}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-fg-primary">Last {days} days</h2>
          <div className="flex items-center gap-2">
            <PeriodSelect value={days} onChange={setDays} options={[7, 30, 90]} />
            <RefreshButton onClick={reloadAll} loading={overview.loading} />
          </div>
        </div>

        {overview.loading && !s ? (
          <LoadingBlock />
        ) : noData ? (
          <Section title="No water updates yet">
            <p className="text-sm text-fg-secondary">
              Guards log water ON/OFF from Gate utilities in the app. Once they start, supply hours and outages show here.
            </p>
          </Section>
        ) : (
          <KpiGrid>
            <KpiCard
              label="Supply per day"
              value={formatMinutes(s?.avgSupplyMinutesPerDay ?? 0)}
              tone="good"
              hint={`Total ${formatMinutes(s?.supplyMinutes ?? 0)} in ${days} days.`}
            />
            <KpiCard
              label="Running now"
              value={`${s?.runningNow ?? 0}/${status.length}`}
              tone={(s?.runningNow ?? 0) > 0 ? "good" : "neutral"}
              hint="Gates where water is ON."
            />
            <KpiCard
              label="Longest without water"
              value={s?.longestGapMinutes != null ? formatMinutes(s.longestGapMinutes) : "—"}
              tone={s?.longestGapMinutes != null && s.longestGapMinutes >= 24 * 60 ? "watch" : "neutral"}
            />
            <KpiCard
              label="Typical supply"
              value={s && s.completedCycles > 0 ? formatMinutes(s.avgDurationMinutes) : "—"}
              hint={`${s?.completedCycles ?? 0} supplies · longest ${formatMinutes(s?.longestSupplyMinutes ?? 0)}`}
            />
          </KpiGrid>
        )}

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <Section title="Hours of supply per day">
              <BarChart
                data={(daily.data?.usageData ?? []).map((d) => ({
                  label: d.displayDate,
                  values: { hours: d.supplyHours ?? 0 },
                }))}
                series={[{ key: "hours", label: "Hours", className: "bg-info-solid" }]}
                format={(v) => `${v} h`}
                emptyText="No supply logged in this period."
              />
            </Section>
          </div>
          <Section title="Needs attention">
            <AttentionList items={attention} emptyText="Nothing unusual with water supply." />
          </Section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="When water is turned on" subtitle="Last 30+ days, by hour">
            <BarChart
              height={150}
              data={(hourly.data?.pattern ?? []).map((h) => ({
                label: h.label.replace(":00", ""),
                values: { on: h.onCount },
              }))}
              series={[{ key: "on", label: "Turned on", className: "bg-approved-solid" }]}
              emptyText="No water updates yet."
            />
          </Section>
          <Section title="Gates">
            <ul className="divide-y divide-surface-border">
              {status.map((g) => (
                <li key={g.gateId} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-semibold text-fg-primary">{g.gateName}</p>
                    <p className="text-sm text-fg-secondary">Updated {timeAgo(g.lastUpdated)}</p>
                  </div>
                  <StatusPill tone={g.currentStatus === "ON" ? "good" : g.currentStatus === "OFF" ? "neutral" : "watch"}>
                    {g.currentStatus === "UNKNOWN" ? "No updates" : `Water ${g.currentStatus}`}
                  </StatusPill>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <Section title="Recent updates">
          {(recent.data?.recentEvents ?? []).length === 0 ? (
            <p className="text-sm text-fg-tertiary">No updates yet.</p>
          ) : (
            <ul className="divide-y divide-surface-border">
              {recent.data!.recentEvents.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <StatusPill tone={e.action === "ON" ? "good" : "neutral"}>{e.action}</StatusPill>
                  <span className="flex-1 text-sm text-fg-primary">
                    {e.gate?.name ?? "Gate"}
                    {e.reason ? <span className="text-fg-secondary"> · {e.reason}</span> : null}
                  </span>
                  <span className="text-xs text-fg-tertiary">
                    {new Date(e.timestamp).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </AppShell>
  );
}
