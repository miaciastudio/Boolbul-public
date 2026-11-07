// @boolbul/sdk/server — run on YOUR backend. BoolBul never sees your gateway keys.
import { applyDodoOffer, cancelDodoSubscription, type AppliedOffer, type DodoEnvironment } from "./dodo";
import { applyStripeOffer, cancelStripeSubscription } from "./stripe";
import { verifyOffer, type VerifiedOffer, type VerifyOptions } from "./verify";

export * from "./verify";
export * from "./dodo";
export * from "./stripe";

export type GatewayConfig =
  | { gateway: "dodo_payments"; apiKey: string; environment: DodoEnvironment; pauseStrategy?: "extend_billing_date" | "status_paused"; fetch?: typeof fetch }
  | { gateway: "stripe"; secretKey: string; fetch?: typeof fetch };

/**
 * One call for your "apply offer" endpoint: verifies the signed offer, then
 * applies it with Dodo Payments or Stripe.
 *
 * ```ts
 * const result = await redeemOffer(body.offerJwt, {
 *   signingSecret: process.env.BOOLBUL_SIGNING_SECRET!,
 *   gateway: { gateway: "stripe", secretKey: process.env.STRIPE_SECRET_KEY! },
 *   expected: { subscriptionId: session.user.subscriptionId },
 * });
 * ```
 */
export async function redeemOffer(offerJwt: string, options: VerifyOptions & { signingSecret: string; gateway: GatewayConfig }):
  Promise<{ offer: VerifiedOffer; applied: AppliedOffer }> {
  const offer = await verifyOffer(offerJwt, options.signingSecret, options);
  const g = options.gateway;
  const applied = g.gateway === "stripe"
    ? await applyStripeOffer({ secretKey: g.secretKey, fetch: g.fetch }, offer)
    : await applyDodoOffer({ apiKey: g.apiKey, environment: g.environment, pauseStrategy: g.pauseStrategy, fetch: g.fetch }, offer);
  return { offer, applied };
}

/** Your cancel endpoint: forwards the BoolBul exit reason to the gateway's own churn analytics. */
export function cancelSubscription(subscriptionId: string, gateway: GatewayConfig,
  details: { reasonId?: string | null; comment?: string | null; immediately?: boolean } = {}): Promise<void> {
  return gateway.gateway === "stripe"
    ? cancelStripeSubscription({ secretKey: gateway.secretKey, fetch: gateway.fetch }, subscriptionId, details)
    : cancelDodoSubscription({ apiKey: gateway.apiKey, environment: gateway.environment, fetch: gateway.fetch }, subscriptionId, details);
}
