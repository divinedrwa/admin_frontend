"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ShieldCheck } from "lucide-react";
import { fetchLegalStatus, acceptLegal, type LegalStatus } from "@/lib/legal";
import { captureError } from "@/lib/captureError";

/**
 * L2 — mandatory Terms/Privacy re-acceptance gate for the admin web.
 *
 * Rendered inside {@link AppShell} for authenticated users. On mount it fetches the
 * authoritative consent status; if the user must (re-)accept, it overlays a blocking,
 * non-dismissable modal until they accept or log out.
 *
 * Fails OPEN: if the status check errors (transient/offline), the gate stays hidden so
 * admins are never locked out of the dashboard by a blip.
 */
export function LegalConsentGate() {
  const router = useRouter();
  const [status, setStatus] = useState<LegalStatus | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLegalStatus()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch((e) => {
        // Fail open — do not block the dashboard on a transient error.
        captureError(e, { context: "LegalConsentGate.fetchStatus" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status || !status.requiresAcceptance) return null;

  async function onAccept() {
    if (!status) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await acceptLegal(
        status.currentTermsVersion,
        status.currentPrivacyVersion,
      );
      setStatus(updated); // requiresAcceptance now false → overlay unmounts
    } catch (e) {
      captureError(e, { context: "LegalConsentGate.accept" });
      setError("Could not record your acceptance. Please try again.");
      setSubmitting(false);
    }
  }

  function onLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    router.replace("/login");
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Updated Terms and Privacy Policy"
    >
      <div className="w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-surface-border bg-surface p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary-light text-brand-primary">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h2 className="text-xl font-bold text-fg-primary">We&apos;ve updated our terms</h2>
        </div>

        <p className="mt-4 text-sm text-fg-secondary">
          Our Terms &amp; Conditions and Privacy Policy have changed — including how online
          maintenance payments are handled. Please review and accept to continue using the
          admin dashboard.
        </p>

        <div className="mt-5 space-y-2">
          <LegalDocRow
            icon={<FileText className="h-4 w-4" />}
            label="Terms & Conditions"
            version={status.currentTermsVersion}
            url={status.termsUrl}
          />
          <LegalDocRow
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Privacy Policy"
            version={status.currentPrivacyVersion}
            url={status.privacyUrl}
          />
        </div>

        {error ? <p className="mt-4 text-sm text-danger-fg">{error}</p> : null}

        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-fg-primary">
          <input
            type="checkbox"
            checked={agreed}
            disabled={submitting}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand-primary"
          />
          <span>
            I have read and agree to the Terms &amp; Conditions and Privacy Policy.
          </span>
        </label>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            disabled={!agreed || submitting}
            onClick={onAccept}
            className="inline-flex items-center justify-center rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-fg-inverse transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Accept & Continue"}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onLogout}
            className="inline-flex items-center justify-center rounded-xl border border-surface-border px-4 py-2.5 text-sm font-medium text-fg-secondary transition-colors hover:bg-surface-muted disabled:opacity-50"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

function LegalDocRow({
  icon,
  label,
  version,
  url,
}: {
  icon: React.ReactNode;
  label: string;
  version: string;
  url: string | null;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-surface-border px-3.5 py-3">
      <span className="flex items-center gap-2.5 text-sm font-medium text-fg-primary">
        <span className="text-brand-primary">{icon}</span>
        {label}
        <span className="text-xs font-normal text-fg-secondary">v{version}</span>
      </span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-brand-primary hover:underline"
        >
          View
        </a>
      ) : null}
    </div>
  );
}
