interface ApplyDiscountParams {
  subscriptionId: string;
  discountCode: string;
}

interface PauseSubscriptionParams {
  subscriptionId: string;
  pauseDurationDays: number;
}

const DODO_API_BASE =
  process.env.NEXT_PUBLIC_DODO_ENVIRONMENT === "live_mode"
    ? "https://api.dodopayments.com"
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
   * Apply a discount code to an active subscription
   */
  async applyDiscount({ subscriptionId, discountCode }: ApplyDiscountParams) {
    return this.request(`/subscriptions/${subscriptionId}/discount`, {
      method: "POST",
      body: JSON.stringify({ discount_code: discountCode }),
    });
  }

  /**
   * Pause an active subscription
   */
  async pauseSubscription({ subscriptionId, pauseDurationDays }: PauseSubscriptionParams) {
    return this.request(`/subscriptions/${subscriptionId}/pause`, {
      method: "POST",
      body: JSON.stringify({ pause_duration: pauseDurationDays }),
    });
  }
}

