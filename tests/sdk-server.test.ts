import { describe, expect, it, vi } from "vitest";
import { createOfferJwt } from "@/lib/crypto/jwt";
import {
  applyDodoOffer, applyStripeOffer, cancelDodoSubscription, cancelStripeSubscription, OfferVerificationError,
  redeemOffer, verifyOffer, type VerifiedOffer,
} from "@boolbul/sdk/server";

const secret = "bb_sec_" + "a".repeat(64);
const binding = { tenantId: "tenant-1", customerId: "cus_1", subscriptionId: "sub_1", nonce: crypto.randomUUID() };
const discountJwt = () => createOfferJwt({ ...binding, offerType: "discount", offerValue: 5000, discountDurationMonths: 2 }, secret);
const pauseJwt = () => createOfferJwt({ ...binding, nonce: crypto.randomUUID(), offerType: "pause", offerValue: 30 }, secret);

function recorder(responses: Record<string, unknown> = {}) {
  const calls: Array<{ method: string; url: string; body: string | null; headers: Record<string, string> }> = [];
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    calls.push({ method, url, body: (init.body as string) ?? null, headers: init.headers as Record<string, string> });
    const key = Object.keys(responses).find((pattern) => `${method} ${url}`.includes(pattern));
    return Response.json(key ? responses[key] : {});
  });
  return { calls, fetch: fetchMock as unknown as typeof fetch };
}

describe("verifyOffer (server, zero-dependency)", () => {
  it("accepts tokens minted by the BoolBul edge", async () => {
    const offer = await verifyOffer(await discountJwt(), secret, { expected: { subscriptionId: "sub_1" } });
    expect(offer).toMatchObject({ ...binding, offerType: "discount", offerValue: 5000, discountDurationMonths: 2 });
  });

  it("rejects wrong secrets, tampering, other subscriptions, replays and expiry", async () => {
    const token = await discountJwt();
    await expect(verifyOffer(token, "bb_sec_" + "b".repeat(64))).rejects.toMatchObject({ code: "bad_signature" });
    const [h, p, s] = token.split(".");
    const forged = JSON.parse(Buffer.from(p, "base64url").toString());
    forged.offerValue = 10000;
    await expect(verifyOffer(`${h}.${Buffer.from(JSON.stringify(forged)).toString("base64url")}.${s}`, secret)).rejects.toMatchObject({ code: "bad_signature" });
    await expect(verifyOffer(token, secret, { expected: { subscriptionId: "sub_other" } })).rejects.toMatchObject({ code: "identity_mismatch" });
    const seen = new Set<string>();
    const seenNonce = (nonce: string) => { const hit = seen.has(nonce); seen.add(nonce); return hit; };
    await verifyOffer(token, secret, { seenNonce });
    await expect(verifyOffer(token, secret, { seenNonce })).rejects.toBeInstanceOf(OfferVerificationError);
    await expect(verifyOffer(token, secret, { now: new Date(Date.now() + 301_000) })).rejects.toMatchObject({ code: "expired" });
    await expect(verifyOffer("a.b", secret)).rejects.toMatchObject({ code: "malformed" });
  });
});

