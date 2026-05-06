"use client";

import { Sidebar } from "./Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearPlatformViewSession,
  getPlatformViewSession,
  type PlatformViewPayload,
} from "@/lib/platformViewSession";

export function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth(true);
  const router = useRouter();
  const [platformView, setPlatformView] = useState<PlatformViewPayload | null>(null);

  useEffect(() => {
    setPlatformView(getPlatformViewSession());
  }, []);

  function exitToSuperAdmin() {
    localStorage.removeItem("token");
    clearPlatformViewSession();
    setPlatformView(null);
    router.push("/super-admin");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />
      <section className="flex-1 flex flex-col">
        {platformView ? (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <p className="text-sm text-amber-950">
              <span className="font-semibold">Platform view:</span> you are signed in as the society
              admin for <span className="font-medium">{platformView.societyName}</span> (full tenant
              access).
            </p>
            <button
              type="button"
              onClick={exitToSuperAdmin}
              className="shrink-0 text-sm font-semibold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
            >
              Back to platform console
            </button>
          </div>
        ) : null}
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium">System Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </section>
    </div>
  );
}
