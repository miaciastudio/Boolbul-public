import { JsonLd } from "@/components/seo/JsonLd";
import { CtaBox, MarketingShell, Prose } from "@/components/seo/MarketingShell";
import { articleLd, breadcrumbLd, faqLd, pageMetadata } from "@/lib/seo";

const PATH = "/compliance/ftc-click-to-cancel";
const TITLE = "FTC Click-to-Cancel in 2026: Where the Rule Stands and How to Build a Compliant Cancel Flow";
const DESCRIPTION =
  "Plain-English guide for SaaS founders: what happened to the FTC's click-to-cancel rule, which laws still apply (ROSCA, FTC Act, state auto-renewal laws) and a practical checklist for an easy, honest cancellation flow with retention offers.";

const FAQ = [
  { q: "Is the FTC click-to-cancel rule in effect in 2026?", a: "No. The FTC's 2024 amendments to the Negative Option Rule were vacated by the U.S. Court of Appeals for the Eighth Circuit on July 8, 2025, on procedural grounds. In March 2026 the FTC published an advance notice of proposed rulemaking to restart the process; no replacement rule has been adopted as of November 2026." },
  { q: "So can I make cancelling hard?", a: "No. The FTC continues to bring cases under the Restore Online Shoppers' Confidence Act (ROSCA) and Section 5 of the FTC Act, and many states have their own automatic-renewal laws, including California's. A simple, prominent way to cancel online remains the safe default." },
  { q: "Can I show a retention offer before someone cancels?", a: "Generally yes, if it doesn't obstruct cancellation: the cancel option should stay clear and immediately available, and the customer shouldn't have to sit through repeated offers. State rules differ, so check the laws where your customers live." },
];

export const metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION, socialTitle: "FTC click-to-cancel in 2026: a founder's guide" });

