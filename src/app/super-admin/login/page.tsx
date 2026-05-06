"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { SUPER_ADMIN_TOKEN_KEY } from "@/lib/apiSuper";
import { showToast } from "@/components/Toast";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

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
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl border border-white/20 mb-4">
            <span className="text-3xl">⚙️</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Platform Admin</h1>
          <p className="text-slate-300 mt-2 text-sm">Super admin · societies & onboarding</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 space-y-5 border border-white/20"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Username or email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input w-full"
              required
              minLength={3}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full"
              required
              minLength={6}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-center text-sm text-gray-600">
            <Link href="/login" className="text-indigo-700 font-semibold underline">
              Society admin login
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

export default function SuperAdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-slate-300">
          Loading…
        </main>
      }
    >
      <SuperAdminLoginInner />
    </Suspense>
  );
}
