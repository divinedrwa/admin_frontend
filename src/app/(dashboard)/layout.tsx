"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import {
  exitPlatformView,
  getPlatformViewSession,
  type PlatformViewPayload,
} from "@/lib/platformViewSession";

/**
 * Auth gate + chrome for pages under app/(dashboard)/. These pages render
 * their own internal headers so we deliberately don't reuse [AppShell]
 * (which prepends its own page-title bar and date subline). The contract
 * here is parity with AppShell on the security-relevant surface only:
 *   - useAuth(true) blocks unauthenticated render and redirects to /login
 *   - the same Sidebar
 *   - the same platform-view banner so super-admin "view as" mode is visible
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth(true);
  const router = useRouter();
  const [platformView, setPlatformView] = useState<PlatformViewPayload | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setPlatformView(getPlatformViewSession());
  }, []);

  function exitToSuperAdmin() {
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
          <div className="bg-pending-bg border-b border-pending-solid/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <p className="text-sm text-pending-fg">
              <span className="font-semibold">Platform view:</span> you are signed in as the society
              admin for <span className="font-medium">{platformView.societyName}</span> (full tenant
              access).
            </p>
            <button
              type="button"
              onClick={exitToSuperAdmin}
              className="shrink-0 text-sm font-semibold px-3 py-1.5 rounded-lg bg-pending-solid text-fg-inverse hover:opacity-90"
            >
              Back to platform console
            </button>
          </div>
        ) : null}
        {/* Mobile hamburger for dashboard pages */}
        <div className="md:hidden bg-surface border-b border-surface-border px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-fg-secondary hover:bg-surface-elevated"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <main className="flex-1 overflow-y-auto scrollbar-thin">{children}</main>
      </section>
    </div>
  );
}
