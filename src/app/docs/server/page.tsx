import { C, Callout, Code, DocHeader, DocStep, Table } from "@/components/docs/DocBlocks";
import { serverSnippet } from "@/lib/docs/snippets";

export const metadata = {
  title: "Server SDK: Dodo Payments & Stripe | BoolBul Docs",
  description: "Verify BoolBul offer tokens and apply pauses, discounts and cancellations with Dodo Payments or Stripe from your own server.",
};

export default function ServerDocsPage() {
  return (
    <div className="space-y-6">
      <DocHeader badge="SERVER SDK" title="Verify & apply offers"
        intro={<><C>@boolbul/sdk/server</C> runs on your backend (Node 18+, Bun, Deno, Cloudflare Workers, Vercel Edge). It has zero dependencies and talks to your gateway directly — BoolBul never sees your gateway keys.</>} />

      <DocStep title="How trust works">
        <ol className="list-decimal space-y-1 pl-5">
          <li>The widget asks BoolBul&apos;s edge for a session; the customer picks an offer.</li>
          <li>The edge signs an <C>offerJwt</C> with <strong>your</strong> signing secret: subscription, offer terms, single-use nonce, 5-minute expiry.</li>
          <li>Your server verifies it, checks the subscription belongs to the logged-in user, and only then calls Dodo or Stripe.</li>
        </ol>
        <Callout>A customer can&apos;t forge or enlarge an offer: changing any byte breaks the signature, and rescues are only counted after a successful edge claim.</Callout>
      </DocStep>

      <DocStep title="One-call integration">
        <Code label="Dodo Payments">{serverSnippet("dodo_payments")}</Code>
        <Code label="Stripe (only the gateway line changes)">{`const gateway = { gateway: "stripe", secretKey: process.env.STRIPE_SECRET_KEY! } as const;`}</Code>
      </DocStep>

      <DocStep title="What each gateway does">
        <Table head={["Action", "Dodo Payments", "Stripe"]} rows={[
          ["Pause N days", <span key="d1">Moves <C>next_billing_date</C> N days later (no charge, access kept, nothing to resume). Opt into Dodo&apos;s native <C>status: &quot;paused&quot;</C> with <C>pauseStrategy: &quot;status_paused&quot;</C> and call <C>resumeDodoSubscription</C> later.</span>,
            <span key="s1"><C>pause_collection</C> with <C>behavior: void</C> and <C>resumes_at</C> — auto-resumes, access kept.</span>],
          ["Discount X% for M months", <span key="d2">Creates a single-use, product-restricted code (<C>subscription_cycles: M</C>) and re-applies the same product via Change Plan with <C>do_not_bill</C>.</span>,
            <span key="s2">Creates a single-use coupon (<C>repeating</C>, <C>duration_in_months: M</C>) and adds it to <C>discounts</C>, keeping existing ones.</span>],
          ["Cancel", <span key="d3"><C>cancel_at_next_billing_date</C> + <C>cancellation_feedback</C> + comment (or immediate).</span>,
            <span key="s3"><C>cancel_at_period_end</C> + <C>cancellation_details.feedback</C> + comment (or immediate).</span>],
        ]} />
        <Callout tone="warn">Dodo has no direct “add discount to subscription” endpoint yet, so the discount path uses Change Plan on the same product. Try it once with a <C>test_mode</C> subscription before going live.</Callout>
      </DocStep>

      <DocStep title="Lower-level helpers">
        <Code>{`import {
  verifyOffer,                    // (jwt, secret, { expected, seenNonce }) -> VerifiedOffer
  applyDodoOffer, applyStripeOffer,
  pauseDodoSubscription, resumeDodoSubscription, applyDodoDiscount, cancelDodoSubscription,
  pauseStripeSubscription, applyStripeDiscount, cancelStripeSubscription,
  OfferVerificationError, GatewayError,
} from "@boolbul/sdk/server";`}</Code>
        <p><C>OfferVerificationError.code</C> is one of <C>malformed</C>, <C>bad_signature</C>, <C>expired</C>, <C>invalid_claims</C>, <C>identity_mismatch</C>, <C>replayed</C>. <C>GatewayError</C> carries the gateway&apos;s HTTP status and body.</p>
      </DocStep>

      <DocStep title="Your own billing webhooks">
        <p>Keep your existing Dodo / Stripe webhooks as the source of truth for access. Paused and discounted subscriptions emit their normal events (<C>subscription.updated</C> on Dodo, <C>customer.subscription.updated</C> on Stripe), so no BoolBul-specific webhook handling is required.</p>
      </DocStep>
    </div>
  );
}
