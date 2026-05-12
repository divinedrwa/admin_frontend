"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  ArrowRight,
  Building2,
  LockKeyhole,
  ShieldCheck,
  ShieldEllipsis,
  UserRound,
  Users,
} from "lucide-react";
import { SUPER_ADMIN_TOKEN_KEY } from "@/lib/apiSuper";
import { getResolvedApiBaseUrl } from "@/lib/apiBaseUrl";
import { showToast } from "@/components/Toast";
import { AuthShell } from "@/components/auth/AuthShell";

const API_BASE_URL = getResolvedApiBaseUrl();

/** When opened from society login with ?prefill=1 — override via NEXT_PUBLIC_* in .env.local. */
const DEFAULT_PREFILL_USERNAME =
  process.env.NEXT_PUBLIC_SUPER_ADMIN_PREFILL_USERNAME ?? "super_admin";
const DEFAULT_PREFILL_PASSWORD =
  process.env.NEXT_PUBLIC_SUPER_ADMIN_PREFILL_PASSWORD ?? "";

function getFriendlySuperAdminLoginError(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  const rawMessage = (
    error as { response?: { data?: { message?: string } }; message?: string }
  )?.response?.data?.message;
  const message = (rawMessage ?? "").trim().toLowerCase();

  if (status === 401) {
    if (message.includes("invalid credentials") || message.includes("invalid password")) {
      return "Invalid username or password. Please try again.";
    }
    return "Sign-in failed. Please verify your super admin credentials.";
  }
  if (status === 403) {
    return "You do not have platform admin access.";
  }
  if (status === 404) {
    return "API route not found. Set NEXT_PUBLIC_API_URL to your backend base including /api (e.g. https://your-api.com/api).";
  }
  if (status === 0 || status === undefined) {
    return "Could not reach the server. Check API URL and network, then try again.";
  }
  if (status >= 500) {
    return "Server error while signing in. Please try again in a moment.";
  }
  return rawMessage?.trim() || "Login failed. Please try again.";
}

function SuperAdminLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(SUPER_ADMIN_TOKEN_KEY)) {
      router.replace("/super-admin");
    }
  }, [router]);

  useEffect(() => {
    if (searchParams.get("prefill") !== "1") return;
    setUsername(DEFAULT_PREFILL_USERNAME);
    if (DEFAULT_PREFILL_PASSWORD) {
      setPassword(DEFAULT_PREFILL_PASSWORD);
    }
  }, [searchParams]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post<{ token: string }>(
        `${API_BASE_URL}/auth/super-admin/login`,
        { username: username.trim(), password },
      );
      if (!data?.token) {
        showToast("No token returned", "error");
        return;
      }
      localStorage.setItem(SUPER_ADMIN_TOKEN_KEY, data.token);
      localStorage.removeItem("token");
      showToast("Signed in as platform administrator", "success");
      router.push("/super-admin");
      router.refresh();
    } catch (error: unknown) {
      const message = getFriendlySuperAdminLoginError(error);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      variant="super"
      panelEyebrow="Platform Control"
      panelTitle="Platform super admin"
      panelDescription="Access society onboarding, platform administration, and cross-society oversight from one secure control panel."
      panelIcon={<ShieldEllipsis className="h-7 w-7" />}
      heroEyebrow="Centralized oversight"
      heroTitle="Manage societies, onboarding, and platform access with confidence."
      heroDescription="Use the platform console for super-admin workflows that sit above day-to-day society operations."
      heroFeatures={[
        {
          icon: <ShieldCheck className="h-5 w-5" />,
          title: "Privileged platform access",
          description: "Keep super-admin controls separate from society-specific sessions and credentials.",
        },
        {
          icon: <Building2 className="h-5 w-5" />,
          title: "Cross-society administration",
          description: "Review onboarding, society status, and platform-wide operations from a single entry point.",
        },
        {
          icon: <Users className="h-5 w-5" />,
          title: "Cleaner role separation",
          description: "Move between society admin and platform admin flows without weak contrast or cramped layouts.",
        },
      ]}
    >
      <form onSubmit={onSubmit} className="auth-form">
        <div className="auth-form-section">
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="superAdminUsername">
              Username or email
            </label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">
                <UserRound className="h-5 w-5" />
              </div>
              <input
                id="superAdminUsername"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="auth-input auth-input-with-icon"
                placeholder="Enter your platform username or email"
                required
                minLength={3}
                autoComplete="username"
              />
            </div>
            <p className="auth-field-hint">Use the platform-level account only. Society admin credentials will not work here.</p>
          </div>

          <div className="auth-field">
            <label className="auth-field-label" htmlFor="superAdminPassword">
              Password
            </label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <input
                id="superAdminPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input auth-input-with-icon"
                placeholder="Enter your password"
                required
                minLength={6}
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="auth-alert auth-alert-info">
            Platform access controls society activation, onboarding, and cross-tenant administration. Keep this account limited to authorized operators.
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 text-base font-semibold">
          {loading ? "Signing In..." : "Sign In"}
        </button>

        <div className="auth-link-stack">
          <Link href="/login" className="auth-link-card">
            <div>
              <p className="auth-link-card-title">Return to society admin sign-in</p>
              <p className="auth-link-card-copy">Use the tenant-scoped login for resident, guard, and operations workflows.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-brand-primary" />
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

export default function SuperAdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen flex items-center justify-center p-6 text-fg-tertiary"
          style={{
            background: `linear-gradient(to bottom right, var(--gp-super-login-from), var(--gp-super-login-via), var(--gp-super-login-to))`,
          }}
        >
          Loading…
        </main>
      }
    >
      <SuperAdminLoginInner />
    </Suspense>
  );
}
