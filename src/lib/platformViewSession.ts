/** Super-admin “open society dashboard” mode — tenant JWT is stored under `token`; this records metadata for UI + exit. */

export const SA_PLATFORM_VIEW_KEY = "sa_platform_view";

/**
 * When a super-admin opens a society's admin dashboard, the platform-issued
 * tenant JWT is written to `localStorage["token"]` so the existing tenant
 * axios client picks it up. This would silently overwrite any pre-existing
 * tenant-admin session in the same browser. To preserve that session for
 * the "Back to platform console" exit, we stash the prior token here.
 */
const SA_PRE_VIEW_TOKEN_KEY = "sa_pre_view_token";

export type PlatformViewPayload = {
  societyId: string;
  societyName: string;
};

export function setPlatformViewSession(societyId: string, societyName: string): void {
  if (typeof window === "undefined") return;
  const payload: PlatformViewPayload = {
    societyId: societyId.trim(),
    societyName: societyName.trim() || societyId.trim(),
  };
  localStorage.setItem(SA_PLATFORM_VIEW_KEY, JSON.stringify(payload));
}

export function getPlatformViewSession(): PlatformViewPayload | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SA_PLATFORM_VIEW_KEY);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<PlatformViewPayload>;
    const societyId = typeof o.societyId === "string" ? o.societyId.trim() : "";
    if (!societyId) return null;
    return {
      societyId,
      societyName:
        typeof o.societyName === "string" && o.societyName.trim()
          ? o.societyName.trim()
          : societyId,
    };
  } catch {
    return null;
  }
}

/**
 * Clears the platform-view metadata AND the stashed pre-view tenant token.
 * Used by the 401 interceptor and the regular tenant logout — both want a
 * clean slate, not silent re-login into a different tenant session.
 */
export function clearPlatformViewSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SA_PLATFORM_VIEW_KEY);
  localStorage.removeItem(SA_PRE_VIEW_TOKEN_KEY);
}

/**
 * Enter platform-view mode: stash any existing tenant `token`, then write
 * the platform-issued tenant token + view metadata. Use [exitPlatformView]
 * to reverse cleanly.
 */
export function enterPlatformView(
  platformIssuedTenantToken: string,
  societyId: string,
  societyName: string,
): void {
  if (typeof window === "undefined") return;
  const prior = localStorage.getItem("token");
  if (prior && prior !== platformIssuedTenantToken) {
    localStorage.setItem(SA_PRE_VIEW_TOKEN_KEY, prior);
  } else {
    // Don't stash a stale value if the user re-enters platform view from
    // an already-platform-view state.
    localStorage.removeItem(SA_PRE_VIEW_TOKEN_KEY);
  }
  localStorage.setItem("token", platformIssuedTenantToken);
  setPlatformViewSession(societyId, societyName);
}

/**
 * Exit platform-view mode: restore the stashed pre-view tenant token if any
 * (returning the original tenant admin to their session), otherwise drop the
 * platform-issued token. Always clears the view metadata.
 */
export function exitPlatformView(): void {
  if (typeof window === "undefined") return;
  const stashed = localStorage.getItem(SA_PRE_VIEW_TOKEN_KEY);
  if (stashed) {
    localStorage.setItem("token", stashed);
  } else {
    localStorage.removeItem("token");
  }
  localStorage.removeItem(SA_PRE_VIEW_TOKEN_KEY);
  localStorage.removeItem(SA_PLATFORM_VIEW_KEY);
}
