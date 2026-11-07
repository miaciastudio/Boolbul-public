import { CompareTable } from "@/components/seo/CompareTable";
import { JsonLd } from "@/components/seo/JsonLd";
import { CtaBox, MarketingShell, Prose } from "@/components/seo/MarketingShell";
import { articleLd, breadcrumbLd, pageMetadata } from "@/lib/seo";

const PATH = "/vs/churnkey";
const TITLE = "BoolBul vs Churnkey: A Lightweight Churnkey Alternative for Indie SaaS";
const DESCRIPTION =
  "Churnkey is a full retention platform with plans from $250/month. BoolBul is a lightweight in-app cancellation flow for indie SaaS on Dodo Payments and Stripe from $19/month. An honest side-by-side.";

export const metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION, socialTitle: "BoolBul vs Churnkey — the indie-priced alternative" });

export default function VsChurnkeyPage() {
  return (
    <MarketingShell>
      <JsonLd nodes={[
        articleLd({ path: PATH, headline: TITLE, description: DESCRIPTION, dateModified: "2026-11-08" }),
        breadcrumbLd([{ name: "Home", path: "/" }, { name: "Compare", path: PATH }, { name: "Churnkey", path: PATH }]),
      ]} />
      <article className="mt-10">
        <Prose>
          <p className="font-black uppercase tracking-wide text-crimson">Comparison</p>
          <h1 className="font-sans text-4xl font-black uppercase leading-tight tracking-tight text-pitch md:text-5xl">BoolBul vs Churnkey</h1>
          <p>
            Churnkey is a mature retention platform built for growing subscription companies — cancel flows, failed-payment recovery, analytics
            and experimentation, priced by how much revenue churns. BoolBul does one job for smaller teams: a fast, honest cancellation flow inside
            your app, with flat indie pricing and first-class <strong>Dodo Payments</strong> support.
          </p>
        </Prose>

        <div className="mx-auto mt-8 max-w-4xl">
          <CompareTable them="Churnkey" rows={[
            ["Best for", "Indie and early-stage SaaS (roughly $500–$25k MRR) that want a cancel flow live today", "Growing subscription businesses that want a full retention suite"],
            ["Published pricing", "Pro free for 3 months (first 100 SaaS), then Starter $19/mo or Pro $49/mo, flat", "Starter from $250/mo billed yearly ($300 monthly); Core from $500/mo; Intelligence from $625/mo; Enterprise custom — scales with monthly churned revenue"],
            ["Billing providers", "Dodo Payments, Stripe (more coming soon)", "Stripe, Chargebee, Maxio, Paddle, Braintree, plus a custom integration framework"],
            ["Cancel flow", "Exit survey + reason-matched pause/discount, one-click cancel always visible", "Configurable cancel flows with offers and surveys"],
            ["Beyond cancellation", "Focused on the cancel moment and its ledger", "Broader suite (e.g. payment recovery, analytics, testing) depending on plan"],
            ["Your gateway keys", "Never shared: your server applies offers using signed tokens", "Connected through their provider integrations"],
            ["Source", "Open core (AGPL-3.0) — self-host the core if you want", "Proprietary SaaS"],
            ["If it's down", "Fails open in 1.5 s to your normal cancellation", "See vendor documentation"],
          ]} />
        </div>

        <Prose>
          <h2>When Churnkey is the better choice</h2>
          <ul>
            <li>You bill through Chargebee, Maxio, Paddle or Braintree today.</li>
            <li>You want failed-payment recovery, deep analytics and A/B testing in one vendor, and the budget fits.</li>
            <li>Your churned revenue is large enough that a revenue-scaled plan pays back easily.</li>
          </ul>
          <h2>When BoolBul fits better</h2>
          <ul>
            <li>You&apos;re on Dodo Payments or Stripe and want a cancel flow live this afternoon — script tag plus two server routes.</li>
            <li>$250+/month is more than your whole tool budget; one saved $49 subscriber pays for BoolBul Pro.</li>
            <li>You don&apos;t want to hand gateway access to another vendor, or you want the option to self-host the open-source core.</li>
            <li>You ship a mobile app and need the flow in a WebView with native callbacks.</li>
          </ul>
          <h2>Switching is low-risk</h2>
          <p>
            BoolBul sits on your existing cancel button and fails open, so you can try it on a slice of traffic, compare save rates in the
            dashboard and remove it with one line. Exit reasons use the same values Stripe and Dodo Payments store as cancellation feedback, so your
            historical reporting stays comparable.
          </p>
          <p className="text-xs text-zinc-600">
            Churnkey plans and integrations taken from churnkey.co/pricing (page last updated October 7, 2026), reviewed November 2026. Check their
            site for current pricing. Churnkey is a trademark of its respective owner; BoolBul is not affiliated with Churnkey.
          </p>
        </Prose>
        <CtaBox title="See the indie-priced alternative in action" />
      </article>
    </MarketingShell>
  );
}
