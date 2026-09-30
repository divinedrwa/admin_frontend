"use client";

import { BarChart3 } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import {
  AnalyticsHubEyebrow,
  AnalyticsTabSwitcher,
} from "@/components/analytics/AnalyticsTabSwitcher";
import {
  AttentionList,
  BarChart,
  ErrorBlock,
  KpiCard,
  KpiGrid,
  LoadingBlock,
  PeriodSelect,
  RefreshButton,
  Section,
  StatusPill,
  toneFor,
  useAnalyticsData,
  type AttentionItem,
  type Tone,
} from "@/components/analytics/AnalyticsKit";
import { Modal } from "@/components/Modal";
import { showToast } from "@/components/Toast";
import { AppShell } from "@/components/AppShell";
import { parseApiError } from "@/utils/errorHandler";

type ComplaintStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

type Summary = {
  summary: {
    totalComplaints: number;
    resolvedCount: number;
    inProgressCount: number;
    pendingCount: number;
    resolutionRate: number;
    avgResolutionTime: number;
    medianResolutionDays?: number;
    slaBreached: number;
    slaComplianceRate: number | null;
    openNow?: number;
    openOver7Days?: number;
    byPriority: Record<string, number>;
  };
};

type CategoryStat = {
  category: string;
  totalCount: number;
  resolvedCount: number;
  pendingCount: number;
  inProgressCount: number;
  avgResolutionTime: number;
  resolutionRate: number;
  performance?: "good" | "fair" | "slow" | "none";
  performanceStatus: string;
};

type PendingComplaint = {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: ComplaintStatus;
  daysPending: number;
  urgencyLevel: "critical" | "high" | "normal";
  slaBreached: boolean;
  villa: { villaNumber: string; block: string | null; ownerName: string | null } | null;
};

type Trend = { trendData: { month: string; totalComplaints: number; resolvedComplaints: number }[] };

