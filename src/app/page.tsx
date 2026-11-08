import { Navbar } from "@/components/website-pages/Navbar";
import { HeroSection } from "@/components/website-pages/HeroSection";
import { PricingCards } from "@/components/website-pages/PricingCards";
import { Footer } from "@/components/website-pages/Footer";
import { BetaBanner } from "@/components/website-pages/BetaBanner";
import { LaunchVideo, launchVideoLd } from "@/components/website-pages/LaunchVideo";
import { FaqSection } from "@/components/seo/FaqSection";
import { JsonLd } from "@/components/seo/JsonLd";
import { FAQS } from "@/lib/faq";
import { faqLd, pageMetadata, softwareApplicationLd } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/",
  title: "BoolBul — In-App Cancellation Flow & Churn Reduction for SaaS (Dodo Payments + Stripe)",
  socialTitle: "BoolBul — Drop churn. Keep the cash.",
  description:
    "Keep cancelling customers inside your app: one-tap exit survey, reason-matched pause and discount offers, and an always-visible one-click cancel link. Works with Dodo Payments and Stripe. First 100 SaaS get 3 months free.",
});

export default function HomePage() {
  return (
    <main className="min-h-screen bg-cobalt p-4 paper-grain selection:bg-lime selection:text-pitch md:p-8">
      <JsonLd nodes={[softwareApplicationLd, launchVideoLd, faqLd(FAQS)]} />
      <BetaBanner />
      <div className="relative mx-auto max-w-6xl border-4-black bg-cream p-6 shadow-brutal-xl md:p-10">
        <Navbar />
        <HeroSection />
        <LaunchVideo />
        <PricingCards />
        <FaqSection />
        <Footer />
      </div>
    </main>
  );
}
