import { test, expect } from "@playwright/test";
import { ADMIN_SIDEBAR_ROUTES } from "./sidebar-routes";

const ADMIN_USER = process.env.E2E_ADMIN_USER ?? "sandbox_admin";
const ADMIN_PASS = process.env.E2E_ADMIN_PASS ?? "Sandbox123!";
const SOCIETY_ID = process.env.E2E_SOCIETY_ID ?? "qa-sandbox-society";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

async function seedAdminSession(
  page: import("@playwright/test").Page,
  request: import("@playwright/test").APIRequestContext,
) {
  const login = await request.post(`${API_BASE}/auth/admin/login`, {
    data: { societyId: SOCIETY_ID, username: ADMIN_USER, password: ADMIN_PASS },
  });
  expect(login.ok()).toBeTruthy();
  const body = (await login.json()) as { token?: string; refreshToken?: string; user?: { societyId?: string } };
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ token, refreshToken, societyId }) => {
      localStorage.setItem("token", token);
      if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
      if (societyId) localStorage.setItem("tenant_society_id", societyId);
      document.cookie = "tenant_auth=1; path=/; max-age=604800; SameSite=Lax";
    },
    { token: body.token!, refreshToken: body.refreshToken ?? null, societyId: body.user?.societyId ?? SOCIETY_ID },
  );
}

test.describe("K10 admin sidebar route matrix", () => {
  for (const route of ADMIN_SIDEBAR_ROUTES) {
    test(`loads ${route}`, async ({ page, request }) => {
      await seedAdminSession(page, request);
      const res = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 45_000 });
      expect(res?.status(), `HTTP status for ${route}`).toBeLessThan(500);
      await expect(page.locator("body")).not.toContainText("Application error", { timeout: 5_000 });
    });
  }
});
