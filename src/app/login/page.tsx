"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, setTenantSocietyIdFromLogin } from "@/lib/api";
import { showToast } from "@/components/Toast";

type SocietyRow = { id: string; name: string; address?: string | null };
const ENABLE_DEMO_LOGIN = process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "1";
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
  const [societies, setSocieties] = useState<SocietyRow[]>([]);
  const [societiesLoading, setSocietiesLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get<{ societies: SocietyRow[] }>("/public/societies");
        const list = r.data?.societies;
        if (!cancelled && Array.isArray(list)) {
          setSocieties(list);
          const fromUrl = searchParams.get("society")?.trim();
          setSocietyId((prev) => {
            if (prev) return prev;
            if (fromUrl && list.some((s) => s.id === fromUrl)) return fromUrl;
            return list[0]?.id || "";
          });
        }
      } catch {
        if (!cancelled) {
          setSocieties([]);
          showToast("Could not load societies. Check API URL and server.", "error");
        }
      } finally {
        if (!cancelled) setSocietiesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

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
      localStorage.setItem("token", response.data.token);
      setTenantSocietyIdFromLogin(response.data?.user);
      showToast("Login successful! Welcome to GatePass+", "success");
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

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-4 p-2">
            <Image
              src="/favicon-192.png"
              alt="GatePass+"
              width={64}
              height={64}
              priority
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">GatePass+</h1>
          <p className="text-blue-100 text-lg">Reside. Approve. Manage.</p>
        </div>

        {/* Login Form Card */}
        <form onSubmit={onSubmit} className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 space-y-6 border border-white/20">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Society
              </label>
              <select
                className="input w-full"
                value={societyId}
                onChange={(e) => setSocietyId(e.target.value)}
                disabled={societiesLoading || societies.length === 0}
                required
              >
                {societiesLoading ? (
                  <option value="">Loading societies…</option>
                ) : societies.length === 0 ? (
                  <option value="">No active societies — check API</option>
                ) : (
                  societies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Username or Email Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-lg">👤</span>
                </div>
                <input
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  className="input pl-10"
                  placeholder="Enter username or email"
                  required
                  minLength={3}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-lg">🔒</span>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
              </div>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading || !societyId || societiesLoading}
            className="btn btn-primary w-full text-lg py-3 relative overflow-hidden group"
          >
            <span className="relative z-10">
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="loading-spinner w-5 h-5 mr-2"></span>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </button>

          {ENABLE_DEMO_LOGIN && DEMO_ADMIN_PASSWORD ? (
            <>
              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">Quick Login</span>
                </div>
              </div>

              {/* Quick Login */}
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => quickLogin(DEMO_ADMIN_USERNAME, DEMO_ADMIN_PASSWORD)}
                  className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  👨‍💼 Demo admin
                </button>
              </div>

              {/* Test Credentials Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                  <span className="text-base mr-2">ℹ️</span>
                  Demo credentials
                </p>
                <p className="text-xs text-gray-600 mb-2">
                  Demo login is enabled via environment variables.
                </p>
                <div className="text-xs text-gray-600 space-y-1.5">
                  <div className="flex justify-between items-center bg-white/50 px-2 py-1 rounded">
                    <span className="font-medium">Admin (web):</span>
                    <code className="font-mono text-blue-600">{DEMO_ADMIN_USERNAME} / ********</code>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <p className="text-center text-sm">
            Have an invite?{" "}
            <Link href="/invite/accept" className="text-blue-700 font-semibold underline">
              Complete registration on web
            </Link>
          </p>

          <p className="text-center text-sm">
            <Link
              href="/super-admin/login?prefill=1"
              className="text-slate-700 font-semibold underline"
            >
              Platform super admin
            </Link>
          </p>
        </form>

        {/* Footer */}
        <p className="text-center text-blue-100 text-sm mt-6">
          © 2026 GatePass+. All rights reserved.
        </p>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800 text-white">
          Loading…
        </main>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
