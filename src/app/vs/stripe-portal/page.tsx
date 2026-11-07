import { CompareTable } from "@/components/seo/CompareTable";
import { JsonLd } from "@/components/seo/JsonLd";
import { CtaBox, MarketingShell, Prose } from "@/components/seo/MarketingShell";
import { articleLd, breadcrumbLd, pageMetadata } from "@/lib/seo";

const PATH = "/vs/stripe-portal";
const TITLE = "BoolBul vs Stripe Customer Portal: In-App Cancellation Flow vs Hosted Portal";
const DESCRIPTION =
  "Should cancelling customers leave your app for Stripe's hosted portal, or stay in-app with an exit survey and reason-matched pause or discount offers? An honest comparison of BoolBul and the Stripe customer portal.";

export const metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION, socialTitle: "In-app cancellation vs Stripe's hosted portal" });

export default function VsStripePortalPage() {
  return (
    <MarketingShell>
      <JsonLd nodes={[
        articleLd({ path: PATH, headline: TITLE, description: DESCRIPTION, dateModified: "2026-11-08" }),
        breadcrumbLd([{ name: "Home", path: "/" }, { name: "Compare", path: PATH }, { name: "Stripe customer portal", path: PATH }]),
      ]} />
      <article className="mt-10">
        <Prose>
          <p className="font-black uppercase tracking-wide text-crimson">Comparison</p>
          <h1 className="font-sans text-4xl font-black uppercase leading-tight tracking-tight text-pitch md:text-5xl">In-app cancellation vs the Stripe customer portal</h1>
          <p>
            Stripe&apos;s customer portal is a solid, free, Stripe-hosted page where customers manage billing — including cancelling. BoolBul is a
            drop-in cancellation flow that runs <strong>inside your own app</strong>, asks why the customer is leaving, and offers the fix that matches
            their reason before they go. Here&apos;s how they differ, and when each one is the right call.
          </p>
        </Prose>

        <div className="mx-auto mt-8 max-w-4xl">
          <CompareTable them="Stripe customer portal" rows={[
            ["Where it happens", "Inside your app (modal on desktop, bottom sheet on phones), your branding and copy", "A Stripe-hosted page the customer is redirected to, with Stripe's portal branding settings"],
            ["Billing providers", "Dodo Payments and Stripe (Paddle, Lemon Squeezy, Polar, Chargebee coming soon)", "Stripe only"],
            ["Exit survey", "One-tap reasons asked first, mapped 1:1 to Stripe cancellation feedback; offers adapt to the answer", "Optional reason list collected as part of cancelling, stored on the subscription"],
            ["Retention offers", "Discount or pause, ranked by reason (e.g. “not using it” sees pause first)", "One retention coupon configured in portal settings; pause can be enabled separately"],
            ["Way out", "One-click cancel link on every screen, high-contrast, never hidden", "Cancel flow inside the portal"],
            ["Mobile apps", "Hosted WebView page with a message bridge for React Native, Flutter, iOS and Android", "Opens the hosted portal URL in a browser or WebView"],
            ["Analytics", "Saved MRR, save rate, top exit reasons and a CSV ledger in your BoolBul dashboard", "Reasons on each subscription, Sigma queries and webhooks"],
            ["If it's down", "Fails open in 1.5 s: your normal cancellation runs", "Customers wait for or retry the hosted page"],
            ["Price", "Pro free for 3 months for the first 100 SaaS, then $19 or $49 / month", "Included with Stripe Billing"],
          ]} />
        </div>

        <Prose>
          <h2>Why keep the cancel flow in your app?</h2>
          <p>
            A redirect is a context switch: the customer leaves your product, lands on a generic billing page, and the only thing between them and
            “Cancel” is a single coupon. Inside your app you can show your own words, match the offer to the reason (a pause for someone who&apos;s
            not using it this month, a discount for someone who finds it too expensive) and record every answer next to the MRR it represents.
          </p>
          <h2>When the Stripe portal is enough</h2>
          <ul>
            <li>You only bill with Stripe and are happy with one generic retention coupon.</li>
            <li>You need customers to update cards, download invoices and change plans in one hosted place — BoolBul doesn&apos;t replace that.</li>
            <li>You have very few cancellations and no time to add two server routes.</li>
          </ul>
          <p>Many teams use both: the portal for invoices and payment methods, BoolBul on the “Cancel subscription” button.</p>

          <h2>How BoolBul applies offers on Stripe</h2>
          <p>
            Your server verifies a signed, single-use offer token and then calls Stripe with your own key: <code>pause_collection</code> with an
            automatic <code>resumes_at</code> for pauses, a single-use coupon added to the subscription&apos;s <code>discounts</code> for discounts, and{" "}
            <code>cancel_at_period_end</code> with <code>cancellation_details.feedback</code> for cancellations. See the{" "}
            <a href="/docs/server-adapters">server adapters guide</a>.
          </p>
          <p className="text-xs text-zinc-600">Stripe features described from Stripe&apos;s public documentation, reviewed November 2026.</p>
        </Prose>
        <CtaBox />
      </article>
    </MarketingShell>
  );
}
