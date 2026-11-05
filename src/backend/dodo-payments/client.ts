import "server-only";
import { BillingError, MONTHLY_CENTS, providerId, record, requiredSetting, sandboxEnvironment, validateCheckoutUrl, type BillingPlan } from "./config";

interface UpdateSubscriptionParams {
  subscriptionId: string;
  status?: "active" | "paused" | "cancelled";
  discountCode?: string;
  metadata?: Record<string, string>;
}

interface ChangePlanParams {
  subscriptionId: string;
  productId: string;
  discountCode?: string;
}

function absentOrZero(value: unknown): boolean {
  return value === undefined || value === null || value === 0;
}

export function validateProduct(value: unknown, productId: string, plan: BillingPlan): void {
  const price = record(value) && record(value.price) ? value.price : null;
  if (!record(value) || value.product_id !== productId || value.is_recurring !== true || !price ||
      price.type !== "recurring_price" || price.price !== MONTHLY_CENTS[plan] || price.currency !== "USD" ||
      price.payment_frequency_count !== 1 || price.payment_frequency_interval !== "Month" ||
      !absentOrZero(price.discount) || !absentOrZero(price.discount_bps) ||
      !absentOrZero(price.trial_period_days) || !absentOrZero(price.trial_amount) ||
      price.tax_inclusive === true || price.purchasing_power_parity === true ||
      price.pay_what_you_want === true) {
    throw new BillingError("invalid_billing_product", 503, "Configure the selected sandbox product with its exact USD monthly price, no discounts or trial, and tax-exclusive pricing.");
  }
}

export class DodoPaymentsClient {
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    sandboxEnvironment();
    this.apiKey = apiKey?.trim() || requiredSetting("DODO_PAYMENTS_API_KEY");
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    try {
      const response = await fetch(`https://test.dodopayments.com${endpoint}`, {
        ...options,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error();
      return await response.json() as unknown;
    } catch {
      throw new BillingError("provider_unavailable", 503, "Billing provider unavailable. If checkout was started, ask the operator to reconcile it before trying again.");
    }
  }

  async verifyProduct(productId: string, plan: BillingPlan): Promise<void> {
    if (!providerId(productId)) throw new BillingError("invalid_billing_product", 503, "Configure a valid sandbox product.");
    validateProduct(await this.request(`/products/${encodeURIComponent(productId)}`), productId, plan);
  }

  async createCustomer(name: string, email: string): Promise<string> {
    const customer = await this.request("/customers", { method: "POST", body: JSON.stringify({ name, email }) });
    if (!record(customer) || !providerId(customer.customer_id) || customer.email !== email) {
      throw new BillingError("provider_response", 503, "Customer creation needs operator reconciliation before another checkout.");
    }
    return customer.customer_id;
  }

  async createCheckout(productId: string, customerId: string, returnUrl: string): Promise<{ sessionId: string; url: string }> {
    const result = await this.request("/checkouts", {
      method: "POST",
      body: JSON.stringify({
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: { customer_id: customerId },
        billing_currency: "USD",
        return_url: returnUrl,
        feature_flags: {
          allow_currency_selection: false,
          allow_discount_code: false,
          allow_customer_editing_email: false,
          allow_customer_editing_name: false,
          allow_editing_addons: false,
        },
      }),
    });
    if (!record(result) || !providerId(result.session_id)) {
      throw new BillingError("provider_response", 503, "Checkout creation needs operator reconciliation before another attempt.");
    }
    return { sessionId: result.session_id, url: validateCheckoutUrl(result.checkout_url) };
  }

  async updateSubscription({ subscriptionId, status, discountCode, metadata }: UpdateSubscriptionParams): Promise<unknown> {
    return this.request(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: "PATCH",
      body: JSON.stringify({ ...(status ? { status } : {}), ...(discountCode ? { discount_code: discountCode } : {}), ...(metadata ? { metadata } : {}) }),
    });
  }

  async pauseSubscription(subscriptionId: string, pauseDurationDays = 30): Promise<unknown> {
    return this.updateSubscription({ subscriptionId, status: "paused", metadata: {
      pause_duration_days: String(pauseDurationDays), paused_by: "boolbul_retention_interceptor", paused_at: new Date().toISOString(),
    } });
  }

  async changePlan({ subscriptionId, productId, discountCode }: ChangePlanParams): Promise<unknown> {
    return this.request(`/subscriptions/${encodeURIComponent(subscriptionId)}/change-plan`, {
      method: "POST", body: JSON.stringify({ product_id: productId, ...(discountCode ? { discount_code: discountCode } : {}) }),
    });
  }
}
