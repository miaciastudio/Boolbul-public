import { describe, expect, it } from "vitest";
import { ledgerCsv, quotaForPlan, summarize, type LedgerRow } from "@/backend/workspace/overview";

const row = (status: string, mrrCents: number, exitReason: string | null = null, exitFeedback: string | null = null): LedgerRow => ({
  id: crypto.randomUUID(), customerId: "cus_1", subscriptionId: "sub_1", gateway: "stripe", mrrCents, status,
  offerType: status === "rescued_discount" ? "discount" : status === "rescued_pause" ? "pause" : null,
  exitReason, exitReasonLabel: null, exitFeedback, createdAt: "2026-11-07T10:00:00.000Z",
});

describe("dashboard metrics", () => {
  it("counts saves only from signed rescues and ignores abandoned sessions in the save rate", () => {
    const stats = summarize([
      row("rescued_discount", 4900, "too_expensive"), row("rescued_pause", 1900, "unused"),
      row("cancelled", 2900, "too_expensive"), row("intercepted", 9900),
    ]);
    expect(stats).toMatchObject({ sessions: 4, saved: 2, cancelled: 1, saveRate: 66.7, savedMrrCents: 6800, discounts: 1, pauses: 1 });
    expect(stats.topReasons[0]).toMatchObject({ id: "too_expensive", count: 2, label: "It's too expensive" });
  });

  it("maps plans to edge quotas", () => {
    expect(quotaForPlan("starter")).toBe(500);
    expect(quotaForPlan("pro")).toBeGreaterThanOrEqual(1_000_000);
    expect(quotaForPlan("free")).toBe(25);
    expect(quotaForPlan("weird")).toBe(25);
  });

  it("exports CSV safely (quotes, commas, formula injection)", () => {
    const csv = ledgerCsv([row("cancelled", 1234, "other", '=HYPERLINK("x"), "hi"')]);
    const [head, line] = csv.split("\n");
    expect(head).toBe("created_at,customer_id,subscription_id,gateway,outcome,offer,mrr_usd,exit_reason,comment");
    expect(line).toContain("12.34");
    expect(line).toContain(`"'=HYPERLINK(""x""), ""hi"""`);
  });
});
