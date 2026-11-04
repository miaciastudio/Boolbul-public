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

const DODO_API_BASE =
  process.env.NEXT_PUBLIC_DODO_ENVIRONMENT === "live_mode"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";

export class DodoPaymentsClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.DODO_PAYMENTS_API_KEY || "";
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const res = await fetch(`${DODO_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Dodo API Error [${res.status}]: ${errorText}`);
    }

    return res.json();
  }

  /**
   * Update subscription properties (e.g. status, metadata, or discount code)
   * Official Endpoint: PATCH /subscriptions/{id}
   */
  async updateSubscription({
    subscriptionId,
    status,
    discountCode,
    metadata,
  }: UpdateSubscriptionParams) {
    const payload: Record<string, any> = {};
    if (status) payload.status = status;
    if (discountCode) payload.discount_code = discountCode;
    if (metadata) payload.metadata = metadata;

    return this.request(`/subscriptions/${subscriptionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Pause an active subscription using Dodo status mutation
   */
  async pauseSubscription(subscriptionId: string, pauseDurationDays: number = 30) {
    return this.updateSubscription({
      subscriptionId,
      status: "paused",
      metadata: {
        pause_duration_days: String(pauseDurationDays),
        paused_by: "boolbul_retention_interceptor",
        paused_at: new Date().toISOString(),
      },
    });
  }

  /**
   * Change subscription plan (e.g. downgrade to lower tier or apply rescue tier)
   * Official Endpoint: POST /subscriptions/{id}/change-plan
   */
  async changePlan({
    subscriptionId,
    productId,
    discountCode,
  }: ChangePlanParams) {
    return this.request(`/subscriptions/${subscriptionId}/change-plan`, {
      method: "POST",
      body: JSON.stringify({
        product_id: productId,
        ...(discountCode ? { discount_code: discountCode } : {}),
      }),
    });
  }
}
