import { describe, it, expect } from "vitest";
import {
  isTenantAdminToken,
  readRoleFromToken,
  readSocietyIdFromToken,
} from "@/lib/jwt";

/** Build a minimal unsigned JWT-like string for client-side claim tests. */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

describe("jwt helpers", () => {
  it("reads societyId from token", () => {
    const token = fakeJwt({ societyId: "soc-abc", role: "ADMIN", exp: 9_999_999_999 });
    expect(readSocietyIdFromToken(token)).toBe("soc-abc");
  });

  it("accepts admin roles for tenant admin UI", () => {
    expect(isTenantAdminToken(fakeJwt({ role: "ADMIN", exp: 9_999_999_999 }))).toBe(true);
    expect(isTenantAdminToken(fakeJwt({ role: "RESIDENT_CUM_ADMIN", exp: 9_999_999_999 }))).toBe(
      true,
    );
  });

  it("rejects resident and guard tokens for tenant admin UI", () => {
    expect(isTenantAdminToken(fakeJwt({ role: "RESIDENT", exp: 9_999_999_999 }))).toBe(false);
    expect(isTenantAdminToken(fakeJwt({ role: "GUARD", exp: 9_999_999_999 }))).toBe(false);
    expect(isTenantAdminToken(null)).toBe(false);
  });

  it("reads role claim", () => {
    expect(readRoleFromToken(fakeJwt({ role: "GUARD" }))).toBe("GUARD");
  });
});
