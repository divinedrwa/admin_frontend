/** Super-admin “open society dashboard” mode — tenant JWT is stored under `token`; this records metadata for UI + exit. */

export const SA_PLATFORM_VIEW_KEY = "sa_platform_view";

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

export function clearPlatformViewSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SA_PLATFORM_VIEW_KEY);
}
