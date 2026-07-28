"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  DoorOpen,
  Droplets,
  Scale,
  TriangleAlert,
} from "lucide-react";

const ANALYTICS_TABS = [
  { href: "/app-analytics", label: "Overview", icon: Activity },
  { href: "/gate-analytics", label: "Gate & Visitors", icon: DoorOpen },
  { href: "/complaint-analytics", label: "Complaints", icon: TriangleAlert },
  { href: "/water-supply-analytics", label: "Water", icon: Droplets },
  { href: "/reconciliation", label: "Reconciliation", icon: Scale },
] as const;

export function AnalyticsTabSwitcher() {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2">
        {ANALYTICS_TABS.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Optional section label above the switcher on analytics pages. */
export function AnalyticsHubEyebrow() {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <BarChart3 className="h-3.5 w-3.5" />
      Analytics hub
    </div>
  );
}
