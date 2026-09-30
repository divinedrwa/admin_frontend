"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { apiSuper } from "@/lib/apiSuper";

type Tone = "good" | "watch" | "critical" | "neutral";

type SocietyGrowth = {
  societyId: string;
  name: string;
  occupiedFlats: number;
  activeFlatsMonth: number;
  monthlyReachPct: number;
  thisWeek: number;
  lastWeek: number;
  change: { label: string; direction: "up" | "down" | "flat"; good: boolean } | null;
  trend: number[];
  visitors30: number;
  complaints30: number;
  signal: { tone: Tone; text: string };
};

type PlatformGrowth = {
  societies: SocietyGrowth[];
  totals: { societies: number; occupiedFlats: number; activeFlats: number };
};

const TONE_DOT: Record<Tone, string> = {
  good: "bg-approved-solid",
  watch: "bg-pending-solid",
  critical: "bg-brand-danger",
  neutral: "bg-fg-tertiary",
};

/** Tiny 8-week bar trend. */
function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-6 items-end gap-0.5" aria-hidden>
      {values.map((v, i) => (
        <div key={i} className="w-1.5 rounded-sm bg-white/40" style={{ height: `${Math.max(v ? 12 : 4, (v / max) * 100)}%` }} />
      ))}
    </div>
  );
}

/** Platform owner view: which societies use the app, and which are slipping. */
export function PlatformGrowthPanel() {
  const [data, setData] = useState<PlatformGrowth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiSuper.get<PlatformGrowth>("/super/growth-signals", { signal });
      if (!signal?.aborted) setData(data);
    } catch (e) {
      if (signal?.aborted || axios.isCancel(e)) return;
      setError("Could not load growth signals");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const t = data?.totals;

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Growth signals</h2>
          <p className="text-sm text-fg-secondary">
            Flats using the app per society — weakest first, so you know who needs training or a nudge.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <p className="text-sm text-brand-danger">{error}</p>}

      {t && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-2xl font-bold">{t.societies}</p>
            <p className="text-sm text-fg-secondary">live societies</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-2xl font-bold">{t.occupiedFlats}</p>
            <p className="text-sm text-fg-secondary">occupied flats</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-2xl font-bold">
              {t.activeFlats}{" "}
              <span className="text-base font-medium text-fg-secondary">
                ({t.occupiedFlats ? Math.round((t.activeFlats / t.occupiedFlats) * 100) : 0}%)
              </span>
            </p>
            <p className="text-sm text-fg-secondary">flats used the app in 30 days</p>
          </div>
        </div>
      )}

      {data && data.societies.length === 0 && <p className="text-sm text-fg-secondary">No live societies yet.</p>}

      {data && data.societies.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-fg-secondary">
                <th className="py-2 pr-3">Society</th>
                <th className="py-2 pr-3">Flats using app (30 d)</th>
                <th className="py-2 pr-3">This week</th>
                <th className="py-2 pr-3">8 weeks</th>
                <th className="py-2 pr-3">Visitors / complaints (30 d)</th>
                <th className="py-2">What it means</th>
              </tr>
            </thead>
            <tbody>
              {data.societies.map((s) => (
                <tr key={s.societyId} className="border-b border-white/5 align-top">
                  <td className="py-3 pr-3 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${TONE_DOT[s.signal.tone]}`} aria-hidden />
                      {s.name}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    {s.activeFlatsMonth} of {s.occupiedFlats}{" "}
                    <span className="text-fg-secondary">({s.monthlyReachPct}%)</span>
                  </td>
                  <td className="py-3 pr-3">
                    {s.thisWeek} <span className="text-fg-secondary">vs {s.lastWeek}</span>
                  </td>
                  <td className="py-3 pr-3">
                    <Sparkline values={s.trend} />
                  </td>
                  <td className="py-3 pr-3">
                    {s.visitors30} / {s.complaints30}
                  </td>
                  <td className="py-3 text-fg-secondary">{s.signal.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
