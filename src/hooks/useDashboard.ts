import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type CurrentMonthMaintenance = {
  totalExpected: number;
  totalCollected: number;
  totalPending: number;
  collectionRate: number;
};

export type SocietyFundSnapshot = {
  currentFundBalance: number;
  allTimeCollected: number;
  allTimeSpent: number;
  additionalMergedInflowAllTime?: number;
  additionalMergedInflowMonth?: number;
  monthNet: number;
  totalAdvanceCredit?: number;
};

export type FundTrendPoint = {
  key: string;
  label: string;
  net: number;
};

export type DashboardTimelineItem = {
  id: string;
  at: number;
  icon: string;
  text: string;
  tag: string;
  tagClass: string;
};

export type DashboardData = {
  villaCount: number;
  residentCount: number;
  guardCount: number;
  maint: CurrentMonthMaintenance | null;
  billingMaint: CurrentMonthMaintenance | null;
  fund: SocietyFundSnapshot | null;
  fundTrend: FundTrendPoint[];
  visitorTodayCount: number;
  parcelPendingCount: number;
  complaintOpenCount: number;
  sosActiveCount: number;
  gates: Array<{
    id: string;
    name: string;
    isActive: boolean;
    assignedGuard?: { name: string | null } | null;
  }>;
  billingSnippet: {
    cycleKey?: string | null;
    status?: string | null;
    paidUsersCount?: number;
    pendingUsersCount?: number;
  } | null;
  timeline: DashboardTimelineItem[];
  activeProjectCount: number;
  projectOutstanding: number;
  userStats: {
    byRole: Record<string, { active: number; inactive: number }>;
    totalActive: number;
    totalInactive: number;
  } | null;
  loadError: string | null;
  failedEndpoints: string[];
};

type VillasListResponse = { villas: Array<{ id: string }>; total?: number };
type UsersListResponse = { users: Array<{ id: string }>; total?: number };

type BillingResidentsTotals = {
  totalExpected: number;
  totalCollected: number;
};

