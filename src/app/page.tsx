import { Navbar } from "@/components/website-pages/Navbar";
import { HeroSection } from "@/components/website-pages/HeroSection";
import { PricingCards } from "@/components/website-pages/PricingCards";
import { Footer } from "@/components/website-pages/Footer";

export default function HomePage() {
  return (
    <main className="bg-cobalt min-h-screen p-4 md:p-8 paper-grain selection:bg-lime selection:text-pitch">
      {/* Top Punk Announcement Bar */}
      <div className="max-w-6xl mx-auto mb-6 bg-lime border-3 border-pitch shadow-brutal p-2 text-center text-xs md:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-3">
        <span className="bg-crimson text-white px-2 py-0.5 border border-pitch text-[11px] animate-pulse">
          WARFARE NOTICE
        </span>
        <span className="text-pitch">FIRST NATIVE RETENTION & CHURN-BUSTER ENGINE FOR DODO PAYMENTS</span>
        <span className="hidden md:inline bg-pitch text-lime px-2 py-0.5 text-[11px] font-mono">
          0% ENTERPRISE BLOAT
        </span>
      </div>

      {/* Main Newsprint Brutalist Card */}
      <div className="max-w-6xl mx-auto bg-cream border-4-black shadow-brutal-xl p-6 md:p-10 relative">
        <Navbar />
        <HeroSection />
        <PricingCards />
        <Footer />
      </div>
    </main>
  );
}
