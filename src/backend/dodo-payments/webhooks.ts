import "server-only";
import { BillingError, configurationError, getBillingConfig, MONTHLY_CENTS, providerId, record, requiredSetting, type BillingPlan } from "./config";

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value) || !value) throw new Error();
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

export function getWebhookKey(secret = requiredSetting("DODO_PAYMENTS_WEBHOOK_KEY")): Uint8Array<ArrayBuffer> {
  try {
    const bytes = decodeBase64(secret.startsWith("whsec_") ? secret.slice(6) : secret);
    if (bytes.length < 16) throw new Error();
    return bytes;
  } catch {
    throw configurationError("DODO_PAYMENTS_WEBHOOK_KEY (base64 Standard Webhooks signing key)");
  }
}

export async function verifyDodoWebhookSignature(
  rawBody: Uint8Array | string,
  headers: Headers,
  webhookKey: Uint8Array<ArrayBuffer>,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatures = headers.get("webhook-signature");
  if (!providerId(id) || !timestamp || !/^\d{1,12}$/.test(timestamp) || !signatures || signatures.length > 4096 ||
      Math.abs(Number(timestamp) - nowSeconds) > 300) return false;
  const prefix = new TextEncoder().encode(`${id}.${timestamp}.`);
  const body = typeof rawBody === "string" ? new TextEncoder().encode(rawBody) : rawBody;
  const signed = new Uint8Array(prefix.length + body.length);
  signed.set(prefix);
  signed.set(body, prefix.length);
  const key = await crypto.subtle.importKey("raw", webhookKey, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  for (const entry of signatures.split(/\s+/)) {
    const [version, signature, extra] = entry.split(",");
    if (version !== "v1" || !signature || extra !== undefined) continue;
    try {
      if (await crypto.subtle.verify("HMAC", key, decodeBase64(signature), signed)) return true;
    } catch {
      continue;
    }
  }
  return false;
}

export async function readBoundedBody(request: Request, maxBytes = 65_536, timeoutMs = 5_000): Promise<Uint8Array<ArrayBuffer>> {
  const reader = request.body?.getReader();
  if (!reader) throw new BillingError("invalid_body", 400, "A request body is required.");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new BillingError("body_timeout", 400, "Request body timed out."));
      void reader.cancel().catch(() => undefined);
    }, timeoutMs);
  });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        void reader.cancel().catch(() => undefined);
        throw new BillingError("body_too_large", 400, "Request body exceeds the size limit.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes;
  } catch (error) {
    if (error instanceof BillingError) throw error;
    throw new BillingError("invalid_body", 400, "Unable to read request body.");
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

export function parseJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new BillingError("invalid_json", 400, "Request body must be valid JSON.");
  }
}

export type BillingEvent = {
  type: "subscription.active" | "subscription.renewed" | "subscription.paused" | "subscription.cancelled";
  timestamp: string;
  subscriptionId: string;
  customerId: string;
  productId: string;
  plan: BillingPlan;
  amount: number;
};

function isoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  const date = Date.parse(value);
  const day = Number(value.slice(8, 10));
  const month = Number(value.slice(5, 7));
  const days = new Date(Date.UTC(Number(value.slice(0, 4)), month, 0)).getUTCDate();
  return Number.isFinite(date) && month >= 1 && month <= 12 && day >= 1 && day <= days;
}

export function parseBillingEvent(value: unknown, config: ReturnType<typeof getBillingConfig>): BillingEvent | null {
  const malformed = () => new BillingError("invalid_event", 400, "Invalid subscription event.");
  if (!record(value) || typeof value.type !== "string") throw malformed();
  if (value.type !== "subscription.active" && value.type !== "subscription.renewed" &&
      value.type !== "subscription.paused" && value.type !== "subscription.cancelled") return null;
  const data = value.data;
  if (!isoTimestamp(value.timestamp) || !record(data) || !providerId(data.subscription_id) ||
      !providerId(data.product_id) || !record(data.customer) || !providerId(data.customer.customer_id)) throw malformed();
  const plan = (Object.keys(config.products) as BillingPlan[]).find((name) => config.products[name] === data.product_id);
  if (!plan) return null;
  if (value.type === "subscription.active" || value.type === "subscription.renewed") {
    if (data.recurring_pre_tax_amount !== MONTHLY_CENTS[plan] || data.currency !== "USD" ||
        data.payment_frequency_count !== 1 || data.payment_frequency_interval !== "Month" || data.quantity !== 1 ||
        data.trial_period_days !== 0 || data.tax_inclusive !== false ||
        (data.discount_id !== undefined && data.discount_id !== null) ||
        (data.discounts !== undefined && data.discounts !== null && (!Array.isArray(data.discounts) || data.discounts.length !== 0)) ||
        (data.addons !== undefined && (!Array.isArray(data.addons) || data.addons.length !== 0))) throw malformed();
  }
  return { type: value.type, timestamp: value.timestamp, subscriptionId: data.subscription_id,
    customerId: data.customer.customer_id, productId: data.product_id, plan, amount: MONTHLY_CENTS[plan] };
}
