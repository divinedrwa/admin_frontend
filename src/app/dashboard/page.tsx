"use client";

import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const fmtInr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );

const STAT_ACCENTS = {
  blue: { iconBg: "bg-blue-100", badge: "bg-blue-100 text-blue-800" },
  green: { iconBg: "bg-emerald-100", badge: "bg-emerald-100 text-emerald-800" },
  purple: { iconBg: "bg-violet-100", badge: "bg-violet-100 text-violet-800" },
  red: { iconBg: "bg-red-100", badge: "bg-red-100 text-red-800" },
  cyan: { iconBg: "bg-cyan-100", badge: "bg-cyan-100 text-cyan-800" },
  orange: { iconBg: "bg-orange-100", badge: "bg-orange-100 text-orange-800" },
  yellow: { iconBg: "bg-amber-100", badge: "bg-amber-100 text-amber-800" },
  pink: { iconBg: "bg-pink-100", badge: "bg-pink-100 text-pink-800" },
} as const;

type CurrentMonthMaintenance = {
  totalExpected: number;
  totalCollected: number;
  totalPending: number;
  collectionRate: number;
};

type SocietyFundSnapshot = {
  currentFundBalance: number;
  allTimeCollected: number;
  allTimeSpent: number;
  additionalMergedInflowAllTime?: number;
  additionalMergedInflowMonth?: number;
  monthNet: number;
};

type FundTrendPoint = {
  key: string;
  label: string;
  net: number;
};

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

