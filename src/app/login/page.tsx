"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  LayoutDashboard,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { api, setTenantAuthCookie, setTenantSocietyIdFromLogin } from "@/lib/api";
import { SUPER_ADMIN_TOKEN_KEY } from "@/lib/apiSuper";
import { isTenantAdminToken } from "@/lib/jwt";
import { showToast } from "@/components/Toast";
import { AuthShell } from "@/components/auth/AuthShell";
import { LOGIN_SUCCESS_TOAST } from "@/lib/branding";
import { getResolvedApiBaseUrl } from "@/lib/apiBaseUrl";
import { SocietyCombobox } from "@/components/SocietyCombobox";
import { usePublicSocieties } from "@/hooks/usePublicSocieties";

const IS_DEV = process.env.NODE_ENV === "development";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ENABLE_DEMO_LOGIN =
  !IS_PRODUCTION && process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "1";
const DEMO_ADMIN_USERNAME = process.env.NEXT_PUBLIC_DEMO_ADMIN_USERNAME ?? "admin";
const DEMO_ADMIN_PASSWORD = process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD ?? "";

function getFriendlyLoginError(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  const rawMessage = (
    error as { response?: { data?: { message?: string } }; message?: string }
  )?.response?.data?.message;
  const message = (rawMessage ?? "").trim().toLowerCase();

  if (status === 401) {
    if (message.includes("invalid credentials") || message.includes("invalid password")) {
      return "Invalid username or password. Please try again.";
    }
    if (message.includes("inactive society") || message.includes("society is inactive")) {
      return "This society is inactive. Please contact your administrator.";
    }
    if (message.includes("society id") || message.includes("society required")) {
      return "Please select your society before signing in.";
    }
    if (message.includes("not found")) {
      return "Selected society was not found. Refresh and try again.";
    }
    return "Sign-in failed. Please check your credentials and try again.";
  }

  if (status === 403) {
    if (message.includes("disabled") || message.includes("blocked")) {
      return "Your account is disabled. Please contact your administrator.";
    }
    return "You do not have permission to access this panel.";
  }

  if (status === 0 || status === undefined) {
    return "Could not reach the server. Check API URL and network, then try again.";
  }

  if (status >= 500) {
    return "Server error while signing in. Please try again in a moment.";
  }

  return rawMessage?.trim() || "Login failed. Please try again.";
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [societyId, setSocietyId] = useState("");
  const { data: societiesData, isLoading: societiesLoading } = usePublicSocieties({ limit: 200 });
  const societies = societiesData?.societies ?? [];
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fromUrl = searchParams.get("society")?.trim();
    if (!societyId && fromUrl && societies.some((s) => s.id === fromUrl)) {
      setSocietyId(fromUrl);
    } else if (!societyId && societies.length === 1) {
      setSocietyId(societies[0].id);
    }
  }, [searchParams, societies, societyId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!societyId.trim()) {
      showToast("Select your society", "error");
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/auth/admin/login", {
        societyId: societyId.trim(),
        username: emailOrUsername,
        password,
      });
      const token = response.data.token as string | undefined;
      if (!token || !isTenantAdminToken(token)) {
        showToast("This account cannot access the admin dashboard.", "error");
        return;
      }
      localStorage.setItem("token", token);
      if (response.data.refreshToken) {
        localStorage.setItem("refresh_token", response.data.refreshToken);
      }
      // Tenant session must not coexist with a super-admin token on shared browsers.
      localStorage.removeItem(SUPER_ADMIN_TOKEN_KEY);
      localStorage.removeItem("super_admin_refresh_token");
      setTenantSocietyIdFromLogin(response.data?.user);
      setTenantAuthCookie();
      showToast(LOGIN_SUCCESS_TOAST, "success");
      router.push("/dashboard");
    } catch (error: unknown) {
      const message = getFriendlyLoginError(error);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  const quickLogin = (user: string, pass: string) => {
    setEmailOrUsername(user);
    setPassword(pass);
    if (societies.length >= 1) {
      setSocietyId(societies[0].id);
    }
  };

  const societyAlertClass =
    societies.length === 0 && !societiesLoading ? "auth-alert auth-alert-danger" : "auth-alert auth-alert-info";
  const societyAlertText = societiesLoading
    ? "Fetching active societies from the backend..."
    : societies.length === 0
      ? "No active societies were found. Check the API connection or seed data before signing in."
      : `${societiesData?.total ?? societies.length} active ${(societiesData?.total ?? societies.length) === 1 ? "society is" : "societies are"} ready for admin sign-in.`;

  return (
    <AuthShell
      panelEyebrow="Society Admin"
      panelTitle="Welcome back"
      panelDescription="Sign in to manage residents, approvals, notices, staff, and daily society operations."
      panelIcon={<Building2 className="h-7 w-7" />}
      heroEyebrow="Operations dashboard"
      heroTitle="Run your society from one secure control center."
      heroDescription="Keep admin access polished and dependable for teams handling entry approvals, resident support, billing, and day-to-day operations."
      heroFeatures={[
        {
          icon: <LayoutDashboard className="h-5 w-5" />,
          title: "Daily operations overview",
          description: "Review dashboards, notices, and staff activity from one consistent admin workspace.",
        },
        {
          icon: <ClipboardCheck className="h-5 w-5" />,
          title: "Faster approval flows",
          description: "Handle visitors, invites, parcels, and operational tasks with clearer sign-in entry points.",
        },
        {
          icon: <ShieldCheck className="h-5 w-5" />,
          title: "Secure tenant-aware access",
          description: "Every session stays scoped to the selected society for safer administration.",
        },
      ]}
    >
      <form onSubmit={onSubmit} className="auth-form">
        <div className="auth-form-section">
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="societyId">
              Society
            </label>
            <SocietyCombobox
              id="societyId"
              value={societyId}
              onChange={(id) => setSocietyId(id)}
              disabled={societiesLoading}
              required
            />
            <p className="auth-field-hint">Choose the society this admin session should manage.</p>
          </div>

          <div className={societyAlertClass}>{societyAlertText}</div>
          {IS_DEV ? (
            <p className="text-xs text-fg-tertiary">
              Dev API: <span className="font-mono">{getResolvedApiBaseUrl()}</span>
            </p>
          ) : null}

          <div className="auth-field">
            <label className="auth-field-label" htmlFor="emailOrUsername">
              Username or email
            </label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">
                <UserRound className="h-5 w-5" />
              </div>
              <input
                id="emailOrUsername"
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className="auth-input auth-input-with-icon"
                placeholder="Enter your username or email"
                autoComplete="username"
                required
                minLength={3}
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-field-label" htmlFor="password">
              Password
            </label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input auth-input-with-icon"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                minLength={6}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !societyId || societiesLoading}
          className="btn btn-primary w-full py-3 text-base font-semibold"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <span className="loading-spinner mr-2 h-5 w-5" />
              Signing In...
            </span>
          ) : (
            "Sign In"
          )}
        </button>

        {ENABLE_DEMO_LOGIN && DEMO_ADMIN_PASSWORD ? (
          <>
            <div className="auth-divider">
              <span>Quick Fill</span>
            </div>

            <div className="auth-alert auth-alert-warning">
              Demo mode is enabled for local testing. Fill the form with the configured admin credentials in one tap.
            </div>

            <button
              type="button"
              onClick={() => quickLogin(DEMO_ADMIN_USERNAME, DEMO_ADMIN_PASSWORD)}
              className="btn btn-ghost w-full py-3 text-sm font-semibold"
            >
              Use Demo Admin Credentials
            </button>
          </>
        ) : null}

        <div className="text-center">
          <Link
            href={`/forgot-password${societyId ? `?society=${societyId}` : ""}`}
            className="text-sm text-brand-primary hover:underline"
          >
            Forgot your password?
          </Link>
        </div>

        <div className="auth-link-stack">
          <Link href="/invite/accept" className="auth-link-card">
            <div>
              <p className="auth-link-card-title">Complete resident onboarding</p>
              <p className="auth-link-card-copy">Open the invite acceptance flow on the web.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-brand-primary" />
          </Link>

          <Link href="/super-admin/login?prefill=1" className="auth-link-card">
            <div>
              <p className="auth-link-card-title">Switch to platform super admin</p>
              <p className="auth-link-card-copy">Manage onboarding, societies, and platform-wide configuration.</p>
            </div>
            <ShieldCheck className="h-4 w-4 text-brand-primary" />
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen flex items-center justify-center text-fg-inverse"
          style={{
            background: `linear-gradient(to bottom right, var(--gp-login-from), var(--gp-login-to))`,
          }}
        >
          Loading…
        </main>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