describe("Dodo Payments adapter", () => {
  const offer = (o: Partial<VerifiedOffer>): VerifiedOffer => ({ ...binding, offerType: "pause", offerValue: 30, exp: 0, ...o });

  it("pauses by moving the next billing date (no resume job needed)", async () => {
    const { calls, fetch } = recorder({ "GET https://test.dodopayments.com/subscriptions/sub_1": { next_billing_date: "2030-01-01T00:00:00Z", product_id: "pdt_1", quantity: 1 } });
    const result = await applyDodoOffer({ apiKey: "dodo_test", environment: "test_mode", fetch }, offer({}));
    expect(calls.at(-1)).toMatchObject({ method: "PATCH", url: "https://test.dodopayments.com/subscriptions/sub_1" });
    expect(JSON.parse(calls.at(-1)!.body!)).toEqual({ next_billing_date: "2030-01-31T00:00:00.000Z" });
    expect(result.resumesAt).toBe("2030-01-31T00:00:00.000Z");
    expect(calls[0].headers.Authorization).toBe("Bearer dodo_test");
  });

  it("native pause sends status alone, as Dodo requires", async () => {
    const { calls, fetch } = recorder();
    await applyDodoOffer({ apiKey: "k", environment: "live_mode", pauseStrategy: "status_paused", fetch }, offer({}));
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://live.dodopayments.com/subscriptions/sub_1");
    expect(JSON.parse(calls[0].body!)).toEqual({ status: "paused" });
  });

  it("applies a discount with a single-use, product-restricted code via change-plan", async () => {
    const { calls, fetch } = recorder({
      "GET https://test.dodopayments.com/subscriptions/sub_1": { product_id: "pdt_9", quantity: 2, next_billing_date: "2030-01-01T00:00:00Z" },
      "POST https://test.dodopayments.com/discounts": { discount_id: "dsc_1", code: "RETAIN50" },
    });
    await applyDodoOffer({ apiKey: "k", environment: "test_mode", fetch }, offer({ offerType: "discount", offerValue: 5000, discountDurationMonths: 2 }));
    const create = JSON.parse(calls[1].body!);
    expect(create).toMatchObject({ type: "percentage", amount: 5000, usage_limit: 1, restricted_to: ["pdt_9"], subscription_cycles: 2 });
    expect(calls[2].url).toBe("https://test.dodopayments.com/subscriptions/sub_1/change-plan");
    expect(JSON.parse(calls[2].body!)).toMatchObject({ product_id: "pdt_9", quantity: 2, proration_billing_mode: "do_not_bill", discount_codes: ["RETAIN50"] });
  });

  it("forwards the exit reason when cancelling, ignoring unknown reasons", async () => {
    const { calls, fetch } = recorder();
    await cancelDodoSubscription({ apiKey: "k", environment: "test_mode", fetch }, "sub_1", { reasonId: "too_expensive", comment: " pricey " });
    await cancelDodoSubscription({ apiKey: "k", environment: "test_mode", fetch }, "sub_1", { reasonId: "hacked", immediately: true });
    expect(JSON.parse(calls[0].body!)).toEqual({ cancel_at_next_billing_date: true, cancellation_feedback: "too_expensive", cancellation_comment: "pricey" });
    expect(JSON.parse(calls[1].body!)).toEqual({ status: "cancelled", cancel_reason: "cancelled_by_customer" });
  });
});

describe("Stripe adapter", () => {
  const params = (body: string | null) => Object.fromEntries(new URLSearchParams(body ?? ""));

  it("pauses collection with auto-resume and an idempotency key", async () => {
    const { calls, fetch } = recorder();
    const result = await applyStripeOffer({ secretKey: "sk_test_1", fetch }, { ...binding, offerType: "pause", offerValue: 14, exp: 0 });
    expect(calls[0]).toMatchObject({ method: "POST", url: "https://api.stripe.com/v1/subscriptions/sub_1" });
    expect(params(calls[0].body)).toMatchObject({ "pause_collection[behavior]": "void" });
    expect(Number(params(calls[0].body)["pause_collection[resumes_at]"])).toBeGreaterThan(Date.now() / 1000 + 13 * 86400);
    expect(calls[0].headers["Idempotency-Key"]).toBe(`boolbul-pause-${binding.nonce}`);
    expect(result.resumesAt).toBeDefined();
  });

  it("adds a single-use coupon while keeping existing discounts", async () => {
    const { calls, fetch } = recorder({
      "POST https://api.stripe.com/v1/coupons": { id: "cpn_1" },
      "GET https://api.stripe.com/v1/subscriptions/sub_1": { id: "sub_1", discounts: ["di_existing"] },
    });
    await applyStripeOffer({ secretKey: "sk_test_1", fetch }, { ...binding, offerType: "discount", offerValue: 3000, discountDurationMonths: 3, exp: 0 });
    expect(params(calls[0].body)).toMatchObject({ percent_off: "30", duration: "repeating", duration_in_months: "3", max_redemptions: "1" });
    expect(params(calls[2].body)).toMatchObject({ "discounts[0][discount]": "di_existing", "discounts[1][coupon]": "cpn_1" });
  });

  it("cancels at period end with Stripe's cancellation feedback", async () => {
    const { calls, fetch } = recorder();
    await cancelStripeSubscription({ secretKey: "sk_test_1", fetch }, "sub_1", { reasonId: "switched_service", comment: "found X" });
    expect(params(calls[0].body)).toEqual({ cancel_at_period_end: "true", "cancellation_details[feedback]": "switched_service", "cancellation_details[comment]": "found X" });
  });
});

describe("redeemOffer", () => {
  it("never touches the gateway when verification fails", async () => {
    const { calls, fetch } = recorder();
    await expect(redeemOffer(await pauseJwt(), { signingSecret: "bb_sec_" + "z".repeat(64), gateway: { gateway: "stripe", secretKey: "sk", fetch } }))
      .rejects.toMatchObject({ code: "bad_signature" });
    expect(calls).toHaveLength(0);
  });

  it("verifies then applies in one call", async () => {
    const { calls, fetch } = recorder();
    const { offer, applied } = await redeemOffer(await pauseJwt(), { signingSecret: secret, gateway: { gateway: "stripe", secretKey: "sk", fetch } });
    expect(offer.offerType).toBe("pause");
    expect(applied.gateway).toBe("stripe");
    expect(calls).toHaveLength(1);
  });
});
