import "server-only";

export type BillingPlan = "starter" | "pro";
export type BillingMode = "test_mode" | "live_mode";
export const MONTHLY_CENTS = { starter: 1900, pro: 4900 } as const;

export class BillingError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string) {
    super(message);
    this.name = "BillingError";
  }
}

export function configurationError(variable: string): BillingError {
  return new BillingError("billing_configuration", 503, `Billing is unavailable. Ask the operator to configure ${variable} for sandbox billing.`);
}

export function requiredSetting(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw configurationError(name);
  return value;
}

export function sandboxEnvironment(): "test_mode" {
  if (requiredSetting("DODO_PAYMENTS_ENVIRONMENT") !== "test_mode") {
    throw configurationError("DODO_PAYMENTS_ENVIRONMENT=test_mode (live billing is not supported)");
  }
  return "test_mode";
}

export function providerId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(value);
}

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getBillingConfig() {
  const environment = sandboxEnvironment();
  const starter = requiredSetting("DODO_STARTER_PRODUCT_ID");
  const pro = requiredSetting("DODO_PRO_PRODUCT_ID");
  if (!providerId(starter) || !providerId(pro) || starter === pro) {
    throw configurationError("distinct DODO_STARTER_PRODUCT_ID and DODO_PRO_PRODUCT_ID");
  }
  return { environment, products: { starter, pro } };
}

export function validateCheckoutUrl(value: unknown): string {
  try {
    if (typeof value !== "string" || /[\\\s]/.test(value)) throw new Error();
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "test.checkout.dodopayments.com" ||
        url.port || url.username || url.password || url.hash) throw new Error();
    return url.href;
  } catch {
    throw new BillingError("provider_response", 503, "Billing returned an invalid checkout link. Ask the operator to reconcile this attempt.");
  }
}
