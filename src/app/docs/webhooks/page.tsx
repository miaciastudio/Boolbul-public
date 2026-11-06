import React from "react";
import Link from "next/link";
import { DuctTapeBadge } from "@/components/ui-primitives/DuctTapeBadge";

export const metadata = {
  title: "Billing Webhooks & Dodo Integration | BoolBul Docs",
  description: "How to handle Dodo Payments and Stripe webhooks to execute rescued discounts and pauses.",
};

export default function WebhooksPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b-3 border-pitch pb-4">
        <DuctTapeBadge rotate="none">GATEWAY BACKEND SPEC</DuctTapeBadge>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-pitch">
          Billing Webhooks & Dodo Integration
        </h1>
        <p className="font-mono text-sm text-zinc-700">
          Sync retained subscriptions, discounts, and pause states with Dodo Payments or Stripe.
        </p>
      </div>

      {/* Dodo Payments Integration */}
      <div className="space-y-3 font-mono text-xs">
        <h2 className="text-lg font-black uppercase text-pitch font-sans">1. Dodo Payments Native Execution</h2>
        <p className="text-zinc-700">
          When an offer is accepted, your backend applies the discount code or pauses the subscription directly via Dodo API:
        </p>

        <pre className="p-4 bg-zinc-950 text-lime border-3 border-pitch overflow-x-auto leading-relaxed">
{`// Route: /api/boolbul/claim-offer
import { verifyOfferJwt } from "@boolbul/sdk/server";

export async function POST(req: Request) {
  const { offerJwt } = await req.json();

  // 1. Cryptographically verify the token with your workspace signing secret
  const offer = await verifyOfferJwt(offerJwt, process.env.BOOLBUL_SIGNING_SECRET);

  if (!offer.valid) {
    return new Response("Unauthorized offer token", { status: 403 });
  }

  // 2. Call Dodo Payments API to apply the discount
  if (offer.offerType === "discount") {
    await fetch(\`https://live.dodopayments.com/subscriptions/\${offer.subscriptionId}\`, {
      method: "PATCH",
      headers: {
        "Authorization": \`Bearer \${process.env.DODO_PAYMENTS_API_KEY}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        discount_code: offer.discountCode || "RETAIN50",
      }),
    });
  }

  // 3. Or pause the subscription
  if (offer.offerType === "pause") {
    await fetch(\`https://live.dodopayments.com/subscriptions/\${offer.subscriptionId}\`, {
      method: "PATCH",
      headers: {
        "Authorization": \`Bearer \${process.env.DODO_PAYMENTS_API_KEY}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "paused",
        pause_duration_days: offer.pauseDurationDays || 30,
      }),
    });
  }

  return Response.json({ success: true, status: "rescued" });
}`}
        </pre>
      </div>

      {/* Appwrite Cloud Function Notice */}
      <div className="p-4 bg-white border-3 border-pitch space-y-2 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="font-black text-sm uppercase text-pitch">⚡ Using Appwrite Cloud Functions?</span>
          <span className="bg-lime border border-pitch text-[10px] font-bold px-1.5 py-0.5">READY TEMPLATE</span>
        </div>
        <p className="text-zinc-700">
          We provide a complete, drop-in Appwrite 1.5+ Node.js function template located at <code className="bg-zinc-200 px-1 font-bold">examples/appwrite-dodo-retention/</code> in our repository.
        </p>
      </div>

      <div className="pt-4 flex items-center justify-between border-t-2 border-pitch font-mono text-xs">
        <Link href="/docs/client-sdk" className="font-bold underline text-zinc-600">
          ← Client SDK Reference
        </Link>
        <Link
          href="/docs/ftc-compliance"
          className="border-3 border-pitch bg-lime px-4 py-2 font-black uppercase text-pitch shadow-brutal-sm hover:bg-lime-hover"
        >
          Next: FTC Legal Compliance →
        </Link>
      </div>
    </div>
  );
}

