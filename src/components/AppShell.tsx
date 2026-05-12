"use client";

import { Activity, CalendarDays, Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  exitPlatformView,
  getPlatformViewSession,
  type PlatformViewPayload,
} from "@/lib/platformViewSession";

export function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth(true);
  const router = useRouter();
  const [platformView, setPlatformView] = useState<PlatformViewPayload | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setPlatformView(getPlatformViewSession());
  }, []);

  function exitToSuperAdmin() {
    // Restores any tenant-admin session that pre-dated this platform view.
    exitPlatformView();
    setPlatformView(null);
    router.push("/super-admin");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-fg-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-background">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-fg-secondary">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-surface-background">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <section className="flex-1 flex flex-col min-w-0">
        {platformView ? (
          <div className="border-b border-pending-solid/30 bg-pending-bg/80 px-4 py-3 print:hidden md:px-8">
            <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-pending-fg">
                <span className="font-semibold">Platform view:</span> you are signed in as the society
                admin for <span className="font-medium">{platformView.societyName}</span> (full tenant
                access).
              </p>
              <button
                type="button"
                onClick={exitToSuperAdmin}
                className="shrink-0 rounded-xl bg-pending-solid px-3.5 py-2 text-sm font-semibold text-fg-inverse transition-opacity hover:opacity-90"
              >
                Back to platform console
              </button>
            </div>
          </div>
        ) : null}
        <header className="sticky top-0 z-20 border-b border-surface-border bg-surface/85 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4 md:px-8">
            <div className="flex items-center gap-3 md:gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl border border-surface-border bg-surface p-2 text-fg-secondary transition-colors hover:bg-brand-primary-light hover:text-brand-primary md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-tertiary">
                  Admin dashboard
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-fg-primary md:text-3xl">{title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-surface-border bg-surface px-3 py-2 text-sm text-fg-secondary md:flex">
                <CalendarDays className="h-4 w-4 text-brand-primary" />
                <span>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-approved-solid/20 bg-approved-bg px-3 py-2 text-sm font-medium text-approved-fg sm:flex">
                <Activity className="h-4 w-4" />
                <span>System online</span>
              </div>
            </div>
          </div>
        </header>

        <main
          className="flex-1 overflow-y-auto scrollbar-thin"
          style={{
            background:
              "radial-gradient(circle at top right, color-mix(in srgb, var(--gp-brand-primary) 6%, transparent), transparent 20%), radial-gradient(circle at bottom left, color-mix(in srgb, var(--gp-brand-accent) 5%, transparent), transparent 24%)",
          }}
        >
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8 md:py-8 animate-fade-in">
            {children}
          </div>
        </main>
      </section>
    </div>
  );
}
