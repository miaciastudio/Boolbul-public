/**
 * Appwrite Cloud Function: Dodo Payments Retention & Exit Webhook Handler
 * 
 * Powered by BoolBul (https://boolbul.com)
 * Intercepts subscription cancellations, verifies edge tokens, and deflects churn.
 */

export interface AppwriteContext {
  req: {
    bodyText: string;
    bodyJson: any;
    headers: Record<string, string>;
    method: string;
    url: string;
  };
  res: {
    json: (data: any, statusCode?: number) => any;
    text: (text: string, statusCode?: number) => any;
    empty: () => any;
  };
  log: (message: any) => void;
  error: (message: any) => void;
}

export interface DodoWebhookEvent {
  type: string;
  data: {
    id?: string;
    subscription_id?: string;
    customer_id?: string;
    metadata?: Record<string, any>;
    status?: string;
  };
}

/**
 * Validates whether a claimed offer JWT is authentic against BoolBul Edge
 */
export async function verifyOfferWithBoolBul(
  offerJwt: string,
  edgeUrl: string,
  signingSecret: string
): Promise<{ verified: boolean; payload?: any; error?: string }> {
  try {
    const res = await fetch(`${edgeUrl}/api/v1/intercept/claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${signingSecret}`,
      },
      body: JSON.stringify({ offerJwt }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return { verified: false, error: `Edge verification failed with status ${res.status}` };
    }

    const data = await res.json();
    return { verified: true, payload: data };
  } catch (err: any) {
    return { verified: false, error: err.message };
  }
}

/**
 * Main Appwrite Function Entrypoint
 */
export default async function handleRetentionWebhook({ req, res, log, error }: AppwriteContext) {
  // 1. Health check & preflight
  if (req.method === "GET") {
    return res.json({
      status: "ok",
      service: "appwrite-dodo-retention",
      poweredBy: "BoolBul (boolbul.com)",
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    return res.json({ error: "Method not allowed. Use POST." }, 405);
  }

  try {
    const payload: DodoWebhookEvent = typeof req.bodyJson === "object" && req.bodyJson !== null
      ? req.bodyJson
      : JSON.parse(req.bodyText || "{}");

    const edgeUrl = process.env.BOOLBUL_EDGE_URL || "https://boolbul.com";
    const signingSecret = process.env.BOOLBUL_SIGNING_SECRET || "";
    const eventType = payload.type || req.headers["x-dodo-event"] || "unknown";

    log(`[Retention] Ingested webhook event: ${eventType}`);

    // 2. Intercept Cancellation Event
    if (eventType === "subscription.cancelled" || eventType === "subscription.cancellation_requested") {
      const subscriptionId = payload.data?.subscription_id || payload.data?.id;
      const customerId = payload.data?.customer_id;
      const offerJwt = payload.data?.metadata?.boolbul_offer_jwt;

      // Check if user claimed an in-app rescue package
      if (offerJwt) {
        log(`[Retention] Found claimed offer JWT for subscription: ${subscriptionId}. Verifying with BoolBul Edge...`);
        const verification = await verifyOfferWithBoolBul(offerJwt, edgeUrl, signingSecret);

        if (verification.verified) {
          log(`[Retention] Offer successfully verified! Deflecting cancellation for customer: ${customerId}`);

          return res.json({
            status: "rescued",
            retained: true,
            action: "cancellation_aborted",
            offer: verification.payload,
            message: "Customer accepted in-app retention rescue package.",
          }, 200);
        } else {
          error(`[Retention] Token verification rejected: ${verification.error}`);
        }
      }

      // FTC-Compliant Clean Exit: Proceed with cancellation
      log(`[Retention] No valid retention offer claimed. Finalizing cancellation for subscription: ${subscriptionId}`);
      return res.json({
        status: "cancelled",
        retained: false,
        action: "subscription_terminated",
        subscriptionId,
        message: "Cancellation confirmed pursuant to FTC Click-to-Cancel compliance.",
      }, 200);
    }

    // 3. Subscription Paused Event
    if (eventType === "subscription.paused") {
      log(`[Retention] Subscription paused event confirmed: ${payload.data?.id}`);
      return res.json({
        status: "paused",
        retained: true,
        action: "billing_frozen",
        subscriptionId: payload.data?.id,
      }, 200);
    }

    // Default Fallthrough for other Dodo events
    return res.json({ received: true, eventType }, 200);
  } catch (err: any) {
    error(`[Retention] Unhandled exception: ${err.message}`);
    return res.json({ error: err.message }, 400);
  }
}

