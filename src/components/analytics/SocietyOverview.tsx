"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  DoorOpen,
  Droplets,
  Lightbulb,
  Minus,
  Smartphone,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AttentionList,
  BarChart,
  ErrorBlock,
  LoadingBlock,
  Section,
  StatusPill,
  type Tone,
  useAnalyticsData,
} from "@/components/analytics/AnalyticsKit";

type Area = {
  id: "gate" | "complaints" | "dues" | "water" | "app";
  title: string;
  value: string;
  label: string;
  detail: string;
  tone: Tone;
  change: { label: string; direction: "up" | "down" | "flat"; good: boolean } | null;
};

type Overview = {
  period: { days: number };
  attention: { id: string; severity: "critical" | "warning" | "info"; title: string; detail: string; area: string }[];
  areas: Area[];
  people: {
    total: number;
    using: number;
    roles: { role: string; label: string; total: number; using: number; stopped: number; never: number }[];
  };
  features: {
    id: string;
    label: string;
    used: number;
    of: number;
    unit: string;
    pct: number;
    tone: Tone;
    tip: string;
  }[];
  dailyActive: { date: string; label: string; count: number }[];
};

const AREA_LINKS: Record<string, string> = {
  gate: "/gate-analytics",
  complaints: "/complaint-analytics",
  water: "/water-supply-analytics",
  dues: "/reconciliation",
  sos: "/sos-alerts",
};

const AREA_ICONS: Record<Area["id"], ReactNode> = {
  gate: <DoorOpen className="h-5 w-5" />,
  complaints: <TriangleAlert className="h-5 w-5" />,
  dues: <Wallet className="h-5 w-5" />,
  water: <Droplets className="h-5 w-5" />,
  app: <Smartphone className="h-5 w-5" />,
};

const ICON_TONE: Record<Tone, string> = {
  good: "bg-approved-bg text-approved-fg",
  watch: "bg-pending-bg text-pending-fg",
  critical: "bg-denied-bg text-denied-fg",
  neutral: "bg-surface-elevated text-brand-primary",
};

const VALUE_TONE: Record<Tone, string> = {
  good: "text-approved-solid",
  watch: "text-pending-solid",
  critical: "text-brand-danger",
  neutral: "text-fg-primary",
};

const BAR_TONE: Record<Tone, string> = {
  good: "bg-approved-solid",
  watch: "bg-pending-solid",
  critical: "bg-brand-danger",
  neutral: "bg-brand-primary",
};

/** Plain-language society summary: what needs attention, each area, app use and features. */
export function SocietyOverview({ days }: { days: number }) {
  const { data, loading, error, reload } = useAnalyticsData<{ overview: Overview }>(
    `/app-analytics/society-overview?days=${days}`,
  );
  const o = data?.overview;

  if (error) return <ErrorBlock message={error} onRetry={reload} />;
  if (!o) return loading ? <LoadingBlock /> : null;

  return (
    <div className="space-y-6">
      <Section title="Needs attention" subtitle="What to act on first">
        <AttentionList
          emptyText="All clear — nothing needs your attention right now."
          items={o.attention.map((a) => ({
            id: a.id,
            title: a.title,
            detail: a.detail,
            tone: a.severity === "critical" ? "critical" : a.severity === "warning" ? "watch" : "neutral",
            action: AREA_LINKS[a.area] ? (
              <Link href={AREA_LINKS[a.area]} className="btn btn-ghost text-xs">
                Open <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            ) : undefined,
          }))}
        />
      </Section>

      <div>
        <h2 className="text-lg font-semibold text-fg-primary">Last {o.period.days} days</h2>
        <p className="mb-3 text-sm text-fg-secondary">Click a card for the full details.</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {o.areas.map((a) => (
            <AreaCard key={a.id} area={a} />
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Who uses the app"
          subtitle={`${o.people.using} of ${o.people.total} people opened it in the last ${o.period.days} days`}
        >
          <div className="space-y-4">
            {o.people.roles.map((r) => (
              <div key={r.role}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-semibold text-fg-primary">{r.label}</span>
                  <span className="font-semibold text-fg-secondary">
                    {r.using} of {r.total} using
                  </span>
                </div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-elevated">
                  <div className="bg-approved-solid" style={{ width: `${pctOf(r.using, r.total)}%` }} />
                  <div className="bg-pending-solid" style={{ width: `${pctOf(r.stopped, r.total)}%` }} />
                </div>
                {r.stopped + r.never > 0 && (
                  <p className="mt-1 text-xs text-fg-secondary">
                    {[r.stopped > 0 && `${r.stopped} stopped using it`, r.never > 0 && `${r.never} never opened it`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            ))}
            <div className="flex flex-wrap gap-4 pt-1 text-xs text-fg-secondary">
              <Legend className="bg-approved-solid">Using</Legend>
              <Legend className="bg-pending-solid">Stopped using</Legend>
              <Legend className="bg-surface-elevated border border-surface-border">Never opened</Legend>
            </div>
          </div>
        </Section>

        <Section title="People using the app each day" subtitle="Residents, guards and admins who opened it">
          <BarChart
            height={200}
            data={o.dailyActive.map((d) => ({ label: d.label, values: { count: d.count } }))}
            series={[{ key: "count", label: "People", className: "bg-brand-primary" }]}
            emptyText="No app activity yet."
          />
        </Section>
      </div>

      {o.features.length > 0 && (
        <Section
          title="Features residents use"
          subtitle="Higher is better — each one saves the guard or the office work"
        >
          <ul className="grid gap-3 md:grid-cols-3">
            {o.features.map((f) => (
              <li key={f.id} className="rounded-xl border border-surface-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-fg-primary">{f.label}</span>
                  <StatusPill tone={f.tone}>{f.pct}%</StatusPill>
                </div>
                <p className="mt-1 text-sm text-fg-secondary">
                  {f.used} of {f.of} {f.unit}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-elevated">
                  <div className={`h-full rounded-full ${BAR_TONE[f.tone]}`} style={{ width: `${Math.min(f.pct, 100)}%` }} />
                </div>
                <p className="mt-3 flex gap-2 text-xs leading-relaxed text-fg-secondary">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {f.tip}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function AreaCard({ area }: { area: Area }) {
  const href = AREA_LINKS[area.id];
  const body = (
    <div className="flex h-full items-start gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ICON_TONE[area.tone]}`}>
        {AREA_ICONS[area.id]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-fg-secondary">{area.title}</p>
        <p className="mt-1">
          <span className={`text-2xl font-bold ${VALUE_TONE[area.tone]}`}>{area.value}</span>{" "}
          <span className="text-sm font-medium text-fg-secondary">{area.label}</span>
        </p>
        <p className="mt-1 text-sm text-fg-secondary">{area.detail}</p>
        {area.change && (
          <p
            className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold ${
              area.change.direction === "flat"
                ? "text-fg-secondary"
                : area.change.good
                  ? "text-approved-solid"
                  : "text-brand-danger"
            }`}
          >
            {area.change.direction === "up" ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : area.change.direction === "down" ? (
              <ArrowDownRight className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
            {area.change.label}
          </p>
        )}
      </div>
      {href && <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-fg-tertiary" aria-hidden />}
    </div>
  );
  return href ? (
    <Link href={href} className="card block p-4 transition-colors hover:bg-surface-elevated">
      {body}
    </Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}

function Legend({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${className}`} aria-hidden />
      {children}
    </span>
  );
}

const pctOf = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
