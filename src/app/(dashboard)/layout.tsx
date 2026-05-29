"use client";

import { LayoutDashboard } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppShell } from "@/components/AppShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const header = (
    <div className="flex items-center gap-3">
      <div className="hidden rounded-xl bg-brand-primary-light p-2 text-brand-primary sm:flex">
        <LayoutDashboard className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-tertiary">
          Dashboard workspace
        </p>
        <p className="text-sm text-fg-secondary">Shared admin chrome for finance, analytics, and operations pages.</p>
      </div>
    </div>
  );

  return (
    <AppShell title="Dashboard" headerContent={header} rawChildren>
      <ErrorBoundary>{children}</ErrorBoundary>
    </AppShell>
  );
}
