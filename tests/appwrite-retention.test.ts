import { describe, it, expect, vi } from "vitest";
import handleRetentionWebhook, { AppwriteContext } from "../examples/appwrite-dodo-retention/src/main";

describe("Appwrite Cloud Function: Dodo Retention Webhook Handler", () => {
  function createMockContext(method: string, bodyJson: any = null, headers: Record<string, string> = {}): {
    ctx: AppwriteContext;
    response: { data: any; status: number };
    logs: string[];
    errors: string[];
  } {
    const logs: string[] = [];
    const errors: string[] = [];
    const response = { data: null as any, status: 200 };

    const ctx: AppwriteContext = {
      req: {
        method,
        bodyText: bodyJson ? JSON.stringify(bodyJson) : "",
        bodyJson,
        headers,
        url: "https://cloud.appwrite.io/v1/functions/boolbul-dodo-retention/executions",
      },
      res: {
        json: (data: any, statusCode: number = 200) => {
          response.data = data;
          response.status = statusCode;
          return response;
        },
        text: (text: string, statusCode: number = 200) => {
          response.data = text;
          response.status = statusCode;
          return response;
        },
        empty: () => {
          response.status = 204;
          return response;
        },
      },
      log: (msg: any) => logs.push(String(msg)),
      error: (msg: any) => errors.push(String(msg)),
    };

    return { ctx, response, logs, errors };
  }

  it("GET returns healthcheck status with 200 OK", async () => {
    const { ctx, response } = createMockContext("GET");
    await handleRetentionWebhook(ctx);

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("ok");
    expect(response.data.service).toBe("appwrite-dodo-retention");
    expect(response.data.poweredBy).toContain("BoolBul");
  });

  it("POST on subscription.cancelled without offer performs FTC-compliant clean exit", async () => {
    const payload = {
      type: "subscription.cancelled",
      data: {
        id: "sub_12345",
        customer_id: "cus_67890",
      },
    };

    const { ctx, response } = createMockContext("POST", payload);
    await handleRetentionWebhook(ctx);

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("cancelled");
    expect(response.data.retained).toBe(false);
    expect(response.data.action).toBe("subscription_terminated");
    expect(response.data.message).toContain("FTC Click-to-Cancel compliance");
  });

  it("POST on subscription.cancelled with claimed offer JWT aborts cancellation", async () => {
    // Mock global fetch for edge verification
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tenantId: "t_test",
        offerType: "discount",
        offerValue: 5000,
        nonce: "test-nonce-123",
      }),
    } as Response);

    const payload = {
      type: "subscription.cancelled",
      data: {
        id: "sub_12345",
        customer_id: "cus_67890",
        metadata: {
          boolbul_offer_jwt: "mock.jwt.token",
        },
      },
    };

    const { ctx, response } = createMockContext("POST", payload);
    await handleRetentionWebhook(ctx);

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("rescued");
    expect(response.data.retained).toBe(true);
    expect(response.data.action).toBe("cancellation_aborted");
    expect(response.data.offer.offerType).toBe("discount");
  });

  it("POST on subscription.paused freezes billing and records retained status", async () => {
    const payload = {
      type: "subscription.paused",
      data: {
        id: "sub_pause_123",
        customer_id: "cus_pause_456",
      },
    };

    const { ctx, response } = createMockContext("POST", payload);
    await handleRetentionWebhook(ctx);

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("paused");
    expect(response.data.retained).toBe(true);
    expect(response.data.action).toBe("billing_frozen");
  });
});

