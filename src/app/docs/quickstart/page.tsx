import Link from "next/link";
import { C, Callout, Code, DocHeader, DocStep } from "@/components/docs/DocBlocks";
import { reactSnippet, scriptSnippet, serverSnippet } from "@/lib/docs/snippets";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/docs/quickstart",
  title: "Quickstart: Add a Cancellation Flow to Your SaaS in 10 Minutes",
  description: "Add an in-app cancellation flow with exit survey, pause and discount offers to your SaaS. Script tag or npm, plus two server routes for Dodo Payments or Stripe.",
});

export default function QuickstartPage() {
  return (
    <div className="space-y-6">
      <DocHeader badge="QUICKSTART" title="Live in about 10 minutes"
        intro={<>Three pieces: a script on your cancel button, two small endpoints on your server, and your secret in an env var. Works with <strong>Dodo Payments</strong> and <strong>Stripe</strong> today; Paddle, Lemon Squeezy, Polar and Chargebee are coming soon.</>} />

      <DocStep n={1} title="Create your workspace">
        <p>
          <Link href="/login?mode=signup" className="font-bold underline">Sign up</Link>, pick your gateway in onboarding and copy your public key (<C>bb_pub_…</C>).
          In <strong>Dashboard → Settings</strong>, rotate once to reveal your signing secret and save it as <C>BOOLBUL_SIGNING_SECRET</C> on your server.
        </p>
        <Callout tone="warn">The signing secret is shown once. It never goes in browser code. Your gateway API key never leaves your server either — BoolBul doesn&apos;t need it.</Callout>
      </DocStep>

      <DocStep n={2} title="Open BoolBul from your cancel button">
        <p>Plain HTML / any framework:</p>
        <Code label="index.html">{scriptSnippet()}</Code>
        <p>React / Next.js (<C>npm install @boolbul/sdk</C>):</p>
        <Code label="CancelButton.tsx">{reactSnippet()}</Code>
        <p>If BoolBul can&apos;t answer within <strong>1.5 seconds</strong>, it steps aside and calls <C>onCancel</C> so your normal cancellation still runs.</p>
      </DocStep>

      <DocStep n={3} title="Apply offers and cancellations on your server">
        <p>The widget hands you a short-lived signed <C>offerJwt</C>. Verify it with your secret, then let the adapter call your gateway:</p>
        <Code label="Dodo Payments">{serverSnippet("dodo_payments")}</Code>
        <details className="border-3 border-pitch bg-white p-3">
          <summary className="cursor-pointer font-black uppercase">Using Stripe instead?</summary>
          <div className="mt-3"><Code label="Stripe">{serverSnippet("stripe")}</Code></div>
        </details>
      </DocStep>

      <DocStep n={4} title="Check it works">
        <ul className="list-disc space-y-1 pl-5">
          <li>Use a test subscription (Dodo <C>test_mode</C> / Stripe test keys) and click your cancel button.</li>
          <li>Pick a reason, accept an offer — the subscription should show the discount or the new billing date.</li>
          <li>Open your <Link href="/dashboard" className="font-bold underline">dashboard</Link>: the session appears in the ledger with its reason and saved MRR.</li>
          <li>Tweak copy and colors in the <Link href="/dashboard/customizer" className="font-bold underline">customizer</Link> — changes go live within about a minute.</li>
        </ul>
      </DocStep>

      <div className="flex flex-wrap gap-3 border-t-2 border-pitch pt-5 font-mono text-sm font-bold">
        <Link href="/docs/client-sdk" className="underline">Client SDK reference →</Link>
        <Link href="/docs/server-adapters" className="underline">Server SDK & gateways →</Link>
        <Link href="/docs/mobile-apps" className="underline">Mobile apps →</Link>
      </div>
    </div>
  );
}
