import "server-only";
import type { Gateway } from "./queries";

export type LedgerStatus = "intercepted" | "rescued_discount" | "rescued_pause" | "cancelled";

export interface LedgerEvent {
  tenantId: string;
  sessionId: string;
  customerId: string;
  subscriptionId: string;
  gateway: Gateway;
  mrrCents: number;
  status: LedgerStatus;
  offerType?: "discount" | "pause" | null;
  exitReason?: string | null;
  exitFeedback?: string | null;
}

/** Writes one cancellation-session row through a service-role-only RPC. Never throws. */
export async function recordLedgerEvent(event: LedgerEvent, timeoutMs = 4000): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) return false;
  try {
    const response = await fetch(new URL("/rest/v1/rpc/record_retention_event", baseUrl), {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_tenant_id: event.tenantId, p_session_id: event.sessionId,
        p_customer_id: event.customerId, p_subscription_id: event.subscriptionId,
        p_gateway: event.gateway, p_mrr_cents: event.mrrCents, p_status: event.status,
        p_offer_type: event.offerType ?? null, p_exit_reason: event.exitReason ?? null,
        p_exit_feedback: event.exitFeedback ?? null,
      }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) console.warn("[boolbul] Ledger write rejected", { status: response.status });
    return response.ok;
  } catch (error) {
    console.warn("[boolbul] Ledger write failed", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return false;
  }
}
