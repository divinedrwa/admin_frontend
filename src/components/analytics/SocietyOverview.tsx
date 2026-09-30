"use client";

import { ArrowDownRight, ArrowUpRight, ChevronRight, Lightbulb, Minus, Phone, Users, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  AttentionList,
  BarChart,
  ErrorBlock,
  KpiCard,
  KpiGrid,
  LoadingBlock,
  Section,
  ShareList,
  StatusPill,
  type Tone,
  useAnalyticsData,
} from "@/components/analytics/AnalyticsKit";

type Change = { label: string; direction: "up" | "down" | "flat"; good: boolean } | null;
type Contact = { name: string; flat: string; phone: string | null; detail?: string; amount?: string };
type Share = { label: string; value: number; amount?: string; pct?: number };

type Overview = {
  period: { days: number };
  summary: string[];
  attention: { id: string; severity: "critical" | "warning" | "info"; title: string; detail: string; area: string; list?: string }[];
  money: {
    collectionRatePct: number;
    collected: string;
    expected: string;
    collectionTone: Tone;
    fundBalance: string;
    monthsOfCover: number | null;
    pending: { amount: string; flats: number; chronicFlats: number; top: Contact[] };
    received: { amount: string; flats: number; onlinePct: number; change: Change; byMode: Share[] };
    expenses: { amount: string; change: Change; top: Share[] };
    net: string;
    netValue: number;
    onlinePayments: { failed: number; abandoned: number };
  };
  gate: {
    letIn: number;
    letInChange: Change;
    requests: number;
    insideNow: number;
    waitingNow: number;
    answeredInAppPct: number;
    typicalReply: string | null;
    busiestHour: string | null;
    busiestDay: string | null;
    deliveries: { received: number; handedOver: number; waitingOverADay: number };
    vehicleEntries: number;
  };
  security: {
    patrols: { planned: number; done: number; missed: number };
    sos: { total: number; open: number; typicalAck: string | null; typicalResolve: string | null };
    staff: { onRoll: number; presentToday: number };
  };
  service: {
    complaints: {
      open: number;
      overdue: number;
      filed: number;
      resolved: number;
      typicalFixDays: number | null;
      topCategories: { label: string; count: number }[];
      repeatFlats: number;
    };
    amenities: { bookings: number; cancelled: number; top: { label: string; count: number }[]; unused: string[] };
    notices: { published: number };
    alerts: { sent: number; opened: number; openedPct: number; notDelivered: number };
    contractsEnding: { title: string; vendor: string; daysLeft: number }[];
    projects: { title: string; collected: string; target: string; pct: number }[];
  };
  water: { perDay: string | null; tone: Tone; detail: string };
  people: {
    total: number;
    using: number;
    occupiedFlats: number;
    flatsWithoutApp: number;
    cantGetAlerts: number;
    newResidents: { added: number; signedIn: number };
    versions: { latest: string | null; onOld: number };
    roles: { role: string; label: string; total: number; using: number; stopped: number; never: number }[];
  };
  app: {
    liveNow: number;
    activeToday: number;
    activeWeek: number;
    activeMonth: number;
    installs: number;
    installsChange: Change;
    uninstalls: number;
    trackingSince: string;
    signIns: number;
    signOuts: number;
    appOpens: number;
    devices: {
      active: number;
      people: number;
      onePhone: number;
      twoPhones: number;
      threePlus: number;
      byPlatform: { label: string; count: number; pct: number }[];
      topModels: { label: string; count: number }[];
    };
    health: {
      problemFreePct: number;
      tone: Tone;
      connectionProblems: number;
      appErrors: number;
      topProblems: { label: string; count: number; people: number }[];
    };
    busiestHour: string | null;
    busiestDay: string | null;
    cameBack: { nextDay: number; week: number; month: number };
    daily: { date: string; label: string; active: number; signIns: number; installs: number }[];
  };
  growth: {
    occupiedFlats: number;
    weeklyActiveFlats: { label: string; flats: number }[];
    thisWeek: number;
    change: Change;
    signal: { tone: Tone; text: string };
  };
  features: { id: string; label: string; used: number; of: number; unit: string; pct: number; tone: Tone; tip: string }[];
  outreach: Record<string, Contact[]>;
};

