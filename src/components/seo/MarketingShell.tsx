import type { ReactNode } from "react";
import { BetaBanner } from "@/components/website-pages/BetaBanner";
import { Footer } from "@/components/website-pages/Footer";
import { Navbar } from "@/components/website-pages/Navbar";

/** Shared frame for marketing / SEO pages: beta banner, navbar, cream card, footer. */
export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-cobalt p-4 paper-grain selection:bg-lime selection:text-pitch md:p-8">
      <BetaBanner />
      <div className="relative mx-auto max-w-6xl border-4-black bg-cream p-6 shadow-brutal-xl md:p-10">
        <Navbar />
        {children}
        <Footer />
      </div>
    </main>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-3xl space-y-5 font-mono text-[15px] leading-relaxed text-zinc-800 [&_h2]:mt-10 [&_h2]:font-sans [&_h2]:text-2xl [&_h2]:font-black [&_h2]:uppercase [&_h2]:tracking-tight [&_h2]:text-pitch [&_h3]:font-sans [&_h3]:text-lg [&_h3]:font-black [&_h3]:text-pitch [&_a]:font-bold [&_a]:underline [&_strong]:text-pitch [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5">{children}</div>;
}

export function CtaBox({ title = "Try it on your own cancel button", text = "First 100 SaaS founders get BoolBul Pro free for 3 months — no credit card." }: { title?: string; text?: string }) {
  return (
    <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-between gap-4 border-4-black bg-lime p-5 shadow-brutal">
      <div className="min-w-0">
        <p className="font-black uppercase text-pitch">{title}</p>
        <p className="font-mono text-sm text-pitch">{text}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href="/demo" className="border-3 border-pitch bg-white px-4 py-2 font-mono text-sm font-black uppercase shadow-brutal-sm">Live demo</a>
        <a href="/login?mode=apply" className="border-3 border-pitch bg-pitch px-4 py-2 font-mono text-sm font-black uppercase text-lime shadow-brutal-sm">Claim 3 months free →</a>
      </div>
    </div>
  );
}