async function fetchDashboardData(signal?: AbortSignal): Promise<DashboardData> {
  const safeGet = async <T,>(request: Promise<T>) => {
    try {
      const data = await request;
      return { ok: true as const, data };
    } catch {
      return { ok: false as const, error: true };
    }
  };

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
    specialProjectsRes,
    userStatsRes,
  ] = await Promise.all([
    api.get("/maintenance/dashboard", { signal }).catch(() => null),
    api.get("/maintenance-management/financial-dashboard", { signal }).catch(() => null),
    safeGet(api.get<VillasListResponse>("/villas", { params: { limit: 1, offset: 0 }, signal })),
    safeGet(
      api.get<UsersListResponse>("/users", {
        params: { role: "RESIDENT", isActive: "true", limit: 1, offset: 0 },
        signal,
      }),
    ),
    safeGet(
      api.get<UsersListResponse>("/users", {
        params: { role: "GUARD", isActive: "true", limit: 1, offset: 0 },
        signal,
      }),
    ),
    api.get("/visitors", { params: { limit: 20, offset: 0 }, signal }).catch(() => null),
    api.get("/parcels", { params: { limit: 20, offset: 0 }, signal }).catch(() => null),
    api.get("/complaints", { params: { limit: 20, offset: 0 }, signal }).catch(() => null),
    api.get("/sos-alerts/active", { signal }).catch(() => null),
    api.get("/gates", { signal }).catch(() => null),
    api.get("/v1/admin/cycles", { signal }).catch(() => null),
    api.get("/notices", { params: { limit: 10, offset: 0 }, signal }).catch(() => null),
    api.get("/special-projects?status=ACTIVE&limit=200", { signal }).catch(() => null),
    api.get("/users/stats", { signal }).catch(() => null),
  ]);

  const silentFails: string[] = [];
  if (!maintRes) silentFails.push("maintenance");
  if (!financialRes) silentFails.push("finance");
  if (!visitorsRes) silentFails.push("visitors");
  if (!parcelsRes) silentFails.push("parcels");
  if (!complaintsRes) silentFails.push("complaints");
  if (!sosRes) silentFails.push("SOS alerts");
  if (!gatesRes) silentFails.push("gates");
  if (!billingRes) silentFails.push("billing");
  if (!noticesRes) silentFails.push("notices");

  const m = maintRes?.data?.currentMonth as CurrentMonthMaintenance | undefined;
  const f = financialRes?.data?.fund as SocietyFundSnapshot | undefined;

  const monthWise = (maintRes?.data?.monthWise ?? []) as Array<{
    month: number;
    year: number;
    monthName: string;
    net: number;
  }>;
  const fundTrend: FundTrendPoint[] = [...monthWise].reverse().map((mw) => ({
    key: `${mw.year}-${String(mw.month).padStart(2, "0")}`,
    label: mw.monthName,
    net: typeof mw.net === "number" && Number.isFinite(mw.net) ? mw.net : 0,
  }));

  const countErrors: string[] = [];
  let villaCount = 0;
  let residentCount = 0;
  let guardCount = 0;

  if (villasRes.ok && Array.isArray(villasRes.data.data?.villas)) {
    const vd = villasRes.data.data;
    villaCount = typeof vd.total === "number" ? vd.total : vd.villas.length;
  } else {
    countErrors.push("villas");
  }
  if (residentsRes.ok && Array.isArray(residentsRes.data.data?.users)) {
    const rd = residentsRes.data.data;
    residentCount = typeof rd.total === "number" ? rd.total : rd.users.length;
  } else {
    countErrors.push("residents");
  }
  if (guardsRes.ok && Array.isArray(guardsRes.data.data?.users)) {
    const gd = guardsRes.data.data;
    guardCount = typeof gd.total === "number" ? gd.total : gd.users.length;
  } else {
    countErrors.push("guards");
  }

  const visitorsData = visitorsRes?.data ?? {};
  const visitors = (visitorsData.visitors ?? []) as Array<{
    id: string;
    checkInAt: string;
    name: string;
  }>;
  const visitorTodayCount =
    typeof visitorsData.todayCount === "number" ? visitorsData.todayCount : visitors.length;

  const parcelsData = parcelsRes?.data ?? {};
  const parcels = (parcelsData.parcels ?? []) as Array<{
    id: string;
    receivedAt: string;
    description: string;
    status: string;
    villa?: { villaNumber?: string };
  }>;
  const parcelPendingCount =
    typeof parcelsData.pendingCount === "number"
      ? parcelsData.pendingCount
      : parcels.filter((p) => p.status !== "DELIVERED" && p.status !== "COLLECTED").length;

  const complaintsData = complaintsRes?.data ?? {};
  const complaints = (complaintsData.complaints ?? []) as Array<{
    id: string;
    createdAt: string;
    title: string;
    status: string;
  }>;
  const complaintOpenCount =
    typeof complaintsData.openCount === "number"
      ? complaintsData.openCount
      : complaints.filter((c) => c.status !== "CLOSED").length;

  const sosList = (sosRes?.data?.alerts ?? []) as unknown[];
  const gates = (gatesRes?.data?.gates ?? []) as DashboardData["gates"];

  let billingMaint: CurrentMonthMaintenance | null = null;
  let billingSnippet: DashboardData["billingSnippet"] = null;

  const cycles = billingRes?.data?.cycles as Array<{
    cycleKey: string;
    status: string;
    paidUsersCount: number;
    pendingUsersCount: number;
  }> | undefined;

  if (Array.isArray(cycles) && cycles[0]) {
    const cycleKey = cycles[0].cycleKey;
    const residentPayRes = await api
      .get("/v1/admin/residents/payments", { params: { cycleMonth: cycleKey }, signal })
      .catch(() => null);
    const t = residentPayRes?.data?.totals as BillingResidentsTotals | undefined;
    if (t) {
      const totalExpected = Number(t.totalExpected ?? 0);
      const totalCollected = Number(t.totalCollected ?? 0);
      const totalPending = Math.max(0, totalExpected - totalCollected);
      billingMaint = {
        totalExpected,
        totalCollected,
        totalPending,
        collectionRate: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
      };
    }
    billingSnippet = {
      cycleKey,
      status: cycles[0].status,
      paidUsersCount: cycles[0].paidUsersCount,
      pendingUsersCount: cycles[0].pendingUsersCount,
    };
  }

  const activities: DashboardTimelineItem[] = [];
  for (const v of visitors.slice(0, 40)) {
    activities.push({
      id: `v-${v.id}`,
      at: new Date(v.checkInAt).getTime(),
      icon: "👋",
      text: `Visitor checked in · ${v.name}`,
      tag: "visitor",
      tagClass: "badge-primary",
    });
  }
  for (const p of parcels.slice(0, 40)) {
    activities.push({
      id: `p-${p.id}`,
      at: new Date(p.receivedAt).getTime(),
      icon: "📦",
      text: `Parcel · Villa ${p.villa?.villaNumber ?? "?"} · ${String(p.description).slice(0, 48)}`,
      tag: "parcel",
      tagClass: "badge-warning",
    });
  }
  for (const c of complaints.slice(0, 40)) {
    activities.push({
      id: `c-${c.id}`,
      at: new Date(c.createdAt).getTime(),
      icon: "⚠️",
      text: `${c.status}: ${c.title}`,
      tag: "complaint",
      tagClass: c.status === "CLOSED" ? "badge-success" : "badge-warning",
    });
  }
  const noticeList = (noticesRes?.data?.notices ?? []) as Array<{
    id: string;
    createdAt: string;
    title: string;
  }>;
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

  const spList = (specialProjectsRes?.data?.projects ?? []) as Array<{
    id: string;
    totalCollected: number;
    targetAmount: number;
  }>;
  const activeProjectCount = spList.length;
  const projectOutstanding = spList.reduce(
    (sum, p) => sum + Math.max(0, (p.targetAmount ?? 0) - (p.totalCollected ?? 0)),
    0,
  );

  const us = userStatsRes?.data as DashboardData["userStats"] | undefined;
  activities.sort((a, b) => b.at - a.at);

  return {
    villaCount,
    residentCount,
    guardCount,
    maint: m ?? null,
    billingMaint,
    fund: f ?? null,
    fundTrend,
    visitorTodayCount,
    parcelPendingCount,
    complaintOpenCount,
    sosActiveCount: sosList.length,
    gates: Array.isArray(gates) ? gates : [],
    billingSnippet,
    timeline: activities.slice(0, 10),
    activeProjectCount,
    projectOutstanding,
    userStats: us && typeof us.totalActive === "number" ? us : null,
    loadError:
      countErrors.length > 0
        ? `Some live counts could not be refreshed (${countErrors.join(
            ", ",
          )}). Please re-login and verify society selection.`
        : null,
    failedEndpoints: silentFails,
  };
}

export function useDashboard(refetchInterval = 60_000) {
  const hasToken =
    typeof window !== "undefined" && Boolean(localStorage.getItem("token")?.trim());

  return useQuery({
    queryKey: ["dashboard"],
    queryFn: ({ signal }) => fetchDashboardData(signal),
    enabled: hasToken,
    refetchInterval,
    staleTime: 30_000,
  });
}