export default function DashboardPage() {
  const [clock, setClock] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [villaCount, setVillaCount] = useState(0);
  const [residentCount, setResidentCount] = useState(0);
  const [guardCount, setGuardCount] = useState(0);
  const [maint, setMaint] = useState<CurrentMonthMaintenance | null>(null);
  const [fund, setFund] = useState<SocietyFundSnapshot | null>(null);
  const [fundTrend, setFundTrend] = useState<FundTrendPoint[]>([]);

  const [visitorTodayCount, setVisitorTodayCount] = useState(0);
  const [parcelPendingCount, setParcelPendingCount] = useState(0);
  const [complaintOpenCount, setComplaintOpenCount] = useState(0);
  const [sosActiveCount, setSosActiveCount] = useState(0);

  const [gates, setGates] = useState<
    Array<{
      id: string;
      name: string;
      isActive: boolean;
      assignedGuard?: { name: string | null } | null;
    }>
  >([]);

  const [billingSnippet, setBillingSnippet] = useState<{
    cycleKey?: string | null;
    status?: string | null;
    paidUsersCount?: number;
    pendingUsersCount?: number;
  } | null>(null);

  const [timeline, setTimeline] = useState<
    Array<{ id: string; at: number; icon: string; text: string; tag: string; tagClass: string }>
  >([]);

  const load = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const [
        maintRes,
        financialRes,
        villasRes,
        residentsRes,
        guardsRes,
        visitorsRes,
        parcelsRes,
        complaintsRes,
        sosRes,
        gatesRes,
        billingRes,
        noticesRes,
      ] = await Promise.all([
        api.get("/maintenance/dashboard").catch(() => null),
        api.get("/maintenance-management/financial-dashboard").catch(() => null),
        api.get("/villas").catch(() => null),
        api.get("/users", { params: { role: "RESIDENT", isActive: "true" } }).catch(() => null),
        api.get("/users", { params: { role: "GUARD", isActive: "true" } }).catch(() => null),
        api.get("/visitors").catch(() => null),
        api.get("/parcels").catch(() => null),
        api.get("/complaints").catch(() => null),
        api.get("/sos-alerts/active").catch(() => null),
        api.get("/gates").catch(() => null),
        api.get("/v1/admin/cycles").catch(() => null),
        api.get("/notices").catch(() => null),
      ]);

      const m = maintRes?.data?.currentMonth as CurrentMonthMaintenance | undefined;
      setMaint(m ?? null);
      const f = financialRes?.data?.fund as SocietyFundSnapshot | undefined;
      setFund(f ?? null);

      const now = new Date();
      const monthWindows = Array.from({ length: 6 }, (_, idx) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        return {
          month,
          year,
          key: `${year}-${String(month).padStart(2, "0")}`,
          label: d.toLocaleDateString("en-US", { month: "short" }),
        };
      });

      const trendResponses = await Promise.all(
        monthWindows.map((w) =>
          api
            .get("/maintenance-management/financial-dashboard", {
              params: { month: w.month, year: w.year },
            })
            .catch(() => null)
        )
      );
      const trendPoints: FundTrendPoint[] = monthWindows.map((w, i) => {
        const raw = trendResponses[i]?.data?.fund?.monthNet;
        const net = typeof raw === "number" ? raw : Number(raw ?? 0);
        return { key: w.key, label: w.label, net: Number.isFinite(net) ? net : 0 };
      });
      setFundTrend(trendPoints);

      setVillaCount(Array.isArray(villasRes?.data?.villas) ? villasRes!.data!.villas.length : 0);
      setResidentCount(Array.isArray(residentsRes?.data?.users) ? residentsRes!.data!.users.length : 0);
      setGuardCount(Array.isArray(guardsRes?.data?.users) ? guardsRes!.data!.users.length : 0);

      const visitors = (visitorsRes?.data?.visitors ?? []) as Array<{
        id: string;
        checkInAt: string;
        name: string;
      }>;
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      setVisitorTodayCount(visitors.filter((v) => new Date(v.checkInAt).getTime() >= start.getTime()).length);

      const parcels = (parcelsRes?.data?.parcels ?? []) as Array<{
        id: string;
        receivedAt: string;
        description: string;
        status: string;
        villa?: { villaNumber?: string };
      }>;
      setParcelPendingCount(parcels.filter((p) => p.status !== "DELIVERED" && p.status !== "COLLECTED").length);

      const complaints = (complaintsRes?.data?.complaints ?? []) as Array<{
        id: string;
        createdAt: string;
        title: string;
        status: string;
      }>;
      setComplaintOpenCount(complaints.filter((c) => c.status !== "CLOSED").length);

      const sosList = (sosRes?.data?.alerts ?? []) as unknown[];
      setSosActiveCount(sosList.length);

      const g = gatesRes?.data?.gates as typeof gates | undefined;
      setGates(Array.isArray(g) ? g : []);

      const cycles = billingRes?.data?.cycles as Array<{
        cycleKey: string;
        status: string;
        paidUsersCount: number;
        pendingUsersCount: number;
      }> | undefined;
      if (Array.isArray(cycles) && cycles[0]) {
        setBillingSnippet({
          cycleKey: cycles[0].cycleKey,
          status: cycles[0].status,
          paidUsersCount: cycles[0].paidUsersCount,
          pendingUsersCount: cycles[0].pendingUsersCount,
        });
      } else setBillingSnippet(null);

      const activities: typeof timeline = [];
      const vin = visitors.slice(0, 40);
      for (const v of vin) {
        activities.push({
          id: `v-${v.id}`,
          at: new Date(v.checkInAt).getTime(),
          icon: "👋",
          text: `Visitor checked in · ${v.name}`,
          tag: "visitor",
          tagClass: "badge-primary",
        });
      }

      const par = parcels.slice(0, 40);
      for (const p of par) {
        activities.push({
          id: `p-${p.id}`,
          at: new Date(p.receivedAt).getTime(),
          icon: "📦",
          text: `Parcel · Villa ${p.villa?.villaNumber ?? "?"} · ${String(p.description).slice(0, 48)}`,
          tag: "parcel",
          tagClass: "badge-warning",
        });
      }

      const comp = complaints.slice(0, 40);
      for (const c of comp) {
        activities.push({
          id: `c-${c.id}`,
          at: new Date(c.createdAt).getTime(),
          icon: "⚠️",
          text: `${c.status}: ${c.title}`,
          tag: "complaint",
          tagClass: c.status === "CLOSED" ? "badge-success" : "badge-warning",
        });
      }

      const noticeList = (noticesRes?.data?.notices ?? []) as Array<{ id: string; createdAt: string; title: string }>;
      for (const n of noticeList.slice(0, 8)) {
        activities.push({
          id: `n-${n.id}`,
          at: new Date(n.createdAt).getTime(),
          icon: "📌",
          text: `Notice: ${n.title}`,
          tag: "notice",
          tagClass: "badge-success",
        });
      }

      activities.sort((a, b) => b.at - a.at);
      setTimeline(activities.slice(0, 10));
    } catch {
      setLoadError("Some dashboard figures could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => {
    const pendingRupee = maint?.totalPending ?? 0;
    const fundBalance = fund?.currentFundBalance ?? 0;
    const fundSub =
      fund == null
        ? "Fund snapshot unavailable"
        : `In ${fmtInr(fund.allTimeCollected)} · Out ${fmtInr(fund.allTimeSpent)} · Added ${fmtInr(
            fund.additionalMergedInflowAllTime ?? 0
          )}`;
    return [
      {
        icon: "🏘️",
        label: "Villas",
        value: String(villaCount),
        sub: `${residentCount} residents`,
        accent: STAT_ACCENTS.blue,
      },
      {
        icon: "💰",
        label: "Maint. pending (month)",
        value: fmtInr(pendingRupee),
        sub: `${maint?.collectionRate ?? 0}% collected`,
        accent: STAT_ACCENTS.yellow,
      },
      {
        icon: "🏦",
        label: "Society fund balance",
        value: fmtInr(fundBalance),
        sub: fundSub,
        accent: fundBalance >= 0 ? STAT_ACCENTS.green : STAT_ACCENTS.red,
        trend: fundTrend,
      },
      {
        icon: "🛡️",
        label: "Active guards",
        value: String(guardCount),
        sub: `${gates.filter((g) => g.isActive).length} gates`,
        accent: STAT_ACCENTS.purple,
      },
      {
        icon: "🆘",
        label: "Active SOS",
        value: String(sosActiveCount),
        sub: sosActiveCount ? "Attention" : "Clear",
        accent: sosActiveCount ? STAT_ACCENTS.red : STAT_ACCENTS.green,
      },
      {
        icon: "👋",
        label: "Visitors today",
        value: String(visitorTodayCount),
        sub: "Check-ins since midnight",
        accent: STAT_ACCENTS.cyan,
      },
      {
        icon: "📦",
        label: "Parcels queued",
        value: String(parcelPendingCount),
        sub: "Pending / awaiting pickup",
        accent: STAT_ACCENTS.orange,
      },
      {
        icon: "⚠️",
        label: "Open complaints",
        value: String(complaintOpenCount),
        sub: "Excludes closed",
        accent: STAT_ACCENTS.pink,
      },
      {
        icon: "🧾",
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
    fund,
    guardCount,
    gates,
    sosActiveCount,
    visitorTodayCount,
    parcelPendingCount,
    complaintOpenCount,
    billingSnippet,
    fundTrend,
  ]);

  const quickActions = [
    { icon: "👥", label: "Residents", href: "/resident-management", box: "hover:bg-blue-50 border-blue-100 text-blue-700" },
    { icon: "👋", label: "Visitors", href: "/visitors", box: "hover:bg-emerald-50 border-emerald-100 text-emerald-700" },
    { icon: "🆘", label: "SOS alerts", href: "/sos-alerts", box: "hover:bg-red-50 border-red-100 text-red-700" },
    { icon: "📢", label: "Notices", href: "/notices", box: "hover:bg-purple-50 border-purple-100 text-purple-700" },
    { icon: "💰", label: "Maintenance", href: "/maintenance-management", box: "hover:bg-amber-50 border-amber-100 text-amber-700" },
    { icon: "🧾", label: "Billing cycles", href: "/maintenance-billing", box: "hover:bg-indigo-50 border-indigo-100 text-indigo-700" },
    { icon: "⚠️", label: "Complaints", href: "/complaints", box: "hover:bg-orange-50 border-orange-100 text-orange-700" },
    { icon: "🚪", label: "Gates", href: "/gates", box: "hover:bg-gray-50 border-gray-200 text-gray-800" },
  ] as const;

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
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{loadError}</div>
        ) : null}

        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Society overview</h1>
              <p className="text-blue-100 mt-2 text-base max-w-xl">
                Live totals from your API — refresh counts with the Reload button below.
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={() => void load()}
                className="mt-4 text-sm px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-50 transition-colors"
              >
                {loading ? "Loading…" : "Reload dashboard"}
              </button>
            </div>
            <div className="text-right shrink-0">
              <div className="text-3xl md:text-4xl font-mono tabular-nums">{clock.toLocaleTimeString()}</div>
              <div className="text-blue-100 mt-2 text-sm">
                {clock.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="stat-card bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`rounded-xl p-3 text-2xl ${stat.accent.iconBg}`}>{stat.icon}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stat.accent.badge}`}>{stat.sub}</span>
              </div>
              <div className="mt-4 text-2xl font-bold text-gray-900 leading-tight break-words">{stat.value}</div>
              <div className="mt-1 text-sm text-gray-500">{stat.label}</div>
              {"trend" in stat && Array.isArray(stat.trend) && stat.trend.length > 0 ? (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                    <span>6-month net trend</span>
                    <span className={stat.trend[stat.trend.length - 1].net >= 0 ? "text-emerald-700" : "text-red-700"}>
                      {fmtInr(stat.trend[stat.trend.length - 1].net)}
                    </span>
                  </div>
                  <svg viewBox="0 0 100 28" className="h-8 w-full">
                    <path d={buildFundSparklinePath(stat.trend)} fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600" />
                  </svg>
                  <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                    <span>{stat.trend[0].label}</span>
                    <span>{stat.trend[stat.trend.length - 1].label}</span>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 card">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Recent activity</h2>
              <span className="badge badge-primary">Latest first</span>
            </div>
            <div className="card-body pt-4">
              {loading && timeline.length === 0 ? (
                <p className="text-gray-500 text-sm">Fetching events…</p>
              ) : timeline.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent events yet. Data will appear as visitors, parcels, and notices are recorded.</p>
              ) : (
                <div className="space-y-2">
                  {timeline.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-2xl shrink-0">{a.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{a.text}</p>
                        <p className="text-xs text-gray-500 mt-1">{relTime(a.at)}</p>
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
                <h2 className="text-lg font-bold text-gray-900">Quick links</h2>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all hover:shadow-sm hover:scale-[1.02] ${action.box}`}
                    >
                      <span className="text-2xl mb-1">{action.icon}</span>
                      <span className="text-xs font-semibold text-center">{action.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-bold text-gray-900">Gate status</h3>
              </div>
              <div className="card-body space-y-3">
                {gates.length === 0 ? (
                  <p className="text-sm text-gray-500">No gates configured.</p>
                ) : (
                  gates.slice(0, 6).map((gate) => (
                    <div key={gate.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{gate.name}</p>
                        <p className="text-xs text-gray-500 truncate">
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
                  <Link href="/gates" className="text-sm text-blue-600 font-medium hover:underline block text-center pt-2">
                    View all gates
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Maintenance · this month</h3>
                <Link href="/maintenance-management" className="text-xs text-blue-600 font-semibold hover:underline">
                  Open
                </Link>
              </div>
              <div className="card-body space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Expected</span>
                  <span className="font-semibold text-gray-900">{fmtInr(maint?.totalExpected ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Collected</span>
                  <span className="font-semibold text-emerald-700">{fmtInr(maint?.totalCollected ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Pending</span>
                  <span className="font-semibold text-amber-700">{fmtInr(maint?.totalPending ?? 0)}</span>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Collection rate</span>
                    <span>{maint?.collectionRate ?? 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-600 transition-[width]"
                      style={{ width: `${Math.min(100, Math.max(0, maint?.collectionRate ?? 0))}%` }}
                    />
                  </div>
                </div>

                {billingSnippet ? (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-800">Billing cycle {billingSnippet.cycleKey}</span>
                      <span className="text-xs uppercase font-medium text-blue-700">{billingSnippet.status ?? ""}</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Paid {billingSnippet.paidUsersCount ?? 0} · Pending {billingSnippet.pendingUsersCount ?? 0}{" "}
                      <Link href="/maintenance-billing" className="text-blue-600 hover:underline ml-1 font-medium">
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
