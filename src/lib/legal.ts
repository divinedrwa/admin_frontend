import { api } from "./api";

/**
 * L2 — consent & terms versioning (admin web).
 * Mirrors the backend `GET /api/legal/status` / `POST /api/legal/accept` shapes.
 */
export interface LegalStatus {
  currentTermsVersion: string;
  currentPrivacyVersion: string;
  acceptedTermsVersion: string | null;
  acceptedPrivacyVersion: string | null;
  requiresAcceptance: boolean;
  termsUrl: string | null;
  privacyUrl: string | null;
}

function normalize(data: Record<string, unknown>): LegalStatus {
  return {
    currentTermsVersion: String(data.currentTermsVersion ?? ""),
    currentPrivacyVersion: String(data.currentPrivacyVersion ?? ""),
    acceptedTermsVersion: (data.acceptedTermsVersion as string | null) ?? null,
    acceptedPrivacyVersion: (data.acceptedPrivacyVersion as string | null) ?? null,
    requiresAcceptance: data.requiresAcceptance === true,
    termsUrl: (data.termsUrl as string | null) ?? null,
    privacyUrl: (data.privacyUrl as string | null) ?? null,
  };
}

export async function fetchLegalStatus(): Promise<LegalStatus> {
  const { data } = await api.get("/legal/status");
  return normalize(data as Record<string, unknown>);
}

/**
 * Record acceptance of the current versions. The server rejects (409) stale versions,
 * so callers always echo the versions from {@link fetchLegalStatus}.
 */
export async function acceptLegal(
  termsVersion: string,
  privacyVersion: string,
): Promise<LegalStatus> {
  const { data } = await api.post("/legal/accept", {
    termsVersion,
    privacyVersion,
    appVersion: "admin-web",
  });
  return normalize(data as Record<string, unknown>);
}
