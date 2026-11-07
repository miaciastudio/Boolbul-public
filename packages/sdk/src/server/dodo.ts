import type { VerifiedOffer } from "./verify";

export type DodoEnvironment = "test_mode" | "live_mode";

export interface DodoOptions {
  /** Your Dodo Payments secret API key. Keep it on your server. */
  apiKey: string;
  environment: DodoEnvironment;
  fetch?: typeof fetch;
}

export class GatewayError extends Error {
  constructor(readonly gateway: "dodo_payments" | "stripe", readonly status: number, message: string, readonly body?: unknown) {
    super(message);
    this.name = "GatewayError";
  }
}

const BASE: Record<DodoEnvironment, string> = {
  test_mode: "https://test.dodopayments.com",
  live_mode: "https://live.dodopayments.com",
};

/** Dodo `cancellation_feedback` values — BoolBul reason ids map 1:1. */
const DODO_FEEDBACK = new Set(["too_expensive", "missing_features", "switched_service", "unused", "customer_service", "low_quality", "too_complex", "other"]);

async function call<T>(options: DodoOptions, method: string, path: string, body?: unknown): Promise<T> {
  if (!options.apiKey) throw new Error("Dodo Payments API key is missing.");
  const response = await (options.fetch ?? fetch)(`${BASE[options.environment]}${path}`, {
    method,
    headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data: unknown = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!response.ok) {
    const message = data && typeof data === "object" && "message" in data ? String((data as { message: unknown }).message) : `HTTP ${response.status}`;
    throw new GatewayError("dodo_payments", response.status, `Dodo Payments ${method} ${path} failed: ${message}`, data);
  }
  return data as T;
}

interface DodoSubscription {
  subscription_id: string;
  product_id: string;
  quantity: number;
  status: string;
  next_billing_date: string;
}

export interface AppliedOffer {
  gateway: "dodo_payments" | "stripe";
  offerType: "discount" | "pause";
  subscriptionId: string;
  /** Pause offers: when billing resumes. */
  resumesAt?: string;
  /** Discount offers: the gateway object that was created/applied. */
  discountRef?: string;
}

export function getDodoSubscription(options: DodoOptions, subscriptionId: string): Promise<DodoSubscription> {
  return call<DodoSubscription>(options, "GET", `/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

/**
 * Pause strategies:
 * - "extend_billing_date" (default): moves the next charge N days later. The
 *   customer keeps access and isn't billed; nothing has to be resumed later.
 * - "status_paused": Dodo's native pause (status "paused"). Dodo has no
 *   auto-resume, so call `resumeDodoSubscription` yourself after N days.
 */
export async function pauseDodoSubscription(
  options: DodoOptions, subscriptionId: string, days: number,
  strategy: "extend_billing_date" | "status_paused" = "extend_billing_date", now = new Date(),
): Promise<AppliedOffer> {
  if (!Number.isSafeInteger(days) || days <= 0 || days > 365) throw new Error("Pause length must be 1-365 days.");
  const path = `/subscriptions/${encodeURIComponent(subscriptionId)}`;
  if (strategy === "status_paused") {
    // Dodo requires `status` to be the only field when pausing.
    await call(options, "PATCH", path, { status: "paused" });
    return { gateway: "dodo_payments", offerType: "pause", subscriptionId, resumesAt: new Date(now.getTime() + days * 86_400_000).toISOString() };
  }
  const subscription = await getDodoSubscription(options, subscriptionId);
  const from = Math.max(now.getTime(), Date.parse(subscription.next_billing_date) || now.getTime());
  const resumesAt = new Date(from + days * 86_400_000).toISOString();
  await call(options, "PATCH", path, { next_billing_date: resumesAt });
  return { gateway: "dodo_payments", offerType: "pause", subscriptionId, resumesAt };
}

export async function resumeDodoSubscription(options: DodoOptions, subscriptionId: string): Promise<void> {
  await call(options, "PATCH", `/subscriptions/${encodeURIComponent(subscriptionId)}`, { status: "active" });
}

/**
 * Dodo has no "add discount to subscription" endpoint, so this creates a
 * single-use code restricted to the subscription's product and re-applies the
 * same product via Change Plan with `do_not_bill`. Verify in test_mode first.
 */
export async function applyDodoDiscount(
  options: DodoOptions, subscriptionId: string, basisPoints: number, months: number, reference: string,
): Promise<AppliedOffer> {
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 1 || basisPoints > 10000) throw new Error("Discount must be 1-10000 basis points.");
  const subscription = await getDodoSubscription(options, subscriptionId);
  const discount = await call<{ discount_id: string; code: string }>(options, "POST", "/discounts", {
    type: "percentage",
    amount: basisPoints,
    name: `BoolBul retention ${basisPoints / 100}%`,
    usage_limit: 1,
    restricted_to: [subscription.product_id],
    preserve_on_plan_change: true,
    ...(months > 0 ? { subscription_cycles: months } : {}),
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    metadata: { source: "boolbul", reference: reference.slice(0, 120), subscription_id: subscriptionId },
  });
  await call(options, "POST", `/subscriptions/${encodeURIComponent(subscriptionId)}/change-plan`, {
    product_id: subscription.product_id,
    quantity: Math.max(1, subscription.quantity || 1),
    proration_billing_mode: "do_not_bill",
    effective_at: "immediately",
    discount_codes: [discount.code],
    metadata: { boolbul_retention: reference.slice(0, 120) },
  });
  return { gateway: "dodo_payments", offerType: "discount", subscriptionId, discountRef: discount.discount_id };
}

export function applyDodoOffer(options: DodoOptions & { pauseStrategy?: "extend_billing_date" | "status_paused" }, offer: VerifiedOffer): Promise<AppliedOffer> {
  return offer.offerType === "pause"
    ? pauseDodoSubscription(options, offer.subscriptionId, offer.offerValue, options.pauseStrategy)
    : applyDodoDiscount(options, offer.subscriptionId, offer.offerValue, offer.discountDurationMonths ?? 0, offer.nonce);
}

/** Schedules cancellation at period end (or now) and forwards the exit survey answer to Dodo. */
export async function cancelDodoSubscription(
  options: DodoOptions, subscriptionId: string,
  details: { reasonId?: string | null; comment?: string | null; immediately?: boolean } = {},
): Promise<void> {
  const feedback = details.reasonId && DODO_FEEDBACK.has(details.reasonId) ? details.reasonId : undefined;
  const comment = details.comment?.trim().slice(0, 1000) || undefined;
  await call(options, "PATCH", `/subscriptions/${encodeURIComponent(subscriptionId)}`, details.immediately
    ? { status: "cancelled", cancel_reason: "cancelled_by_customer", cancellation_feedback: feedback, cancellation_comment: comment }
    : { cancel_at_next_billing_date: true, cancellation_feedback: feedback, cancellation_comment: comment });
}