const PERFORMANCE_TONE: Record<string, Tone> = { good: "good", fair: "watch", slow: "critical", none: "neutral" };
const URGENCY_TONE: Record<PendingComplaint["urgencyLevel"], Tone> = {
  critical: "critical",
  high: "watch",
  normal: "neutral",
};

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, 1)).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export default function ComplaintAnalyticsPage() {
  const [days, setDays] = useState(30);
  const summary = useAnalyticsData<Summary>(`/complaint-analytics/summary?days=${days}`);
  const categories = useAnalyticsData<{ categoryStats: CategoryStat[] }>(
    `/complaint-analytics/by-category?days=${days}`,
  );
  const pending = useAnalyticsData<{ pendingComplaints: PendingComplaint[] }>(
    "/complaint-analytics/pending-list?limit=20",
  );
  const trend = useAnalyticsData<Trend>("/complaint-analytics/trend?months=6");

  const [selected, setSelected] = useState<PendingComplaint | null>(null);
  const [updateStatus, setUpdateStatus] = useState<ComplaintStatus>("IN_PROGRESS");
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reloadAll = () => {
    summary.reload();
    categories.reload();
    pending.reload();
    trend.reload();
  };

  const handleQuickUpdate = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      await api.patch(`/complaint-analytics/quick-update/${selected.id}`, {
        status: updateStatus,
        adminNotes: adminNotes || undefined,
      });
      showToast("Complaint updated", "success");
      setSelected(null);
      setAdminNotes("");
      reloadAll();
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to update complaint").message, "error");
    } finally {
      setSaving(false);
    }
  };

  const s = summary.data?.summary;
  const openList = pending.data?.pendingComplaints ?? [];

  const attention: AttentionItem[] = openList.slice(0, 8).map((c) => ({
    id: c.id,
    tone: URGENCY_TONE[c.urgencyLevel],
    title: c.title,
    detail: [
      c.villa ? `Flat ${c.villa.block ? `${c.villa.block}-` : ""}${c.villa.villaNumber}` : null,
      c.category,
      `${c.daysPending === 0 ? "today" : `${c.daysPending} ${c.daysPending === 1 ? "day" : "days"} open`}`,
      c.slaBreached ? "SLA missed" : null,
    ]
      .filter(Boolean)
      .join(" · "),
    action: (
      <button
        type="button"
        className="btn btn-ghost shrink-0 text-sm"
        onClick={() => {
          setSelected(c);
          setUpdateStatus(c.status === "OPEN" ? "IN_PROGRESS" : "RESOLVED");
        }}
      >
        Update
      </button>
    ),
  }));

  return (
    <AppShell title="Complaint Analytics">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Service analytics"
          title="Complaint analytics"
          description="How quickly complaints are handled, which categories lag, and what is still open."
          icon={<BarChart3 className="h-6 w-6" />}
        />

        <div className="space-y-2">
          <AnalyticsHubEyebrow />
          <AnalyticsTabSwitcher />
        </div>

        {summary.error && <ErrorBlock message={summary.error} onRetry={reloadAll} />}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-fg-primary">Last {days} days</h2>
          <div className="flex items-center gap-2">
            <PeriodSelect value={days} onChange={setDays} />
            <RefreshButton onClick={reloadAll} loading={summary.loading} />
          </div>
        </div>

        {summary.loading && !s ? (
          <LoadingBlock />
        ) : (
          <KpiGrid>
            <KpiCard
              label="Open right now"
              value={s?.openNow ?? (s ? s.pendingCount + s.inProgressCount : 0)}
              tone={(s?.openNow ?? 0) > 0 ? "watch" : "good"}
              hint="Open or in progress, from any date."
            />
            <KpiCard
              label="Open over 7 days"
              value={s?.openOver7Days ?? 0}
              tone={(s?.openOver7Days ?? 0) > 0 ? "critical" : "good"}
              hint="Oldest items residents are waiting on."
            />
            <KpiCard
              label="Resolved"
              value={s ? `${s.resolvedCount}/${s.totalComplaints}` : "—"}
              tone={s && s.totalComplaints > 0 ? toneFor(s.resolutionRate, 80, 50) : "neutral"}
              hint={s && s.totalComplaints > 0 ? `${s.resolutionRate}% of complaints filed in the period.` : "No complaints filed."}
            />
            <KpiCard
              label="Typical time to resolve"
              value={s && s.resolvedCount > 0 ? `${s.medianResolutionDays ?? s.avgResolutionTime} days` : "—"}
              tone={s && s.resolvedCount > 0 ? toneFor(s.medianResolutionDays ?? s.avgResolutionTime, 2, 5, true) : "neutral"}
              hint={s && s.resolvedCount > 0 ? `Median · average ${s.avgResolutionTime} days.` : undefined}
            />
            <KpiCard
              label="Resolved within SLA"
              value={s?.slaComplianceRate != null ? `${s.slaComplianceRate}%` : "—"}
              tone={s?.slaComplianceRate != null ? toneFor(s.slaComplianceRate, 90, 70) : "neutral"}
              hint={s?.slaComplianceRate != null ? "Of resolved complaints that had an SLA." : "Nothing with an SLA was resolved yet."}
            />
            <KpiCard
              label="SLA missed (still open)"
              value={s?.slaBreached ?? 0}
              tone={(s?.slaBreached ?? 0) > 0 ? "critical" : "good"}
            />
            <KpiCard
              label="Urgent / high priority"
              value={(s?.byPriority?.URGENT ?? 0) + (s?.byPriority?.HIGH ?? 0)}
              hint={`${s?.byPriority?.URGENT ?? 0} urgent · ${s?.byPriority?.HIGH ?? 0} high`}
            />
            <KpiCard label="Filed" value={s?.totalComplaints ?? 0} hint={`In the last ${days} days.`} />
          </KpiGrid>
        )}

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <Section title="Filed vs resolved" subtitle="Last 6 months (resolved includes closed)">
              <BarChart
                data={(trend.data?.trendData ?? []).map((m) => ({
                  label: monthLabel(m.month),
                  values: { filed: m.totalComplaints, resolved: m.resolvedComplaints },
                }))}
                series={[
                  { key: "filed", label: "Filed", className: "bg-pending-solid" },
                  { key: "resolved", label: "Resolved", className: "bg-approved-solid" },
                ]}
                emptyText="No complaints in the last 6 months."
              />
            </Section>
          </div>
          <Section title="Needs attention" subtitle="Most urgent open complaints first">
            <AttentionList items={attention} emptyText="No open complaints." />
          </Section>
        </div>

        <Section title="By category" subtitle={`Complaints filed in the last ${days} days`}>
          {(categories.data?.categoryStats ?? []).length === 0 ? (
            <p className="py-6 text-sm text-fg-tertiary">No complaints filed in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wide text-fg-tertiary">
                    <th className="py-2 pr-4 font-semibold">Category</th>
                    <th className="py-2 pr-4 font-semibold">Filed</th>
                    <th className="py-2 pr-4 font-semibold">Open</th>
                    <th className="py-2 pr-4 font-semibold">Resolved</th>
                    <th className="py-2 pr-4 font-semibold">Avg. time</th>
                    <th className="py-2 font-semibold">Speed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {categories.data!.categoryStats.map((c) => (
                    <tr key={c.category}>
                      <td className="py-3 pr-4 font-medium text-fg-primary">{c.category}</td>
                      <td className="py-3 pr-4">{c.totalCount}</td>
                      <td className="py-3 pr-4">{c.pendingCount + c.inProgressCount}</td>
                      <td className="py-3 pr-4">
                        {c.resolvedCount} <span className="text-fg-tertiary">({c.resolutionRate}%)</span>
                      </td>
                      <td className="py-3 pr-4">{c.resolvedCount > 0 ? `${c.avgResolutionTime} days` : "—"}</td>
                      <td className="py-3">
                        <StatusPill tone={PERFORMANCE_TONE[c.performance ?? "none"] ?? "neutral"}>
                          {c.performanceStatus.replace(/^[^A-Za-z]+/, "")}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      <Modal
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setAdminNotes("");
        }}
      >
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-bold text-fg-primary">Update complaint</h2>
            {selected && <p className="mt-1 text-sm text-fg-secondary">{selected.title}</p>}
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-fg-primary">New status</label>
              <select
                value={updateStatus}
                onChange={(e) => setUpdateStatus(e.target.value as ComplaintStatus)}
                className="input"
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-fg-primary">Note for the resident (optional)</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="input"
                placeholder="What was done…"
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleQuickUpdate} disabled={saving} className="btn btn-primary flex-1">
                {saving ? "Updating…" : "Update"}
              </button>
              <button
                onClick={() => {
                  setSelected(null);
                  setAdminNotes("");
                }}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
