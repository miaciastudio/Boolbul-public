import { GatewayError, type AppliedOffer } from "./dodo";
import type { VerifiedOffer } from "./verify";

export interface StripeOptions {
  /** Your Stripe secret key (sk_live_… / sk_test_…) or a restricted key with subscription write access. */
  secretKey: string;
  fetch?: typeof fetch;
}

const STRIPE_FEEDBACK = new Set(["too_expensive", "missing_features", "switched_service", "unused", "customer_service", "low_quality", "too_complex", "other"]);

function form(params: Record<string, string | number | boolean | undefined>): string {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) body.append(key, String(value));
  return body.toString();
}

async function call<T>(options: StripeOptions, method: string, path: string,
  params?: Record<string, string | number | boolean | undefined>, idempotencyKey?: string): Promise<T> {
  if (!options.secretKey) throw new Error("Stripe secret key is missing.");
  const headers: Record<string, string> = { Authorization: `Bearer ${options.secretKey}` };
  if (params) headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const response = await (options.fetch ?? fetch)(`https://api.stripe.com${path}`, { method, headers, body: params ? form(params) : undefined });
  const data = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  if (!response.ok) throw new GatewayError("stripe", response.status, `Stripe ${method} ${path} failed: ${data?.error?.message ?? response.status}`, data);
  return data as T;
}

interface StripeSubscription {
  id: string;
  discounts?: Array<string | { id: string }>;
}

/**
 * Pauses payment collection for N days and resumes automatically. The
 * customer keeps access and the skipped invoices are voided, so nothing is
 * owed later. Works on every billing mode.
 */
export async function pauseStripeSubscription(options: StripeOptions, subscriptionId: string, days: number, reference: string, now = new Date()): Promise<AppliedOffer> {
  if (!Number.isSafeInteger(days) || days <= 0 || days > 365) throw new Error("Pause length must be 1-365 days.");
  const resumes = Math.floor(now.getTime() / 1000) + days * 86_400;
  await call(options, "POST", `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    "pause_collection[behavior]": "void",
    "pause_collection[resumes_at]": resumes,
    "metadata[boolbul_retention]": reference.slice(0, 120),
  }, `boolbul-pause-${reference}`);
  return { gateway: "stripe", offerType: "pause", subscriptionId, resumesAt: new Date(resumes * 1000).toISOString() };
}

/** Creates a one-off coupon and adds it to the subscription, keeping existing discounts. */
export async function applyStripeDiscount(options: StripeOptions, subscriptionId: string, basisPoints: number, months: number, reference: string): Promise<AppliedOffer> {
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 1 || basisPoints > 10000) throw new Error("Discount must be 1-10000 basis points.");
  const coupon = await call<{ id: string }>(options, "POST", "/v1/coupons", {
    percent_off: Math.round(basisPoints) / 100,
    duration: months === 0 ? "forever" : months === 1 ? "once" : "repeating",
    duration_in_months: months > 1 ? months : undefined,
    max_redemptions: 1,
    name: `Retention ${basisPoints / 100}% off`,
    "metadata[source]": "boolbul",
    "metadata[reference]": reference.slice(0, 120),
  }, `boolbul-coupon-${reference}`);
  const subscription = await call<StripeSubscription>(options, "GET", `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`);
  const existing = (subscription.discounts ?? []).map((d) => typeof d === "string" ? d : d.id).filter(Boolean).slice(0, 19);
  const params: Record<string, string> = { "metadata[boolbul_retention]": reference.slice(0, 120) };
  existing.forEach((discountId, index) => { params[`discounts[${index}][discount]`] = discountId; });
  params[`discounts[${existing.length}][coupon]`] = coupon.id;
  await call(options, "POST", `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, params, `boolbul-discount-${reference}`);
  return { gateway: "stripe", offerType: "discount", subscriptionId, discountRef: coupon.id };
}

export function applyStripeOffer(options: StripeOptions, offer: VerifiedOffer): Promise<AppliedOffer> {
  return offer.offerType === "pause"
    ? pauseStripeSubscription(options, offer.subscriptionId, offer.offerValue, offer.nonce)
    : applyStripeDiscount(options, offer.subscriptionId, offer.offerValue, offer.discountDurationMonths ?? 0, offer.nonce);
}

/** Cancels at period end (or now) and records the exit survey answer in `cancellation_details`. */
export async function cancelStripeSubscription(options: StripeOptions, subscriptionId: string,
  details: { reasonId?: string | null; comment?: string | null; immediately?: boolean } = {}): Promise<void> {
  const feedback = details.reasonId && STRIPE_FEEDBACK.has(details.reasonId) ? details.reasonId : undefined;
  const comment = details.comment?.trim().slice(0, 500) || undefined;
  const params = { "cancellation_details[feedback]": feedback, "cancellation_details[comment]": comment };
  if (details.immediately) {
    await call(options, "DELETE", `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, params);
  } else {
    await call(options, "POST", `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, { cancel_at_period_end: true, ...params });
  }
}
