"use client";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Copy,
  DoorOpen,
  Home,
  LoaderCircle,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import { getResolvedApiBaseUrl } from "@/lib/apiBaseUrl";

type PassStatus =
  | "ACTIVE"
  | "NOT_YET_VALID"
  | "EXPIRED"
  | "USED"
  | "CANCELLED";

type PublicPass = {
  societyName: string;
  visitorName: string;
  visitorType: string;
  purpose: string | null;
  flatLabel: string;
  validFrom: string;
  validUntil: string | null;
  status: PassStatus;
  otp: string | null;
};

const STATUS_UI: Record<
  PassStatus,
  { label: string; message: string; className: string }
> = {
  ACTIVE: {
    label: "Active pass",
    message: "Show this QR code or OTP to security at the gate.",
    className: "bg-approved-bg text-approved-fg border-approved-solid/30",
  },
  NOT_YET_VALID: {
    label: "Not active yet",
    message: "This pass will become active at the scheduled start time.",
    className: "bg-pending-bg text-pending-fg border-pending-solid/30",
  },
  EXPIRED: {
    label: "Pass expired",
    message: "Ask the resident to create a new visitor pass.",
    className: "bg-denied-bg text-denied-fg border-denied-solid/30",
  },
  USED: {
    label: "Already used",
    message: "This single-use visitor pass has already been admitted.",
    className: "bg-info-bg text-info-fg border-info-solid/30",
  },
  CANCELLED: {
    label: "Pass cancelled",
    message: "The resident or society has cancelled this visitor pass.",
    className: "bg-denied-bg text-denied-fg border-denied-solid/30",
  },
};

function formatDate(value: string | null): string {
  if (!value) return "No expiry";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function visitorTypeLabel(value: string): string {
  if (value === "CAB") return "Cab";
  if (value === "DELIVERY") return "Delivery";
  if (value === "GUEST") return "Guest";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function VisitorPassPage() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const [pass, setPass] = useState<PublicPass | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  const passUrl = useMemo(() => {
    if (typeof window === "undefined" || !token) return "";
    return `${window.location.origin}/visit/${encodeURIComponent(token)}`;
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(
      `${getResolvedApiBaseUrl()}/public/visitor-pass/${encodeURIComponent(token)}`,
      {
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 404) setNotFound(true);
          throw new Error("Visitor pass unavailable");
        }
        const body = (await response.json()) as { pass?: PublicPass };
        if (!body.pass) throw new Error("Visitor pass unavailable");
        setPass(body.pass);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setNotFound(true);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [token]);

  if (loading) {
    return (
      <main id="main-content" className="min-h-screen bg-surface-background px-4 py-10">
        <div className="mx-auto flex max-w-md flex-col items-center justify-center py-24 text-center">
          <LoaderCircle className="h-10 w-10 animate-spin text-brand-primary" />
          <p className="mt-4 font-medium text-fg-secondary">Loading secure visitor pass…</p>
        </div>
      </main>
    );
  }

  if (notFound || !pass) {
    return (
      <main id="main-content" className="min-h-screen bg-surface-background px-4 py-10">
        <section className="card mx-auto max-w-md p-8 text-center">
          <XCircle className="mx-auto h-14 w-14 text-brand-danger" />
          <h1 className="mt-4 text-2xl font-bold text-fg-primary">Pass unavailable</h1>
          <p className="mt-2 text-fg-secondary">
            This link is invalid or no longer available. Ask the resident to share a new pass.
          </p>
        </section>
      </main>
    );
  }

  const statusUi = STATUS_UI[pass.status];
  const canShowCredential =
    (pass.status === "ACTIVE" || pass.status === "NOT_YET_VALID") &&
    pass.otp &&
    passUrl;

  const copyOtp = async () => {
    if (!pass.otp) return;
    await navigator.clipboard.writeText(pass.otp);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main id="main-content" className="min-h-screen bg-surface-background px-4 py-6 sm:py-10">
      <article className="card mx-auto max-w-md overflow-hidden">
        <header className="border-b border-surface-border bg-brand-primary-light px-6 py-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary text-fg-inverse shadow-sm">
            <DoorOpen className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-brand-primary">
            Secure visitor pass
          </p>
          <h1 className="mt-1 text-2xl font-bold text-fg-primary">{pass.societyName}</h1>
        </header>

        <div className="space-y-5 p-5 sm:p-6">
          <div className={`rounded-xl border px-4 py-3 ${statusUi.className}`}>
            <div className="flex items-center gap-2 font-bold">
              {pass.status === "ACTIVE" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : pass.status === "USED" ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
              {statusUi.label}
            </div>
            <p className="mt-1 text-sm">{statusUi.message}</p>
          </div>

          <section className="rounded-2xl border border-surface-border bg-surface-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary-light text-brand-primary">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">
                  {visitorTypeLabel(pass.visitorType)}
                </p>
                <h2 className="text-lg font-bold text-fg-primary">{pass.visitorName}</h2>
              </div>
            </div>
            <div className="mt-4 grid gap-3 border-t border-surface-border pt-4 text-sm">
              <div className="flex items-start gap-3">
                <Home className="mt-0.5 h-4 w-4 shrink-0 text-fg-tertiary" />
                <div>
                  <p className="text-fg-tertiary">Visiting</p>
                  <p className="font-semibold text-fg-primary">{pass.flatLabel}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-fg-tertiary" />
                <div>
                  <p className="text-fg-tertiary">Valid until</p>
                  <p className="font-semibold text-fg-primary">{formatDate(pass.validUntil)}</p>
                </div>
              </div>
              {pass.purpose && (
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-fg-tertiary" />
                  <div>
                    <p className="text-fg-tertiary">Purpose</p>
                    <p className="font-semibold text-fg-primary">{pass.purpose}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {canShowCredential ? (
            <section className="text-center" aria-label="Gate credentials">
              <div className="mx-auto inline-flex rounded-2xl border-8 border-white bg-white p-2 shadow-sm">
                <QRCodeSVG
                  value={passUrl}
                  size={220}
                  level="M"
                  marginSize={1}
                  title="Visitor pass QR code"
                />
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-fg-tertiary">
                6-digit OTP
              </p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <p className="font-mono text-3xl font-black tracking-[0.28em] text-brand-primary">
                  {pass.otp}
                </p>
                <button
                  type="button"
                  onClick={copyOtp}
                  className="rounded-lg p-2 text-fg-secondary transition hover:bg-surface-elevated"
                  aria-label="Copy OTP"
                >
                  {copied ? <CheckCircle2 className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
              {copied && <p className="mt-1 text-xs text-approved-fg">OTP copied</p>}
            </section>
          ) : (
            <section className="rounded-xl bg-surface-elevated p-4 text-center text-sm text-fg-secondary">
              Gate credentials are hidden because this pass is no longer active.
            </section>
          )}

          <footer className="flex items-center justify-center gap-2 border-t border-surface-border pt-4 text-xs text-fg-tertiary">
            <ShieldCheck className="h-4 w-4" />
            No visitor app or login required
          </footer>
        </div>
      </article>
    </main>
  );
}
