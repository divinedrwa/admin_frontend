"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Home,
  KeyRound,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { publicApi } from "@/lib/publicApi";
import { showToast } from "@/components/Toast";
import { AuthShell } from "@/components/auth/AuthShell";

type VerifyResponse = {
  valid: boolean;
  invitation: {
    status: string;
    role: string;
    phone: string | null;
    email: string | null;
    villaId?: string | null;
    villa?: { id: string; villaNumber: string; block: string | null } | null;
    society: { id: string; name: string; status: string };
    expiresAt: string;
  };
};

function InviteAcceptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";

  const [token, setToken] = useState(tokenFromUrl);
  const [verified, setVerified] = useState<VerifyResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [villaId, setVillaId] = useState("");
  const [urlChecked, setUrlChecked] = useState(false);

  const checkToken = async (raw: string) => {
    const t = raw.trim();
    if (t.length < 16) {
      showToast("Paste a valid invite token", "error");
      return;
    }
    setChecking(true);
    try {
      const { data } = await publicApi.get<VerifyResponse>(
        `/invitations/verify/${encodeURIComponent(t)}`,
      );
      setVerified(data);
      if (data.invitation.email) setEmail(data.invitation.email);
      if (data.invitation.phone) setPhone(data.invitation.phone);
      if (!data.valid) {
        showToast("This invite is not active or the society is unavailable", "error");
      }
    } catch {
      showToast("Could not verify invitation", "error");
      setVerified(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (urlChecked) return;
    const t = tokenFromUrl.trim();
    if (t.length >= 16) {
      setToken(t);
      setUrlChecked(true);
      void checkToken(t);
    }
  }, [tokenFromUrl, urlChecked]);

  const verificationTone = !verified
    ? "auth-alert auth-alert-info"
    : verified.valid
      ? "auth-alert auth-alert-info"
      : "auth-alert auth-alert-danger";

  const verificationCopy = !verified
    ? "Paste your invitation token and verify it before creating the account."
    : verified.valid
      ? `Invitation verified for ${verified.invitation.society.name}.`
      : "This invitation is no longer active or the linked society cannot accept onboarding right now.";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const t = token.trim();
    if (!verified?.valid) {
      showToast("Verify the invitation first", "error");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        token: t,
        username: username.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
      };
      if (phone.trim()) payload.phone = phone.trim();
      if (
        verified.invitation.role === "RESIDENT" &&
        !verified.invitation.villaId &&
        !verified.invitation.villa?.id &&
        villaId.trim()
      ) {
        payload.villaId = villaId.trim();
      }

      const { data } = await publicApi.post("/auth/register-with-invitation", payload);
      if (data?.token) {
        localStorage.setItem("token", data.token);
        showToast("Account created — you are signed in", "success");
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Registration failed";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      panelEyebrow="Resident Onboarding"
      panelTitle="Accept your invitation"
      panelDescription="Create your account for the society linked to this invite and continue directly into the admin web experience."
      panelIcon={<Mail className="h-7 w-7" />}
      heroEyebrow="Guided onboarding"
      heroTitle="Finish your invite-based registration in one clean flow."
      heroDescription="Verify the token, confirm the invited details, and create a secure account without guessing which society or role the invite belongs to."
      heroFeatures={[
        {
          icon: <ShieldCheck className="h-5 w-5" />,
          title: "Verified invite flow",
          description: "The token confirms the target society, role, and any linked resident context before account creation.",
        },
        {
          icon: <Building2 className="h-5 w-5" />,
          title: "Clear society context",
          description: "New users see exactly which society and villa details the invitation is tied to before proceeding.",
        },
        {
          icon: <BadgeCheck className="h-5 w-5" />,
          title: "Less onboarding friction",
          description: "The form keeps invited email and phone context close at hand so users can finish registration with confidence.",
        },
      ]}
    >
      <div className="auth-form">
        <div className="auth-form-section">
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="inviteToken">
              Invite token
            </label>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="auth-input-wrap">
                <div className="auth-input-icon">
                  <KeyRound className="h-5 w-5" />
                </div>
                <input
                  id="inviteToken"
                  className="auth-input auth-input-with-icon text-sm"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste the token shared by your admin"
                  autoComplete="off"
                />
              </div>
              <button
                type="button"
                onClick={() => void checkToken(token)}
                disabled={checking}
                className="btn btn-primary px-5 py-3 text-sm font-semibold sm:min-w-[120px]"
              >
                {checking ? "Verifying..." : "Verify Token"}
              </button>
            </div>
            <p className="auth-field-hint">Ask your society admin for a fresh invite if this token has expired.</p>
          </div>

          <div className={verificationTone}>{verificationCopy}</div>

          {verified && (
            <div className="rounded-2xl border border-surface-border bg-surface px-4 py-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-2xl bg-brand-primary-light p-2 text-brand-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="space-y-2 text-sm text-fg-secondary">
                  <div>
                    <p className="text-base font-semibold text-fg-primary">{verified.invitation.society.name}</p>
                    <p>Role: {verified.invitation.role}</p>
                  </div>

                  {verified.invitation.role === "RESIDENT" &&
                    (verified.invitation.villa ?? verified.invitation.villaId) && (
                      <div className="flex items-start gap-2">
                        <Home className="mt-0.5 h-4 w-4 text-fg-tertiary" />
                        <p>
                          Assigned villa:{" "}
                          <span className="font-medium text-fg-primary">
                            {verified.invitation.villa
                              ? `${verified.invitation.villa.villaNumber}${verified.invitation.villa.block ? ` (${verified.invitation.villa.block})` : ""}`
                              : "Linked on this invite"}
                          </span>
                        </p>
                      </div>
                    )}

                  <p>Invite expires: {new Date(verified.invitation.expiresAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="auth-form-section">
          <div className="auth-field">
            <label className="auth-field-label" htmlFor="inviteUsername">
              Username
            </label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">
                <UserRound className="h-5 w-5" />
              </div>
              <input
                id="inviteUsername"
                className="auth-input auth-input-with-icon"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose your username"
                required
                minLength={3}
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-field-label" htmlFor="inviteFullName">
              Full name
            </label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <input
                id="inviteFullName"
                className="auth-input auth-input-with-icon"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
                minLength={2}
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-field-label" htmlFor="inviteEmail">
              Email
            </label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">
                <Mail className="h-5 w-5" />
              </div>
              <input
                id="inviteEmail"
                type="email"
                className="auth-input auth-input-with-icon"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            {verified?.invitation.email && (
              <p className="auth-field-hint">This should match the email address that was invited.</p>
            )}
          </div>

          <div className="auth-field">
            <label className="auth-field-label" htmlFor="invitePhone">
              Phone
            </label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">
                <Phone className="h-5 w-5" />
              </div>
              <input
                id="invitePhone"
                className="auth-input auth-input-with-icon"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>
            {verified?.invitation.phone && (
              <p className="auth-field-hint">If your invite includes a phone number, use the same one here.</p>
            )}
          </div>

          {verified?.invitation.role === "RESIDENT" &&
            !verified.invitation.villaId &&
            !verified.invitation.villa?.id && (
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="inviteVillaId">
                  Villa ID
                </label>
                <div className="auth-input-wrap">
                  <div className="auth-input-icon">
                    <Home className="h-5 w-5" />
                  </div>
                  <input
                    id="inviteVillaId"
                    className="auth-input auth-input-with-icon font-mono text-sm"
                    value={villaId}
                    onChange={(e) => setVillaId(e.target.value)}
                    placeholder="Only needed if the admin did not attach a villa"
                  />
                </div>
              </div>
            )}

          <div className="auth-field">
            <label className="auth-field-label" htmlFor="invitePassword">
              Password
            </label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <input
                id="invitePassword"
                type="password"
                className="auth-input auth-input-with-icon"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !verified?.valid}
            className="btn btn-primary w-full py-3 text-base font-semibold"
          >
            {submitting ? "Creating Account..." : "Create Account & Sign In"}
          </button>

          <div className="auth-link-stack">
            <Link href="/login" className="auth-link-card">
              <div>
                <p className="auth-link-card-title">Already have an account?</p>
                <p className="auth-link-card-copy">Return to the sign-in screen instead of creating a new profile.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-brand-primary" />
            </Link>
          </div>
        </form>
      </div>
    </AuthShell>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center text-fg-inverse" style={{ background: `linear-gradient(to bottom right, var(--gp-login-from), var(--gp-login-to))` }}>Loading…</main>
      }
    >
      <InviteAcceptContent />
    </Suspense>
  );
}
