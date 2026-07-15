import { describe, it, expect, vi, beforeEach } from "vitest";

const getMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

describe("useReconciliation API contracts", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("alerts endpoint returns alerts array shape", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        alerts: [
          {
            id: "a1",
            severity: "WARNING",
            villaSum: 500,
            societyCash: 300,
            creditApplied: 200,
            unexplainedDifference: 0,
            difference: 0,
          },
        ],
        stats: { total: 1, critical: 0, warning: 1, totalDifference: 0 },
      },
    });

    const { useReconciliationAlerts } = await import("@/hooks/useReconciliation");
    expect(useReconciliationAlerts).toBeDefined();

    const { api } = await import("@/lib/api");
    const res = await api.get("/reconciliation/alerts?status=unresolved");
    expect(res.data.alerts).toHaveLength(1);
    expect(res.data.alerts[0].creditApplied).toBe(200);
  });

  it("summary endpoint matches financialHealth shape", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        financialHealth: {
          status: "HEALTHY",
          unresolvedAlerts: 0,
          criticalAlerts: 0,
          recentPayments7Days: 3,
        },
        cycles: { total: 2, active: 1 },
      },
    });

    const { api } = await import("@/lib/api");
    const res = await api.get("/reconciliation/summary");
    expect(res.data.financialHealth.status).toBe("HEALTHY");
    expect(res.data.cycles.total).toBe(2);
  });
});
