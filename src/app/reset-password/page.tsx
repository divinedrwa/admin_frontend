"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { AuthShell } from "@/components/auth/AuthShell";
import { parseApiError } from "@/utils/errorHandler";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <AuthShell
        panelEyebrow="Password Reset"
        panelTitle="Invalid link"
        panelDescription="This password reset link is missing or malformed."
        panelIcon={<ShieldCheck className="h-7 w-7" />}
        heroEyebrow="Password Reset"
        heroTitle="Invalid reset link"
        heroDescription="Please request a new password reset link."
        heroFeatures={[]}
      >
        <div className="space-y-4">
          <div className="auth-alert auth-alert-danger">
            No reset token found. The link may have been truncated or expired.
          </div>
          <Link
            href="/forgot-password"
            className="btn btn-primary w-full py-3 text-base font-semibold text-center block"
          >
            Request New Reset Link
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-brand-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (success) {
    return (
      <AuthShell
        panelEyebrow="Password Reset"
        panelTitle="Password updated"
        panelDescription="Your password has been reset successfully."
        panelIcon={<CheckCircle2 className="h-7 w-7" />}
        heroEyebrow="All done"
        heroTitle="Password reset complete"
        heroDescription="You can now sign in with your new password."
        heroFeatures={[]}
      >
        <div className="space-y-4">
          <div className="auth-alert auth-alert-info">
            All active sessions have been signed out. Please sign in with your new password.
          </div>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="btn btn-primary w-full py-3 text-base font-semibold"
          >
            Go to Sign In
          </button>
        </div>
      </AuthShell>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    if (password.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccess(true);
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to reset password. The link may have expired.").message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      panelEyebrow="Password Reset"
      panelTitle="Set new password"
      panelDescription="Choose a strong password for your account."
      panelIcon={<LockKeyhole className="h-7 w-7" />}
      heroEyebrow="Almost there"
      heroTitle="Choose a new password"
      heroDescription="Your new password must be at least 8 characters with uppercase, lowercase, and a number."
      heroFeatures={[]}
    >
      <form onSubmit={onSubmit} className="auth-form">
        <div className="auth-form-section">
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="password">
              New password
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
                placeholder="Enter new password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <p className="auth-field-hint">
              At least 8 characters, with uppercase, lowercase, and a number.
            </p>
          </div>

          <div className="auth-field">
            <label className="auth-field-label" htmlFor="confirmPassword">
              Confirm password
            </label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input auth-input-with-icon"
                placeholder="Confirm new password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full py-3 text-base font-semibold"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <span className="loading-spinner mr-2 h-5 w-5" />
              Resetting...
            </span>
          ) : (
            "Reset Password"
          )}
        </button>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-brand-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordInner />
    </Suspense>
  );
}
