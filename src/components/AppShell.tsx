"use client";

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
        {/* Top Bar */}
        <header className="bg-surface/80 backdrop-blur-md border-b border-surface-border px-4 md:px-8 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 -ml-2 rounded-lg text-fg-secondary hover:bg-brand-primary-light"
                aria-label="Open menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-fg-primary tracking-tight">{title}</h1>
                <p className="text-sm text-fg-secondary mt-1">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-approved-bg text-approved-fg rounded-full border border-approved-solid/30">
                <span className="w-2 h-2 bg-approved-solid rounded-full animate-pulse"></span>
                <span className="text-sm font-medium">System Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto scrollbar-thin animate-fade-in">
          {children}
        </main>
      </section>
    </div>
  );
}
