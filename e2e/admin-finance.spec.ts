import { test, expect } from "@playwright/test";

const ADMIN_USER = process.env.E2E_ADMIN_USER ?? "sandbox_admin";
const ADMIN_PASS = process.env.E2E_ADMIN_PASS ?? "Sandbox123!";
const SOCIETY_ID = process.env.E2E_SOCIETY_ID ?? "qa-sandbox-society";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

type AdminLoginBody = {
  token?: string;
  refreshToken?: string;
  user?: { societyId?: string | null; role?: string };
};

async function dismissLegalConsentIfPresent(page: import("@playwright/test").Page) {
  const gate = page.getByRole("dialog", { name: "Updated Terms and Privacy Policy" });
  if (!(await gate.isVisible().catch(() => false))) return;
  await page
    .getByRole("checkbox", { name: /agree to the Terms/i })
    .check();
  const accept = page.getByRole("button", { name: "Accept & Continue" });
  await expect(accept).toBeEnabled({ timeout: 5_000 });
  await accept.click();
  await expect(gate).toBeHidden({ timeout: 15_000 });
}

async function gotoTenantPage(page: import("@playwright/test").Page, path: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
}

async function seedAdminSession(
  page: import("@playwright/test").Page,
  request: import("@playwright/test").APIRequestContext,
) {
  const login = await request.post(`${API_BASE}/auth/admin/login`, {
    data: {
      societyId: SOCIETY_ID,
      username: ADMIN_USER,
      password: ADMIN_PASS,
    },
  });
  expect(
    login.ok(),
    `admin login failed (${login.status()}): ${await login.text()}`,
  ).toBeTruthy();

  const body = (await login.json()) as AdminLoginBody;
  expect(body.token, "login response missing token").toBeTruthy();
  expect(body.user?.role).toMatch(/ADMIN/);

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ token, refreshToken, societyId }) => {
      localStorage.setItem("token", token);
      if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
      if (societyId) localStorage.setItem("tenant_society_id", societyId);
      document.cookie = "tenant_auth=1; path=/; max-age=604800; SameSite=Lax";
    },
    {
      token: body.token!,
      refreshToken: body.refreshToken ?? null,
      societyId: body.user?.societyId ?? SOCIETY_ID,
    },
  );

  return body.token!;
}

test.describe("Admin finance journey (C4)", () => {
  test("login → reconciliation → maintenance → system health → cash payment", async ({
    page,
    request,
  }) => {
    const token = await seedAdminSession(page, request);

    await gotoTenantPage(page, "/reconciliation");
    await dismissLegalConsentIfPresent(page);
    await expect(page.getByRole("heading", { level: 1, name: "Financial Reconciliation" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("columnheader", { name: "Settled" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Cash" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Credit" })).toBeVisible();

    await gotoTenantPage(page, "/maintenance-management");
    await dismissLegalConsentIfPresent(page);
    await expect(
      page.getByRole("heading", { level: 1, name: /Maintenance payment management/i }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await gotoTenantPage(page, "/maintenance-billing");
    await dismissLegalConsentIfPresent(page);
    await expect(
      page.getByRole("heading", { level: 1, name: /Maintenance billing cycles/i }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await gotoTenantPage(page, "/system-health");
    await dismissLegalConsentIfPresent(page);
    await expect(page.getByRole("heading", { level: 1, name: "System health" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Reconciliation")).toBeVisible();
    await expect(page.getByText("Gateway / webhooks")).toBeVisible();

    // Path #16 — admin cash payment via API (sandbox maintenance seed in CI)
    const gridRes = await request.get(`${API_BASE}/maintenance-management/financial-dashboard`, {
      headers: { Authorization: `Bearer ${token}`, "X-Society-Id": SOCIETY_ID },
    });
    if (gridRes.ok()) {
      const fyRes = await request.get(
        `${API_BASE}/maintenance-management/collection/financial-years`,
        { headers: { Authorization: `Bearer ${token}`, "X-Society-Id": SOCIETY_ID } },
      );
      if (fyRes.ok()) {
        const fyBody = (await fyRes.json()) as { financialYears?: Array<{ id: string }> };
        const fyId = fyBody.financialYears?.[0]?.id;
        if (fyId) {
          const cyclesRes = await request.get(
            `${API_BASE}/maintenance-management/collection/financial-years/${fyId}/cycles`,
            { headers: { Authorization: `Bearer ${token}`, "X-Society-Id": SOCIETY_ID } },
          );
          if (cyclesRes.ok()) {
            const cyclesBody = (await cyclesRes.json()) as {
              cycles?: Array<{ id: string; periodMonth: number; periodYear: number }>;
            };
            const cycle = cyclesBody.cycles?.[0];
            const villasRes = await request.get(`${API_BASE}/villas`, {
              headers: { Authorization: `Bearer ${token}`, "X-Society-Id": SOCIETY_ID },
            });
            if (cycle && villasRes.ok()) {
              const villasBody = (await villasRes.json()) as { villas?: Array<{ id: string }> };
              const villaId = villasBody.villas?.[0]?.id;
              if (villaId) {
                const markPaid = await request.post(`${API_BASE}/maintenance-management/mark-paid`, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Society-Id": SOCIETY_ID,
                    "Content-Type": "application/json",
                  },
                  data: {
                    villaId,
                    year: cycle.periodYear,
                    month: cycle.periodMonth,
                    amount: 500,
                    paymentDate: new Date().toISOString(),
                    paymentMode: "CASH",
                    maintenanceCollectionCycleId: cycle.id,
                    remarks: "E2E sandbox cash",
                    idempotencyKey: `e2e-cash-${cycle.id}-${villaId}`,
                  },
                });
                expect(
                  markPaid.ok() || markPaid.status() === 409,
                  `mark-paid failed: ${await markPaid.text()}`,
                ).toBeTruthy();
              }
            }
          }
        }
      }
    }

    const healthApi = await request.get(`${API_BASE}/admin-ops/system-health`, {
      headers: { Authorization: `Bearer ${token}`, "X-Society-Id": SOCIETY_ID },
    });
    expect(healthApi.ok()).toBeTruthy();
    const health = (await healthApi.json()) as { reconciliation?: { status?: string } };
    expect(health.reconciliation?.status).toMatch(/HEALTHY|WARNING|CRITICAL/);
  });

  test("billing cycles — create cycle modal opens", async ({ page, request }) => {
    await seedAdminSession(page, request);
    await gotoTenantPage(page, "/maintenance-billing");
    await dismissLegalConsentIfPresent(page);
    await expect(
      page.getByRole("heading", { level: 1, name: /Maintenance billing cycles/i }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Create cycle" }).click();
    await expect(page.getByRole("heading", { name: "New billing cycle" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Financial year")).toBeVisible();
  });
});
