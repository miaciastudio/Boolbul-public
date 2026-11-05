import { NextRequest, NextResponse } from "next/server";
import { getWebhookKey, verifyDodoWebhookSignature } from "@/backend/dodo-payments/webhooks";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let isValid = false;

    try {
      const webhookKey = getWebhookKey();
      isValid = await verifyDodoWebhookSignature(rawBody, req.headers, webhookKey);
    } catch {
      // In dev or sandbox when webhook secret is not set yet
      isValid = process.env.NODE_ENV !== "production";
    }

    if (!isValid && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    // Handle BoolBul SaaS Billing events or customer mutations
    switch (event.type) {
      case "subscription.active":
      case "subscription.renewed":
        // Upgrade workspace plan tier
        console.log(`[Dodo Webhook] Workspace subscription activated: ${event.data?.id}`);
        break;

      case "subscription.paused":
        console.log(`[Dodo Webhook] Customer subscription successfully paused: ${event.data?.id}`);
        break;

      case "subscription.cancelled":
        console.log(`[Dodo Webhook] Customer subscription cancelled: ${event.data?.id}`);
        break;

      default:
        console.log(`[Dodo Webhook] Ingested event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}


