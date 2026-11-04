import React from "react";
import Image from "next/image";
import Link from "next/link";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";
import { DuctTapeBadge } from "@/components/ui-primitives/DuctTapeBadge";

export function HeroSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      {/* Left Column: Punk Pitch & Hero Mascot */}
      <div className="lg:col-span-7 space-y-6">
        <DuctTapeBadge rotate="left">
          ⚠️ Solo Builders & Indie Hackers ($500 - $20k MRR)
        </DuctTapeBadge>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[0.95] tracking-tight uppercase text-pitch">
          DROP CHURN.<br />
          <span className="bg-lime px-2 inline-block border-3 border-pitch mt-1 rotate-[-1deg]">
            KEEP THE CASH.
          </span>
        </h1>

        <p className="font-mono text-sm sm:text-base text-zinc-800 leading-relaxed max-w-xl font-medium">
          Dodo Payments users are walking out because you don&apos;t have a cancel-deflection modal.{" "}
          <span className="font-bold bg-blush px-1 text-pitch border-b-2 border-pitch">
            BoolBul stops them dead in their tracks
          </span>{" "}
          with dynamic discounts, one-click pauses, and zero enterprise bloat.
        </p>

        {/* CTAs & Zero Trust Badge */}
        <div className="pt-2 flex flex-col sm:flex-row gap-4">
          <Link href="/onboarding">
            <BrutalButton variant="lime" size="lg" shadow="lg" className="w-full sm:w-auto">
              <span>⚡ Stop Churn in 45 Secs</span>
              <span className="text-xl">→</span>
            </BrutalButton>
          </Link>

          <div className="bg-blush border-3 border-pitch px-4 py-3 flex items-center gap-3 shadow-brutal-sm">
            <Image
              src="/compliance/zero-trust.png"
              alt="Zero Trust"
              width={38}
              height={38}
              className="object-contain"
            />
            <div className="text-xs font-mono">
              <span className="font-bold block text-pitch">ZERO-TRUST SECURE</span>
              <span className="text-zinc-600">No secret keys touch our DB</span>
            </div>
          </div>
        </div>

        {/* Mascot Featurette Bar */}
        <div className="border-3 border-pitch border-dashed p-4 bg-white/80 flex items-center gap-4 shadow-brutal-sm">
          <div className="relative w-16 h-16 bg-cobalt border-3 border-pitch flex-shrink-0 flex items-center justify-center overflow-hidden">
            <Image
              src="/brand/logo.png"
              alt="BoolBul Mascot"
              width={56}
              height={56}
              className="object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xs uppercase bg-crimson text-white px-1.5 py-0.5 border border-pitch">
                MEET THE BULBUL
              </span>
              <span className="text-[11px] font-mono font-bold text-zinc-600">
                Mascot & Churn-Assassin
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-800 mt-1">
              &ldquo;You spent 6 months vibe-coding the product. Don&apos;t let users bail in 6 seconds.&rdquo;
            </p>
          </div>
        </div>

        {/* Plug & Play Integrations Grid */}
        <div className="pt-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-electric-blue border-2 border-pitch"></span>
              <span className="text-xs sm:text-sm font-mono font-black uppercase tracking-wider text-pitch">
                PLUG & PLAY INTEGRATIONS:
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold bg-lime border-2 border-pitch px-2.5 py-0.5 uppercase shadow-brutal-sm">
              ZERO SDK BLOAT ⚡
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              {
                name: "Dodo Payments",
                icon: "/integrations/dodo-payments.png",
                role: "Native Gateway",
                highlight: true,
              },
              {
                name: "Cursor AI",
                icon: "/integrations/cursor.png",
                role: "Plugin & Prompts",
                highlight: false,
              },
              {
                name: "Claude Code",
                icon: "/integrations/claude.png",
                role: "Official Skills",
                highlight: false,
              },
              {
                name: "Stripe",
                icon: "/integrations/stripe.png",
                role: "Subscriptions API",
                highlight: false,
              },
              {
                name: "Lemon Squeezy",
                icon: "/integrations/lemon-squeezy.png",
                role: "Merchant of Record",
                highlight: false,
              },
              {
                name: "Paddle",
                icon: "/integrations/paddle.png",
                role: "Billing Webhooks",
                highlight: false,
              },
            ].map((tool) => (
              <div
                key={tool.name}
                className={`bg-white border-3 border-pitch p-2.5 sm:p-3 shadow-brutal flex items-center gap-3 transition-all duration-150 hover:-translate-y-1 hover:shadow-brutal-hover ${
                  tool.highlight ? "bg-lime/20 border-pitch ring-2 ring-pitch" : ""
                }`}
              >
                <div className="relative w-12 h-12 shrink-0 bg-paper border-2 border-pitch p-1 flex items-center justify-center shadow-brutal-sm overflow-hidden">
                  <Image
                    src={tool.icon}
                    alt={tool.name}
                    width={48}
                    height={48}
                    className="object-contain w-full h-full"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm font-mono font-black text-pitch truncate">
                      {tool.name}
                    </span>
                  </div>
                  <span className="block text-[10px] sm:text-[11px] font-mono font-bold text-zinc-500 truncate">
                    {tool.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Live Interceptor Modal Mockup */}
      <div className="lg:col-span-5">
        <div className="relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
            <DuctTapeBadge rotate="none">
              LIVE DEFLECTION PREVIEW
            </DuctTapeBadge>
          </div>

          {/* Brutalist Retention Modal Card */}
          <div className="bg-white border-4-black shadow-brutal-xl p-6 relative z-10 pt-8">
            <div className="flex items-center justify-between border-b-2 border-pitch pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-crimson border border-pitch"></span>
                <span className="w-3 h-3 rounded-full bg-lime border border-pitch"></span>
                <span className="w-3 h-3 rounded-full bg-cobalt border border-pitch"></span>
                <span className="font-mono text-xs font-black uppercase tracking-wider ml-2">
                  CANCELLATION INTERCEPT
                </span>
              </div>
              <span className="text-[11px] font-mono bg-lime px-2 py-0.5 border border-pitch font-bold">
                ACTIVE
              </span>
            </div>

            <div className="space-y-4">
              <div className="bg-blush border-3 border-pitch p-3 flex items-start gap-3">
                <span className="text-3xl">🛑</span>
                <div>
                  <h3 className="font-black text-sm uppercase leading-tight">
                    WAIT! BEFORE YOU BOUNCE...
                  </h3>
                  <p className="text-xs font-mono text-zinc-700 mt-0.5">
                    Your current plan is <strong className="text-pitch">$49/month</strong>. We&apos;d hate to see you go.
                  </p>
                </div>
              </div>

              {/* Offer Options */}
              <div className="space-y-2">
                <label className="block text-xs font-mono font-bold uppercase text-zinc-600">
                  Choose your rescue package:
                </label>

                <div className="p-3 bg-cream border-3 border-pitch flex items-center justify-between hover:bg-lime/30 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm">🔥 50% OFF</span>
                    <span className="text-xs font-mono text-zinc-700">Next 2 months ($24.50/mo)</span>
                  </div>
                  <span className="text-xs font-black bg-lime px-2 py-0.5 border border-pitch">HOT</span>
                </div>

                <div className="p-3 bg-cream border-3 border-pitch flex items-center justify-between hover:bg-lime/30 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm">⏸️ 30-DAY PAUSE</span>
                    <span className="text-xs font-mono text-zinc-700">Zero charges, keep data</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-zinc-500">FREEZE</span>
                </div>
              </div>

              {/* Primary Rescue CTA */}
              <BrutalButton variant="lime" size="md" className="w-full">
                Claim 50% Off & Stay Subscribed 🚀
              </BrutalButton>

              {/* Legal Escape Hatch */}
              <div className="text-center pt-1 border-t border-zinc-200">
                <span className="text-xs font-mono text-zinc-600 underline font-bold cursor-pointer hover:text-pitch">
                  No thanks, proceed to complete cancellation →
                </span>
                <div className="text-[10px] text-zinc-500 font-mono mt-1 flex items-center justify-center gap-1">
                  <Image
                    src="/compliance/ftc-compliant-escape-hatch.png"
                    alt="Zero Dark Patterns"
                    width={14}
                    height={14}
                    className="object-contain"
                  />
                  <span>Zero dark patterns · High-contrast escape hatch</span>
                </div>
              </div>
            </div>
          </div>

          {/* Saved MRR sticker badge */}
          <div className="mt-4 bg-lime border-3 border-pitch p-3 shadow-brutal flex items-center justify-between font-mono text-xs">
            <span className="font-bold flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-crimson animate-ping"></span>
              SAVED JUST NOW:
            </span>
            <span className="font-black text-pitch bg-white px-2 py-0.5 border border-pitch">
              +$49 MRR retained (@alex_dev)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

