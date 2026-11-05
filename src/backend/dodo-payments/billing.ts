import "server-only";
import { createSupabaseAdmin } from "@/backend/supabase/admin";
import type { createSupabaseServerClient } from "@/backend/supabase/client";
import { DodoPaymentsClient } from "./client";
import { BillingError, getBillingConfig, providerId, record, validateCheckoutUrl, type BillingPlan } from "./config";
import { getWebhookKey, type BillingEvent } from "./webhooks";

type Admin = ReturnType<typeof createSupabaseAdmin>;
type AuthClient = ReturnType<typeof createSupabaseServerClient>;

async function rpc(admin: Admin, name: string, args: Record<string, string | number>): Promise<unknown> {
  const { data, error } = await admin.rpc(name, args);
  if (error) throw new BillingError("billing_database", 503, "Billing storage is unavailable. Ask the operator to check the billing migration and reconcile any pending attempt.");
  return data as unknown;
}

export function parseCheckoutPlan(value: unknown): BillingPlan {
  if (!record(value) || Object.keys(value).length !== 1 || (value.plan !== "starter" && value.plan !== "pro")) {
    throw new BillingError("invalid_plan", 400, "Send only a plan: starter or pro.");
  }
  return value.plan;
}

export async function startBillingCheckout(supabase: AuthClient, userId: string, plan: BillingPlan, appUrl: URL): Promise<{ url: string; mode: "test_mode" }> {
  const { data: membership, error } = await supabase.from("tenant_memberships")
    .select("tenant_id, role").eq("user_id", userId)
    .order("created_at", { ascending: true }).order("tenant_id", { ascending: true }).limit(1).maybeSingle();
  if (error) throw new BillingError("billing_database", 503, "Workspace membership could not be verified. Please try again later.");
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new BillingError("forbidden", 403, "Only workspace owners and admins can manage billing.");
  }
  const config = getBillingConfig();
  getWebhookKey();
  const provider = new DodoPaymentsClient();
  const admin = createSupabaseAdmin();
  const productId = config.products[plan];
  await provider.verifyProduct(productId, plan);
  const attempt = await rpc(admin, "begin_dodo_checkout", {
    p_tenant_id: membership.tenant_id, p_user_id: userId, p_environment: config.environment, p_product_id: productId, p_plan: plan,
  });
  if (!record(attempt)) throw new BillingError("billing_database", 503, "Billing storage returned an invalid result.");
  if (attempt.result === "ready") return { url: validateCheckoutUrl(attempt.url), mode: config.environment };
  if (attempt.result === "forbidden") throw new BillingError("forbidden", 403, "Billing permission changed. Refresh your session.");
  if (attempt.result === "subscription_exists") {
    throw new BillingError("subscription_exists", 409, "This workspace already has a subscription or legacy billing record. Contact the operator to manage it.");
  }
  if (attempt.result === "reconcile") {
    throw new BillingError("checkout_reconciliation", 409, "A checkout is already pending. Ask the operator to reconcile it before starting another.");
  }
  if (attempt.result === "missing_email") throw new BillingError("billing_email", 503, "The workspace owner needs a verified account email before billing can start.");
  if (attempt.result !== "started" || !providerId(attempt.attempt_id) || typeof attempt.name !== "string" ||
      typeof attempt.email !== "string" || (attempt.customer_id !== null && !providerId(attempt.customer_id))) {
    throw new BillingError("billing_database", 503, "Billing storage returned an invalid attempt. Ask the operator to reconcile it.");
  }
  const attemptId = attempt.attempt_id;
  try {
    const customerId = attempt.customer_id ?? await provider.createCustomer(attempt.name, attempt.email);
    await rpc(admin, "bind_dodo_customer", { p_attempt_id: attemptId, p_customer_id: customerId });
    const checkout = await provider.createCheckout(productId, customerId, new URL("/dashboard?billing=return", appUrl).href);
    await rpc(admin, "finish_dodo_checkout", { p_attempt_id: attemptId, p_session_id: checkout.sessionId, p_checkout_url: checkout.url });
    return { url: checkout.url, mode: config.environment };
  } catch (error) {
    try { await rpc(admin, "reconcile_dodo_checkout", { p_attempt_id: attemptId }); } catch { /* Durable pending status also blocks another POST. */ }
    throw error;
  }
}

export async function processBillingEvent(event: BillingEvent, webhookId: string, environment: "test_mode"): Promise<void> {
  await rpc(createSupabaseAdmin(), "process_dodo_event", {
    p_environment: environment, p_webhook_id: webhookId, p_type: event.type, p_event_at: event.timestamp,
    p_customer_id: event.customerId, p_subscription_id: event.subscriptionId, p_product_id: event.productId,
    p_plan: event.plan, p_amount: event.amount, p_currency: "USD", p_frequency_count: 1, p_frequency_interval: "Month", p_quantity: 1,
  });
}