const LINKS: Record<string, string> = {
  gate: "/gate-analytics",
  complaints: "/complaint-analytics",
  water: "/water-supply-analytics",
  dues: "/maintenance-management",
  sos: "/sos-alerts",
  security: "/guard-patrols",
};

const LIST_TITLES: Record<string, string> = {
  duesPending: "Flats with pending dues",
  neverOpened: "Never opened the app",
  cantGetAlerts: "Can't get alerts",
  flatsWithoutApp: "Flats not using the app",
  regularVisitors: "Regular visitors",
};

const BAR_TONE: Record<Tone, string> = {
  good: "bg-approved-solid",
  watch: "bg-pending-solid",
  critical: "bg-brand-danger",
  neutral: "bg-brand-primary",
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const toDelta = (c: Change) => (c ? { label: c.label.replace(" vs before", ""), direction: c.direction, good: c.good } : null);

function coverLabel(months: number): string {
  if (months < 1) {
    const days = Math.round(months * 30);
    return days <= 1 ? "about a day" : `about ${days} days`;
  }
  return months < 1.5 ? "about a month" : `${months.toFixed(1)} months`;
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Everything an admin needs to run and grow the society, in plain language. */
export function SocietyOverview({ days, fresh = false }: { days: number; fresh?: boolean }) {
  // `fresh` (after Refresh) skips the server's one-minute cache.
  const { data, loading, error, reload } = useAnalyticsData<{ overview: Overview }>(
    `/app-analytics/society-overview?days=${days}${fresh ? "&fresh=1" : ""}`,
  );
  const [openList, setOpenList] = useState<string | null>(null);
  const o = data?.overview;

  if (error) return <ErrorBlock message={error} onRetry={reload} />;
  if (!o) return loading ? <LoadingBlock /> : null;

  const { money, gate, security, service, water, people, app, growth } = o;
  const failed = money.onlinePayments.failed + money.onlinePayments.abandoned;

  return (
    <div className="space-y-6">
      <Section title="Needs attention" subtitle="Most important first">
        <AttentionList
          emptyText="All clear — nothing needs your attention right now."
          items={o.attention.map((a) => ({
            id: a.id,
            title: a.title,
            detail: a.detail,
            tone: a.severity === "critical" ? "critical" : a.severity === "warning" ? "watch" : "neutral",
            action:
              a.list && (o.outreach[a.list]?.length ?? 0) > 0 ? (
                <button type="button" className="btn btn-ghost text-xs" onClick={() => setOpenList(a.list!)}>
                  <Users className="h-3.5 w-3.5" /> See who
                </button>
              ) : LINKS[a.area] ? (
                <Link href={LINKS[a.area]} className="btn btn-ghost text-xs">
                  Open <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ) : undefined,
          }))}
        />
      </Section>

      {o.summary.length > 0 && (
        <Section title="This week" subtitle="Compared with last week">
          <ul className="space-y-2 text-sm text-fg-primary">
            {o.summary.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-primary" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Money ─────────────────────────────────────────── */}
      <SectionHeading title="Money" subtitle="Collection, dues, income and spending" />
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-1">
          <p className="text-sm text-fg-secondary">All maintenance collected</p>
          <p className={`mt-1 text-3xl font-bold ${toneText(money.collectionTone)}`}>{money.collectionRatePct}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-elevated">
            <div
              className={`h-full rounded-full ${BAR_TONE[money.collectionTone]}`}
              style={{ width: `${Math.min(100, money.collectionRatePct)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-fg-tertiary">
            {money.collected} of {money.expected} billed so far
          </p>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-surface-border pt-3">
            <div>
              <p className="text-xs text-fg-secondary">Society fund</p>
              <p className="text-xl font-bold text-fg-primary">{money.fundBalance}</p>
            </div>
            {money.monthsOfCover != null && (
              <StatusPill tone={money.monthsOfCover < 1 ? "critical" : money.monthsOfCover < 3 ? "watch" : "good"}>
                Covers {coverLabel(money.monthsOfCover)}
              </StatusPill>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          <KpiCard
            label={`Received in ${days} days`}
            value={money.received.amount}
            hint={`${plural(money.received.flats, "flat")} paid · ${money.received.onlinePct}% online`}
            delta={toDelta(money.received.change)}
          />
          <KpiCard label={`Spent in ${days} days`} value={money.expenses.amount} delta={toDelta(money.expenses.change)} />
          <KpiCard
            label={money.netValue >= 0 ? "Saved (in − out)" : "More spent than received"}
            value={money.net}
            tone={money.netValue >= 0 ? "good" : "critical"}
          />
          <KpiCard
            label="Pending dues"
            value={money.pending.amount}
            tone={money.pending.flats > 0 ? "watch" : "good"}
            hint={`${plural(money.pending.flats, "flat")} · ${money.pending.chronicFlats} owe for 2+ months`}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost" onClick={() => setOpenList("duesPending")}>
          <Users className="h-4 w-4" /> Who owes ({money.pending.top.length})
        </button>
        <Link href="/maintenance-reminders" className="btn btn-ghost">
          Send reminder
        </Link>
        <Link href="/maintenance-management" className="btn btn-ghost">
          Dues screen
        </Link>
        {failed > 0 && (
          <StatusPill tone="watch">
            {plural(failed, "online payment")} didn&apos;t go through ({money.onlinePayments.failed} failed,{" "}
            {money.onlinePayments.abandoned} not finished)
          </StatusPill>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="How residents paid">
          <ShareList
            items={money.received.byMode.map((m) => ({ label: m.label, value: m.value }))}
            format={(v) => `₹${Math.round(v).toLocaleString("en-IN")}`}
            emptyText="No payments in this period."
          />
        </Section>
        <Section title="Where the money went" subtitle="Top expense heads">
          <ShareList
            items={money.expenses.top.map((m) => ({ label: m.label, value: m.value }))}
            format={(v) => `₹${Math.round(v).toLocaleString("en-IN")}`}
            emptyText="No expenses recorded in this period."
          />
        </Section>
      </div>

      {/* ── Gate & security ───────────────────────────────── */}
      <SectionHeading title="Gate & security" subtitle={`Last ${days} days`} />
      <KpiGrid>
        <KpiCard label="People let in" value={gate.letIn} hint={plural(gate.requests, "gate request")} delta={toDelta(gate.letInChange)} />
        <KpiCard
          label="Answered in the app"
          value={`${gate.answeredInAppPct}%`}
          tone={gate.answeredInAppPct >= 75 ? "good" : gate.answeredInAppPct >= 50 ? "watch" : "critical"}
          hint={gate.typicalReply ? `Typical reply ${gate.typicalReply}` : undefined}
        />
        <KpiCard label="Inside right now" value={gate.insideNow} />
        <KpiCard label="Waiting for a reply" value={gate.waitingNow} tone={gate.waitingNow > 0 ? "watch" : "good"} />
      </KpiGrid>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="At the gate">
          <Rows
            rows={[
              ["Busiest time", gate.busiestHour ?? "—"],
              ["Busiest day", gate.busiestDay ?? "—"],
              ["Deliveries received", `${gate.deliveries.received} (${gate.deliveries.handedOver} handed over)`],
              ["Parcels at gate over a day", String(gate.deliveries.waitingOverADay)],
              ["Vehicle entries logged", String(gate.vehicleEntries)],
            ]}
          />
          {(o.outreach.regularVisitors?.length ?? 0) > 0 && (
            <button type="button" className="btn btn-ghost mt-3" onClick={() => setOpenList("regularVisitors")}>
              <Users className="h-4 w-4" /> Regular visitors — give a standing pass
            </button>
          )}
        </Section>
        <Section title="Security">
          <Rows
            rows={[
              [
                "Patrol rounds done",
                security.patrols.planned === 0
                  ? "None planned"
                  : `${security.patrols.done} of ${security.patrols.planned}${security.patrols.missed ? ` · ${security.patrols.missed} missed` : ""}`,
              ],
              ["SOS alerts", security.sos.total === 0 ? "None" : `${security.sos.total} (${security.sos.open} open)`],
              ...(security.sos.typicalAck ? [["Typical time to respond", security.sos.typicalAck] as [string, string]] : []),
              ...(security.sos.typicalResolve ? [["Typical time to resolve", security.sos.typicalResolve] as [string, string]] : []),
              [
                "Staff present today",
                security.staff.onRoll === 0 ? "No staff added" : `${security.staff.presentToday} of ${security.staff.onRoll}`,
              ],
            ]}
          />
        </Section>
      </div>

      {/* ── Service ───────────────────────────────────────── */}
      <SectionHeading title="Service" subtitle="Complaints, amenities, notices and water" />
      <KpiGrid>
        <KpiCard
          label="Complaints open"
          value={service.complaints.open}
          tone={service.complaints.overdue > 0 ? "critical" : service.complaints.open > 0 ? "watch" : "good"}
          hint={service.complaints.overdue > 0 ? `${service.complaints.overdue} over 7 days` : undefined}
        />
        <KpiCard
          label="Typical time to fix"
          value={service.complaints.typicalFixDays == null ? "—" : `${service.complaints.typicalFixDays} days`}
          hint={`${service.complaints.resolved} fixed · ${service.complaints.filed} filed`}
        />
        <KpiCard
          label="Alerts read by residents"
          value={`${service.alerts.openedPct}%`}
          tone={service.alerts.openedPct >= 40 ? "good" : service.alerts.openedPct >= 15 ? "watch" : "critical"}
          hint={`${service.alerts.opened} of ${service.alerts.sent}`}
        />
        <KpiCard label="Water per day" value={water.perDay ?? "—"} tone={water.tone} hint={water.detail} />
      </KpiGrid>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Complaints, amenities & notices">
          <Rows
            rows={[
              ...(service.complaints.topCategories.length
                ? [["Most complaints about", service.complaints.topCategories.map((c) => `${c.label} (${c.count})`).join(", ")] as [string, string]]
                : []),
              ...(service.complaints.repeatFlats ? [["Flats complaining again", String(service.complaints.repeatFlats)] as [string, string]] : []),
              [
                "Amenity bookings",
                `${service.amenities.bookings}${service.amenities.cancelled ? ` (${service.amenities.cancelled} cancelled)` : ""}`,
              ],
              ...(service.amenities.top.length
                ? [["Most booked", service.amenities.top.map((a) => `${a.label} (${a.count})`).join(", ")] as [string, string]]
                : []),
              ...(service.amenities.unused.length ? [["Not booked at all", service.amenities.unused.join(", ")] as [string, string]] : []),
              ["Notices published", String(service.notices.published)],
              ...(service.alerts.notDelivered ? [["Alerts not delivered", String(service.alerts.notDelivered)] as [string, string]] : []),
            ]}
          />
        </Section>
        {(service.contractsEnding.length > 0 || service.projects.length > 0) && (
          <Section title="Contracts & projects">
            <Rows
              rows={[
                ...service.contractsEnding.map(
                  (c) => [`${c.vendor} — ${c.title}`, `ends in ${plural(c.daysLeft, "day")}`] as [string, string],
                ),
                ...service.projects.map((p) => [p.title, `${p.collected} of ${p.target} (${p.pct}%)`] as [string, string]),
              ]}
            />
          </Section>
        )}
      </div>

      {/* ── People & app ──────────────────────────────────── */}
      <SectionHeading title="People & app" subtitle="Who uses the app, phones and app health" />
      <KpiGrid>
        <KpiCard label="Using the app now" value={app.liveNow} tone="good" />
        <KpiCard label="Used it today" value={app.activeToday} hint={`${app.activeWeek} this week · ${app.activeMonth} this month`} />
        <KpiCard
          label="Flats not using the app"
          value={`${people.flatsWithoutApp} of ${people.occupiedFlats}`}
          tone={people.flatsWithoutApp > 0 ? "watch" : "good"}
        />
        <KpiCard
          label="Residents who can't get alerts"
          value={people.cantGetAlerts}
          tone={people.cantGetAlerts > 0 ? "watch" : "good"}
          hint="Signed out or removed the app"
        />
      </KpiGrid>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Who uses the app" subtitle={`${people.using} of ${people.total} people opened it in the last ${days} days`}>
          <div className="space-y-4">
            {people.roles.map((r) => (
              <div key={r.role}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-semibold text-fg-primary">{r.label}</span>
                  <span className="font-semibold text-fg-secondary">
                    {r.using} of {r.total} using
                  </span>
                </div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-elevated">
                  <div className="bg-approved-solid" style={{ width: `${r.total ? (r.using / r.total) * 100 : 0}%` }} />
                  <div className="bg-pending-solid" style={{ width: `${r.total ? (r.stopped / r.total) * 100 : 0}%` }} />
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
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["neverOpened", "cantGetAlerts", "flatsWithoutApp"] as const).map((key) => (
              <button
                key={key}
                type="button"
                className="btn btn-ghost text-xs"
                disabled={(o.outreach[key]?.length ?? 0) === 0}
                onClick={() => setOpenList(key)}
              >
                <Users className="h-3.5 w-3.5" /> {LIST_TITLES[key]} ({o.outreach[key]?.length ?? 0})
              </button>
            ))}
          </div>
        </Section>
        <Section title="People using the app each day">
          <BarChart
            height={180}
            data={app.daily.map((d) => ({ label: d.label, values: { active: d.active, installs: d.installs } }))}
            series={[
              { key: "active", label: "People", className: "bg-brand-primary" },
              { key: "installs", label: "New phones", className: "bg-approved-solid" },
            ]}
            emptyText="No app activity yet."
          />
        </Section>
        <Section title={`Installs & sign-ins in ${days} days`}>
          <Rows
            rows={[
              ["New phones (installs)", String(app.installs)],
              ["Uninstalls", `${app.uninstalls} (since ${dateLabel(app.trackingSince)})`],
              ["Password sign-ins", `${app.signIns} (since ${dateLabel(app.trackingSince)})`],
              ["Sign-outs", String(app.signOuts)],
              ["App opened", `${app.appOpens} times`],
              ["New residents added", `${people.newResidents.added} (${people.newResidents.signedIn} signed in)`],
            ]}
          />
        </Section>
        <Section title="Phones & versions">
          <Rows
            rows={[
              ["Phones getting alerts", `${app.devices.active} for ${plural(app.devices.people, "person", "people")}`],
              ["One phone / two / three or more", `${app.devices.onePhone} / ${app.devices.twoPhones} / ${app.devices.threePlus}`],
              ["Android / iPhone", app.devices.byPlatform.map((p) => `${p.label} ${p.pct}%`).join(" · ") || "—"],
              ...(app.devices.topModels.length
                ? [["Common phones", app.devices.topModels.slice(0, 3).map((m) => m.label).join(", ")] as [string, string]]
                : []),
              ["Latest app version", people.versions.latest ?? "—"],
              ["People on an older version", String(people.versions.onOld)],
            ]}
          />
        </Section>
        <Section title="App health">
          <Rows
            rows={[
              ["Visits without any problem", `${app.health.problemFreePct}%`],
              ["Slow or dropped connection", String(app.health.connectionProblems)],
              ["App errors", String(app.health.appErrors)],
              ...app.health.topProblems
                .slice(0, 3)
                .map((e) => [`• ${e.label}`, `${e.count} (${plural(e.people, "person", "people")})`] as [string, string]),
              ["Busiest time in the app", `${app.busiestHour ?? "—"} · ${app.busiestDay ?? "—"}`],
              ["Came back next day / week / month", `${app.cameBack.nextDay}% / ${app.cameBack.week}% / ${app.cameBack.month}%`],
            ]}
          />
        </Section>
        <Section title="Growth" subtitle="Flats using the app each week (last 8 weeks)">
          <div className="mb-4 rounded-xl border border-surface-border p-3 text-sm">
            <p className="font-semibold text-fg-primary">
              {growth.thisWeek} of {growth.occupiedFlats} flats used the app this week
            </p>
            <p className="mt-1 text-fg-secondary">{growth.signal.text}</p>
            {growth.change && <ChangeText change={growth.change} />}
          </div>
          <BarChart
            height={150}
            data={growth.weeklyActiveFlats.map((w) => ({ label: w.label, values: { flats: w.flats } }))}
            series={[{ key: "flats", label: "Flats", className: "bg-brand-primary" }]}
            emptyText="No weekly data yet."
          />
        </Section>
      </div>

      {o.features.length > 0 && (
        <Section title="Features residents use" subtitle="Higher is better — each one saves the guard or the office work">
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

      {openList && (
        <ContactsDialog
          title={LIST_TITLES[openList] ?? "People"}
          contacts={o.outreach[openList] ?? []}
          onClose={() => setOpenList(null)}
        />
      )}
    </div>
  );
}

function toneText(tone: Tone): string {
  return tone === "good"
    ? "text-approved-solid"
    : tone === "watch"
      ? "text-pending-solid"
      : tone === "critical"
        ? "text-brand-danger"
        : "text-fg-primary";
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pt-2">
      <h2 className="text-lg font-semibold text-fg-primary">{title}</h2>
      {subtitle && <p className="text-sm text-fg-secondary">{subtitle}</p>}
    </div>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-surface-border text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-4 py-2">
          <dt className="text-fg-secondary">{label}</dt>
          <dd className="text-right font-semibold text-fg-primary">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ChangeText({ change }: { change: NonNullable<Change> }) {
  const Icon = change.direction === "up" ? ArrowUpRight : change.direction === "down" ? ArrowDownRight : Minus;
  return (
    <p
      className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${
        change.direction === "flat" ? "text-fg-tertiary" : change.good ? "text-approved-solid" : "text-brand-danger"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {change.label}
    </p>
  );
}

/** People to contact, each with a click-to-call link. */
function ContactsDialog({ title, contacts, onClose }: { title: string; contacts: Contact[]; onClose: () => void }): ReactNode {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="card max-h-[80vh] w-full max-w-lg overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h3 className="font-semibold text-fg-primary">
            {title} ({contacts.length})
          </h3>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="max-h-[65vh] divide-y divide-surface-border overflow-y-auto">
          {contacts.map((c, i) => (
            <li key={`${c.name}-${c.flat}-${i}`} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-fg-primary">{c.name}</p>
                <p className="text-xs text-fg-secondary">
                  {[c.flat && `Flat ${c.flat}`, c.amount, c.detail].filter(Boolean).join(" · ")}
                </p>
              </div>
              {c.phone ? (
                <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="btn btn-ghost shrink-0 text-xs">
                  <Phone className="h-3.5 w-3.5" /> {c.phone}
                </a>
              ) : (
                <span className="text-xs text-fg-tertiary">No phone</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
