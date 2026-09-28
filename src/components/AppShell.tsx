"use client";

import { Activity, CalendarDays, Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { LegalConsentGate } from "./LegalConsentGate";
import { useAuth } from "@/hooks/useAuth";
import { useApiHealth } from "@/hooks/useApiHealth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  exitPlatformView,
  getPlatformViewSession,
  type PlatformViewPayload,
} from "@/lib/platformViewSession";
import { api, clearTenantAuthCookie } from "@/lib/api";
import { isHttpOnlyAuthEnabled } from "@/lib/httpOnlyAuth";
import { getResolvedApiBaseUrl } from "@/lib/apiBaseUrl";

const IS_DEV = process.env.NODE_ENV === "development";

export function AppShell({
  title,
  headerContent,
  rawChildren,
  children,
}: {
  /** Page title shown in the default header. Ignored when `headerContent` is provided. */
  title: string;
  /** Replace the default page-title header with custom content. */
  headerContent?: React.ReactNode;
  /** When true, children are rendered without the default max-width / padding wrapper. */
  rawChildren?: boolean;
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth(true);
  const { data: apiHealthy, isLoading: healthLoading, isError: healthError } = useApiHealth();
  const router = useRouter();
  const [platformView, setPlatformView] = useState<PlatformViewPayload | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setPlatformView(getPlatformViewSession());
  }, []);

  async function exitToSuperAdmin() {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // Best-effort — still leave platform view locally.
    }
    if (isHttpOnlyAuthEnabled()) {
      clearTenantAuthCookie();
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
    }
    exitPlatformView();
    setPlatformView(null);
    router.push("/super-admin");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-background" role="status" aria-live="polite">
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
    <div className="flex h-screen overflow-hidden bg-surface-background">
      {/* L2 — mandatory Terms/Privacy re-acceptance overlay (renders only when required). */}
      <LegalConsentGate />
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {platformView ? (
          <div className="shrink-0 border-b border-pending-solid/30 bg-pending-bg/80 px-3 py-2 print:hidden sm:px-4 sm:py-3 md:px-8">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-2 sm:gap-3">
              <p className="text-xs sm:text-sm text-pending-fg line-clamp-2">
                <span className="font-semibold">Platform:</span> <span className="font-medium">{platformView.societyName}</span>
              </p>
              <button
                type="button"
                onClick={exitToSuperAdmin}
                className="shrink-0 rounded-lg sm:rounded-xl bg-pending-solid px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold text-fg-inverse transition-opacity hover:opacity-90 min-h-8 sm:min-h-auto"
              >
                Back
              </button>
            </div>
          </div>
        ) : null}
        {headerContent ? (
          <div className="shrink-0 border-b border-surface-border bg-surface/85 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-2 sm:gap-3 px-3 py-3 sm:py-3.5 md:px-8">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="shrink-0 rounded-lg sm:rounded-xl border border-surface-border bg-surface p-2 text-fg-secondary transition-colors hover:bg-brand-primary-light hover:text-brand-primary lg:hidden min-h-10 min-w-10"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  {headerContent}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <header className="z-20 shrink-0 border-b border-surface-border bg-surface/85 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-2 sm:gap-4 px-3 py-3 sm:px-4 sm:py-4 md:px-8">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="shrink-0 rounded-lg sm:rounded-xl border border-surface-border bg-surface p-2 text-fg-secondary transition-colors hover:bg-brand-primary-light hover:text-brand-primary lg:hidden min-h-10 min-w-10"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-tertiary">
                    Admin dashboard
                  </p>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-fg-primary truncate">{title}</h1>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="hidden items-center gap-2 rounded-full border border-surface-border bg-surface px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-fg-secondary md:flex">
                  <CalendarDays className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-brand-primary shrink-0" />
                  <span className="hidden sm:inline">
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div
                  className={`hidden items-center gap-2 rounded-full border px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium sm:flex shrink-0 ${
                    healthLoading
                      ? "border-surface-border bg-surface text-fg-secondary"
                      : apiHealthy && !healthError
                        ? "border-approved-solid/20 bg-approved-bg text-approved-fg"
                        : "border-denied-solid/20 bg-denied-bg text-denied-fg"
                  }`}
                  title={
                    healthLoading
                      ? "Checking API connectivity"
                      : apiHealthy && !healthError
                        ? "API health check passed"
                        : "Cannot reach API — check connection or deployment"
                  }
                >
                  <Activity className="h-3.5 sm:h-4 w-3.5 sm:w-4 shrink-0" />
                  <span className="hidden sm:inline">
                    {healthLoading
                      ? "…"
                      : apiHealthy && !healthError
                        ? "API online"
                        : "API offline"}
                  </span>
                </div>
                {IS_DEV ? (
                  <div
                    className="hidden max-w-[200px] sm:max-w-[280px] truncate rounded-full border border-info-solid/20 bg-info-bg px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium text-info-fg lg:block"
                    title={getResolvedApiBaseUrl()}
                  >
                    API: {getResolvedApiBaseUrl()}
                  </div>
                ) : null}
              </div>
            </div>
          </header>
        )}

        <main
          id="main-content"
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scrollbar-thin"
          style={{
            background:
              "radial-gradient(circle at top right, color-mix(in srgb, var(--gp-brand-primary) 6%, transparent), transparent 20%), radial-gradient(circle at bottom left, color-mix(in srgb, var(--gp-brand-accent) 5%, transparent), transparent 24%)",
          }}
        >
          {rawChildren ? children : (
            <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8 md:py-8 animate-fade-in">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
