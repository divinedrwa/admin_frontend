"use client";

import { ArrowDownRight, ArrowUpRight, Minus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { parseApiError } from "@/utils/errorHandler";

/** Shared building blocks for the analytics pages: one look across Gate, Complaints, Water and App. */

export type Tone = "good" | "watch" | "critical" | "neutral";

const TONE_TEXT: Record<Tone, string> = {
  good: "text-approved-solid",
  watch: "text-pending-solid",
  critical: "text-brand-danger",
  neutral: "text-fg-primary",
};
const TONE_DOT: Record<Tone, string> = {
  good: "bg-approved-solid",
  watch: "bg-pending-solid",
  critical: "bg-brand-danger",
  neutral: "bg-fg-tertiary",
};
const TONE_SOFT: Record<Tone, string> = {
  good: "bg-approved-bg text-approved-fg border-approved-bg",
  watch: "bg-pending-bg text-pending-fg border-pending-bg",
  critical: "bg-denied-bg text-denied-fg border-denied-bg",
  neutral: "bg-surface-elevated text-fg-secondary border-surface-border",
};

/** Green/amber/red from a percentage and two thresholds. */
export function toneFor(pct: number | null | undefined, good: number, watch: number, lowerIsBetter = false): Tone {
  if (pct == null) return "neutral";
  if (lowerIsBetter) return pct <= good ? "good" : pct <= watch ? "watch" : "critical";
  return pct >= good ? "good" : pct >= watch ? "watch" : "critical";
}

/** "95 min" → "1 h 35 min"; "0" → "0 min". */
export function formatMinutes(min: number | null | undefined): string {
  if (min == null) return "—";
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h >= 48) return `${Math.round(h / 24)} days`;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

/** Loads one analytics endpoint with abort + reload. */
export function useAnalyticsData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api
      .get<T>(url, { signal: controller.signal })
      .then((res) => setData(res.data))
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === "CanceledError") return;
        setError(parseApiError(err, "Could not load analytics").message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [url, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}

export function PeriodSelect({
  value,
  onChange,
  options = [7, 30, 90],
}: {
  value: number;
  onChange: (days: number) => void;
  options?: number[];
}) {
  return (
    <div className="inline-flex rounded-xl border border-surface-border bg-surface p-1" role="group" aria-label="Period">
      {options.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          aria-pressed={value === d}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
            value === d ? "bg-brand-primary text-white shadow-sm" : "text-fg-secondary hover:bg-surface-elevated"
          }`}
        >
          {d === 1 ? "Today" : `${d} days`}
        </button>
      ))}
    </div>
  );
}

export function RefreshButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="btn btn-ghost" disabled={loading} aria-label="Refresh">
      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">Refresh</span>
    </button>
  );
}

export type Delta = {
  label: string;
  direction: "up" | "down" | "flat";
  /** Whether this change is good news (drives the colour). */
  good: boolean;
};

export function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
  delta,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  delta?: Delta | null;
  icon?: ReactNode;
}) {
  const DeltaIcon = delta?.direction === "up" ? ArrowUpRight : delta?.direction === "down" ? ArrowDownRight : Minus;
  return (
    <div className="card flex h-full flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-fg-secondary">{label}</p>
        {icon ?? <span className={`h-2.5 w-2.5 rounded-full ${TONE_DOT[tone]}`} aria-hidden />}
      </div>
      <p className={`text-3xl font-bold tracking-tight ${TONE_TEXT[tone]}`}>{value}</p>
      {delta && (
        <p
          className={`inline-flex items-center gap-1 text-xs font-semibold ${
            delta.direction === "flat" ? "text-fg-tertiary" : delta.good ? "text-approved-solid" : "text-brand-danger"
          }`}
        >
          <DeltaIcon className="h-3.5 w-3.5" />
          {delta.label} <span className="font-normal text-fg-tertiary">vs previous period</span>
        </p>
      )}
      {hint && <p className="mt-auto text-xs leading-relaxed text-fg-tertiary">{hint}</p>}
    </div>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

export function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-fg-primary">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-fg-secondary">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export type BarSeries = { key: string; label: string; className: string };

/**
 * Vertical bar chart. One series draws single bars; several series draw grouped bars.
 * Values are shown on hover and for the tallest bar.
 */
export function BarChart({
  data,
  series,
  height = 180,
  format = (v: number) => String(v),
  emptyText = "No data for this period yet.",
}: {
  data: { label: string; values: Record<string, number> }[];
  series: BarSeries[];
  height?: number;
  format?: (v: number) => string;
  emptyText?: string;
}) {
  const max = Math.max(0, ...data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0)));
  if (data.length === 0 || max === 0) {
    return <p className="py-10 text-center text-sm text-fg-tertiary">{emptyText}</p>;
  }
  // Show at most ~12 x-axis labels so long ranges stay readable.
  const every = Math.max(1, Math.ceil(data.length / 12));
  return (
    <div>
      {series.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-4 text-xs text-fg-secondary">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${s.className}`} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => (
          <div key={`${d.label}-${i}`} className="group relative flex h-full flex-1 items-end justify-center gap-0.5">
            {series.map((s) => {
              const v = d.values[s.key] ?? 0;
              return (
                <div
                  key={s.key}
                  className={`w-full max-w-[28px] rounded-t-md transition-opacity group-hover:opacity-80 ${s.className}`}
                  style={{ height: `${Math.max(v > 0 ? 3 : 0, (v / max) * 100)}%` }}
                  title={`${d.label} · ${s.label}: ${format(v)}`}
                />
              );
            })}
            <div className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-fg-primary px-2 py-1 text-xs font-semibold text-fg-inverse group-hover:block">
              {series.map((s) => format(d.values[s.key] ?? 0)).join(" / ")}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1">
        {data.map((d, i) => (
          <div key={`${d.label}-l-${i}`} className="flex-1 truncate text-center text-[11px] text-fg-tertiary">
            {i % every === 0 ? d.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal share bars, e.g. visitors by type. */
export function ShareList({
  items,
  format = (v: number) => String(v),
  emptyText = "Nothing recorded yet.",
}: {
  items: { label: string; value: number; className?: string; meta?: string }[];
  format?: (v: number) => string;
  emptyText?: string;
}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (items.length === 0 || total === 0) return <p className="py-6 text-sm text-fg-tertiary">{emptyText}</p>;
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const share = Math.round((item.value / total) * 100);
        return (
          <li key={item.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-fg-primary">{item.label}</span>
              <span className="text-fg-secondary">
                {format(item.value)} <span className="text-fg-tertiary">· {share}%</span>
                {item.meta && <span className="ml-2 text-xs text-fg-tertiary">{item.meta}</span>}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
              <div className={`h-full rounded-full ${item.className ?? "bg-brand-primary"}`} style={{ width: `${share}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export type AttentionItem = { id: string; title: string; detail?: string; tone: Tone; action?: ReactNode };

/** "Needs attention" list — the things an admin should act on first. */
export function AttentionList({ items, emptyText }: { items: AttentionItem[]; emptyText: string }) {
  if (items.length === 0) {
    return (
      <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${TONE_SOFT.good}`}>✓ {emptyText}</div>
    );
  }
  return (
    <ul className="divide-y divide-surface-border">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${TONE_DOT[item.tone]}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg-primary">{item.title}</p>
            {item.detail && <p className="mt-0.5 text-sm text-fg-secondary">{item.detail}</p>}
          </div>
          {item.action}
        </li>
      ))}
    </ul>
  );
}

export function Insight({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${TONE_SOFT[tone]}`}>{children}</div>;
}

export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONE_SOFT[tone]}`}>
      {children}
    </span>
  );
}

export function LoadingBlock() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-busy>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="card h-28 animate-pulse bg-surface-elevated" />
      ))}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-denied-bg bg-denied-bg px-4 py-3 text-denied-fg">
      <span>{message}</span>
      <button type="button" className="btn btn-ghost" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
