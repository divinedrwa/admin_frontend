/**
 * Plaintext passwords cannot be read from the API (only hashes exist server-side).
 * When a super admin creates a society admin in this browser, we stash the password
 * here so the console can show it next to that society until the tab session ends.
 */

const STORAGE_KEY = "super_admin_display_passwords_v1";

export type CredentialMap = Record<string, Record<string, string>>;

function readAll(): CredentialMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    // Decode from base64 obfuscation; fall back to raw JSON for backwards compat
    let json: string;
    try {
      json = atob(raw);
    } catch {
      json = raw;
    }
    const parsed = JSON.parse(json) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as CredentialMap;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function writeAll(map: CredentialMap): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, btoa(JSON.stringify(map)));
  } catch {
    /* quota / private mode */
  }
}

/** Remember password shown only for this browser session (sessionStorage). */
export function rememberSocietyAdminPassword(
  societyId: string,
  username: string,
  password: string,
): void {
  const sid = societyId.trim();
  const u = username.trim();
  if (!sid || !u || !password) return;
  const map = readAll();
  const prev = map[sid] ?? {};
  map[sid] = { ...prev, [u]: password };
  writeAll(map);
}

export function getStoredPasswordForAdmin(societyId: string, username: string): string | undefined {
  const u = username.trim();
  if (!societyId.trim() || !u) return undefined;
  return readAll()[societyId]?.[u];
}
