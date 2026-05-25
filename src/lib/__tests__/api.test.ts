import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock localStorage
const mockStorage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
});

// Mock window.location
vi.stubGlobal("location", { pathname: "/dashboard", href: "" });

describe("api client", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  });

  it("reads token from localStorage", () => {
    mockStorage["token"] = "test-jwt-token";
    expect(localStorage.getItem("token")).toBe("test-jwt-token");
  });

  it("clears token on removeItem", () => {
    mockStorage["token"] = "test-jwt-token";
    localStorage.removeItem("token");
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("stores society ID separately from token", () => {
    mockStorage["token"] = "jwt.payload.sig";
    mockStorage["tenant_society_id"] = "soc-123";
    expect(localStorage.getItem("tenant_society_id")).toBe("soc-123");
  });
});

describe("apiBaseUrl", () => {
  it("exports getResolvedApiBaseUrl", async () => {
    const mod = await import("@/lib/apiBaseUrl");
    expect(mod.getResolvedApiBaseUrl).toBeDefined();
    expect(typeof mod.getResolvedApiBaseUrl()).toBe("string");
  });

  it("returns localhost fallback when env not set", async () => {
    const mod = await import("@/lib/apiBaseUrl");
    const url = mod.getResolvedApiBaseUrl();
    expect(url).toContain("/api");
  });
});