export default function FtcClickToCancelPage() {
  return (
    <MarketingShell>
      <JsonLd nodes={[
        articleLd({ path: PATH, headline: TITLE, description: DESCRIPTION, dateModified: "2026-11-08" }),
        faqLd(FAQ),
        breadcrumbLd([{ name: "Home", path: "/" }, { name: "Compliance", path: PATH }, { name: "FTC click-to-cancel", path: PATH }]),
      ]} />
      <article className="mt-10">
        <Prose>
          <p className="font-black uppercase tracking-wide text-crimson">Compliance guide · Last reviewed November 8, 2026</p>
          <h1 className="font-sans text-4xl font-black uppercase leading-tight tracking-tight text-pitch md:text-5xl">FTC click-to-cancel in 2026</h1>
          <p className="border-3 border-pitch bg-amber-100 p-3 text-sm">
            This is general information for founders, not legal advice. Laws change and vary by state and country — have counsel review your
            own flow.
          </p>

          <h2>The short version</h2>
          <ul>
            <li>The FTC finalized &quot;click-to-cancel&quot; amendments to its Negative Option Rule in late 2024.</li>
            <li>On <strong>July 8, 2025</strong>, the U.S. Court of Appeals for the Eighth Circuit <strong>vacated</strong> those amendments because of procedural problems in how they were adopted — not a ruling that easy cancellation is bad policy.</li>
            <li>On <strong>March 11, 2026</strong>, the FTC issued an advance notice of proposed rulemaking (ANPRM) asking whether to amend or replace the Negative Option Rule. That is an early step; no new rule is in force.</li>
            <li>Meanwhile the FTC keeps enforcing <strong>ROSCA</strong> and <strong>Section 5</strong> of the FTC Act against hard-to-cancel subscriptions, and about 30 states have automatic-renewal laws of their own.</li>
          </ul>

          <h2>What still applies to a SaaS subscription</h2>
          <h3>ROSCA</h3>
          <p>For online subscriptions, ROSCA requires clear disclosure of terms, express informed consent before charging, and simple mechanisms to stop recurring charges.</p>
          <h3>FTC Act, Section 5</h3>
          <p>Unfair or deceptive practices — hidden cancel buttons, endless loops, misleading copy — can be challenged regardless of any specific cancellation rule.</p>
          <h3>State automatic-renewal laws</h3>
          <p>
            California&apos;s automatic renewal law was updated effective July 1, 2025 and requires an online way to cancel for customers who signed up
            online, with limits on how save offers can be presented. Other states have similar statutes. If you sell nationally, design for the
            strictest common denominator.
          </p>

          <h2>A practical checklist for your cancel flow</h2>
          <ol>
            <li><strong>Same channel, same effort.</strong> If customers can subscribe in your app, let them cancel in your app — no phone calls or emails required.</li>
            <li><strong>Cancel is always visible.</strong> A clear “Cancel subscription” control on every step, high contrast, never disabled or hidden behind scrolling.</li>
            <li><strong>Offers don&apos;t block.</strong> One relevant offer is fine; mandatory multi-step gauntlets are not. Declining must be one click.</li>
            <li><strong>No shaming copy.</strong> “No thanks, cancel my subscription” — not “No, I hate saving money”.</li>
            <li><strong>Surveys are optional to completing cancellation.</strong> Ask, but don&apos;t hold the cancel button hostage to an answer.</li>
            <li><strong>Confirm it.</strong> Show that cancellation went through and when access ends; send a confirmation email.</li>
            <li><strong>Fail open.</strong> If any retention tool is slow or down, the customer must still be able to cancel.</li>
            <li><strong>Keep records.</strong> Log what was shown, what was chosen and when — useful for disputes and audits.</li>
          </ol>

          <h2>How BoolBul is built around this</h2>
          <ul>
            <li>The cancel link is rendered on every screen of the flow, single-click, and meets WCAG AA contrast in every theme.</li>
            <li>Custom cancel labels that hide or shame the cancellation are automatically replaced with a plain default.</li>
            <li>Offers are matched to the stated reason and shown once; declining is one click.</li>
            <li>If BoolBul doesn&apos;t respond within 1.5 seconds, it steps aside and your normal cancellation runs.</li>
            <li>Every session is logged with its outcome and reason in your dashboard ledger, exportable as CSV.</li>
          </ul>
          <p>
            BoolBul helps you build a fair flow, but compliance depends on your whole signup, disclosure and billing experience — tooling alone
            can&apos;t guarantee it.
          </p>

          <h2>FAQ</h2>
          {FAQ.map((f) => (
            <div key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}

          <h2>Sources</h2>
          <ul className="text-sm">
            <li><a href="https://www.sidley.com/en/insights/newsupdates/2026/02/us-ftc-signals-renewed-interest-in-click-to-cancel-rulemaking" rel="nofollow noopener" target="_blank">Sidley — U.S. FTC signals renewed interest in click-to-cancel rulemaking</a></li>
            <li><a href="https://www.crowell.com/en/insights/client-alerts/clicking-all-the-right-boxes-ftc-moves-to-revive-click-to-cancel-rule-following-eighth-circuit-vacatur" rel="nofollow noopener" target="_blank">Crowell — FTC moves to revive click-to-cancel rule following Eighth Circuit vacatur</a></li>
            <li><a href="https://www.jonesday.com/en/insights/2026/05/ftc-revives-clicktocancel-rule-new-risks-for-subscription-businesses" rel="nofollow noopener" target="_blank">Jones Day — FTC revives click-to-cancel rule</a></li>
            <li><a href="https://www.ftc.gov" rel="nofollow noopener" target="_blank">Federal Trade Commission</a> — check the Federal Register for the current status of any rulemaking.</li>
          </ul>
        </Prose>
        <CtaBox title="Ship a fair cancel flow in minutes" text="Exit survey, reason-matched offers and a cancel link that's always one click away." />
      </article>
    </MarketingShell>
  );
}
