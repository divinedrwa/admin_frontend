import { describe, it, expect, vi, beforeEach } from "vitest";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}));

import { fetchLegalStatus, acceptLegal } from "@/lib/legal";

describe("legal consent lib", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it("normalizes a 'must re-accept' status", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        currentTermsVersion: "2026-07-07",
        currentPrivacyVersion: "2026-07-07",
        acceptedTermsVersion: null,
        acceptedPrivacyVersion: null,
        requiresAcceptance: true,
        termsUrl: null,
        privacyUrl: null,
      },
    });

    const status = await fetchLegalStatus();
    expect(getMock).toHaveBeenCalledWith("/legal/status");
    expect(status.requiresAcceptance).toBe(true);
    expect(status.acceptedTermsVersion).toBeNull();
  });

  it("coerces a missing requiresAcceptance to false", async () => {
    getMock.mockResolvedValueOnce({
      data: { currentTermsVersion: "2026-07-07", currentPrivacyVersion: "2026-07-07" },
    });

    const status = await fetchLegalStatus();
    expect(status.requiresAcceptance).toBe(false);
    expect(status.termsUrl).toBeNull();
  });

  it("posts the current versions with the admin-web channel marker", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        currentTermsVersion: "2026-07-07",
        currentPrivacyVersion: "2026-07-07",
        acceptedTermsVersion: "2026-07-07",
        acceptedPrivacyVersion: "2026-07-07",
        requiresAcceptance: false,
      },
    });

    const status = await acceptLegal("2026-07-07", "2026-07-07");
    expect(postMock).toHaveBeenCalledWith("/legal/accept", {
      termsVersion: "2026-07-07",
      privacyVersion: "2026-07-07",
      appVersion: "admin-web",
    });
    expect(status.requiresAcceptance).toBe(false);
  });
});
