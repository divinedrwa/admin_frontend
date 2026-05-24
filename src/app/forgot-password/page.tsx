"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { AuthShell } from "@/components/auth/AuthShell";

type SocietyRow = { id: string; name: string; address?: string | null };

function ForgotPasswordInner() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [societyId, setSocietyId] = useState("");
  const [societies, setSocieties] = useState<SocietyRow[]>([]);
  const [societiesLoading, setSocietiesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

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
        if (!cancelled) setSocieties([]);
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
      await api.post("/auth/request-password-reset", {
        email: email.trim(),
        societyId: societyId.trim(),
      });
      setSent(true);
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        panelEyebrow="Password Reset"
        panelTitle="Check your email"
        panelDescription="If an account with that email exists, we've sent a link to reset your password."
        panelIcon={<Mail className="h-7 w-7" />}
        heroEyebrow="Almost there"
        heroTitle="Reset link sent"
        heroDescription="Check your inbox and spam folder for the reset email. The link expires in 1 hour."
        heroFeatures={[]}
      >
        <div className="space-y-4">
          <div className="auth-alert auth-alert-info">
            Didn&apos;t receive the email? Check your spam folder or try again with a different email address.
          </div>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="btn btn-ghost w-full py-3 text-sm font-semibold"
          >
            Try again
          </button>
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

  return (
    <AuthShell
      panelEyebrow="Password Reset"
      panelTitle="Forgot your password?"
      panelDescription="Enter your email address and we'll send you a link to reset your password."
      panelIcon={<ShieldCheck className="h-7 w-7" />}
      heroEyebrow="Account recovery"
      heroTitle="Reset your password securely."
      heroDescription="We'll email you a one-time link that lets you set a new password."
      heroFeatures={[]}
    >
      <form onSubmit={onSubmit} className="auth-form">
        <div className="auth-form-section">
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="societyId">
              Society
            </label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">
                <Building2 className="h-5 w-5" />
              </div>
              <select
                id="societyId"
                className="auth-input auth-input-with-icon auth-select"
                value={societyId}
                onChange={(e) => setSocietyId(e.target.value)}
                disabled={societiesLoading || societies.length === 0}
                required
              >
                {societiesLoading ? (
                  <option value="">Loading societies...</option>
                ) : societies.length === 0 ? (
                  <option value="">No active societies available</option>
                ) : (
                  societies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="auth-select-icon h-5 w-5" />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-field-label" htmlFor="email">
              Email address
            </label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">
                <Mail className="h-5 w-5" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input auth-input-with-icon"
                placeholder="Enter your registered email"
                autoComplete="email"
                required
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
              Sending...
            </span>
          ) : (
            "Send Reset Link"
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

export default function ForgotPasswordPage() {
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
      <ForgotPasswordInner />
    </Suspense>
  );
}
