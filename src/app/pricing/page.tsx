import { PricingCards } from "@/components/website-pages/PricingCards";
import { FaqSection } from "@/components/seo/FaqSection";
import { JsonLd } from "@/components/seo/JsonLd";
import { MarketingShell } from "@/components/seo/MarketingShell";
import { FAQS } from "@/lib/faq";
import { breadcrumbLd, faqLd, pageMetadata, softwareApplicationLd } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/pricing",
  title: "Pricing — Cancellation Flow for SaaS from $19/mo (3 Months Free Beta)",
  socialTitle: "BoolBul pricing: $19 Starter, $49 Pro — first 100 SaaS free for 3 months",
  description:
    "Simple BoolBul pricing: Starter $19/month for up to 500 saved subscribers, Pro $49/month unlimited. The first 100 approved SaaS founders get Pro free for 3 months, no credit card.",
});

export default function PricingPage() {
  return (
    <MarketingShell>
      <JsonLd nodes={[softwareApplicationLd, faqLd(FAQS), breadcrumbLd([{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing" }])]} />
      <h1 className="mt-10 text-4xl font-black uppercase leading-tight tracking-tight text-pitch md:text-6xl">
        Pricing that pays for itself <span className="inline-block border-3 border-pitch bg-lime px-2">after one save</span>
      </h1>
      <p className="mt-4 max-w-2xl font-mono text-sm leading-relaxed text-zinc-800">
        Flat monthly plans, no revenue share, no per-seat tax. Saving a single $49 subscriber covers Pro for a month.
      </p>
      <PricingCards />
      <FaqSection heading="Pricing & product FAQ" />
    </MarketingShell>
  );
}
