"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { publicApi } from "@/lib/publicApi";
import { showToast } from "@/components/Toast";

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
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-800 to-slate-900">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <div className="text-3xl mb-2">✉️</div>
          <h1 className="text-2xl font-bold text-gray-900">Accept invitation</h1>
          <p className="text-sm text-gray-600 mt-1">Create your account for the society linked to this invite.</p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Invite token</label>
          <div className="flex gap-2">
            <input
              className="input flex-1 text-sm"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste token from your admin"
            />
            <button
              type="button"
              onClick={() => void checkToken(token)}
              disabled={checking}
              className="px-3 py-2 bg-slate-700 text-white rounded-lg text-sm shrink-0"
            >
              {checking ? "…" : "Verify"}
            </button>
          </div>
        </div>

        {verified && (
          <div
            className={`rounded-lg p-3 text-sm ${
              verified.valid ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"
            }`}
          >
            <p className="font-semibold">{verified.invitation.society.name}</p>
            <p>Role: {verified.invitation.role}</p>
            {verified.invitation.role === "RESIDENT" &&
              (verified.invitation.villa ?? verified.invitation.villaId) && (
              <p className="mt-1">
                Assigned villa:{" "}
                <span className="font-medium">
                  {verified.invitation.villa
                    ? `${verified.invitation.villa.villaNumber}${verified.invitation.villa.block ? ` (${verified.invitation.villa.block})` : ""}`
                    : "Linked on this invite"}
                </span>
              </p>
            )}
            {!verified.valid && <p className="mt-1">This invitation cannot be used right now.</p>}
          </div>
        )}

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Full name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {verified?.invitation.email && (
              <p className="text-xs text-gray-500 mt-1">Must match the invited email.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone (optional)</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            {verified?.invitation.phone && (
              <p className="text-xs text-gray-500 mt-1">Required and must match the invited phone.</p>
            )}
          </div>
          {verified?.invitation.role === "RESIDENT" &&
            !verified.invitation.villaId &&
            !verified.invitation.villa?.id && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Villa ID (optional)</label>
              <input
                className="input font-mono text-sm"
                value={villaId}
                onChange={(e) => setVillaId(e.target.value)}
                placeholder="Only if your admin did not attach a villa to this invite"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !verified?.valid}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50"
          >
            {submitting ? "Creating account…" : "Create account & sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Loading…</main>
      }
    >
      <InviteAcceptContent />
    </Suspense>
  );
}
