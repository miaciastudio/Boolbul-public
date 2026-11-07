import React from "react";
import Image from "next/image";
import Link from "next/link";
import { DuctTapeBadge } from "@/components/ui-primitives/DuctTapeBadge";
import { BoolBulPreview } from "@boolbul/sdk/react";

export function HeroSection() {
  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-8 xl:gap-12">
      <div className="min-w-0 space-y-6">
        <DuctTapeBadge rotate="left" className="max-w-full leading-relaxed">
          Solo Builders & Indie Hackers ($500 - $20k MRR)
        </DuctTapeBadge>

        <h1 className="text-4xl font-black uppercase leading-[1.05] tracking-tight text-pitch sm:text-5xl xl:text-6xl">
          DROP CHURN.<br />
          <span className="mt-2 inline-block rotate-[-1deg] border-3 border-pitch bg-lime px-2">
            KEEP THE CASH.
          </span>
        </h1>

        <p className="max-w-xl font-mono text-sm font-medium leading-relaxed text-zinc-800 sm:text-base">
          Don&apos;t kick churning users to an external billing portal.{" "}
          <span className="border-b-2 border-pitch bg-blush px-1 font-bold text-pitch">
            BoolBul keeps subscribers inside your app
          </span>{" "}
          with customizable exit pauses, dynamic discounts, and real exit feedback.
        </p>

        <div className="flex flex-col flex-wrap gap-4 pt-2 sm:flex-row">
          <Link
            href="/login?mode=apply"
            className="inline-flex min-h-11 items-center justify-center gap-2 border-3 border-pitch bg-lime px-5 py-3 text-center text-sm font-black uppercase tracking-wide text-pitch shadow-brutal-lg transition-transform hover:bg-lime-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
          >
            Claim 3 Months Free (First 100 SaaS Only) →
          </Link>

          <div className="flex items-center gap-3 border-3 border-pitch bg-blush px-4 py-3 shadow-brutal-sm">
            <Image
              src="/compliance/zero-trust.png"
              alt="Zero Trust"
              width={38}
              height={38}
              className="shrink-0 object-contain"
            />
            <div className="min-w-0 font-mono text-xs leading-relaxed">
              <span className="block font-bold text-pitch">ZERO-TRUST MODE</span>
              <span className="text-zinc-700">Keep gateway keys on your server</span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 border-3 border-dashed border-pitch bg-white/80 p-4 shadow-brutal-sm sm:gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border-3 border-pitch bg-cobalt sm:h-16 sm:w-16">
            <Image
              src="/brand/logo.png"
              alt="BoolBul Mascot"
              width={56}
              height={56}
              className="object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-pitch bg-crimson px-1.5 py-0.5 text-xs font-black uppercase text-white">
                MEET THE BULBUL
              </span>
              <span className="font-mono text-xs font-bold text-zinc-700">
                Mascot & Churn-Assassin
              </span>
            </div>
            <p className="mt-2 font-mono text-xs leading-relaxed text-zinc-800">
              &ldquo;You spent 6 months vibe-coding the product. Don&apos;t let users bail in 6 seconds.&rdquo;
            </p>
          </div>
        </div>

        <div className="pt-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-sm font-black uppercase tracking-wide text-pitch">
              INTEGRATIONS & SETUP TOOLS
            </span>
            <span className="border-2 border-pitch bg-lime px-2.5 py-1 font-mono text-xs font-bold uppercase shadow-brutal-sm">
              LIGHTWEIGHT SETUP
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {[
              { name: "Dodo Payments", icon: "/integrations/dodo-payments.png", role: "Supported", highlight: true },
              { name: "Cursor AI", icon: "/integrations/cursor.png", role: "Setup prompts", highlight: false },
              { name: "Claude Code", icon: "/integrations/claude.png", role: "Setup prompts", highlight: false },
              { name: "Stripe", icon: "/integrations/stripe.png", role: "Supported", highlight: true },
              { name: "Lemon Squeezy", icon: "/integrations/lemon-squeezy.png", role: "Coming soon", highlight: false },
              { name: "Paddle", icon: "/integrations/paddle.png", role: "Coming soon", highlight: false },
            ].map((tool) => (
              <div
                key={tool.name}
                className={`flex min-w-0 items-center gap-2 border-3 border-pitch p-3 shadow-brutal ${tool.highlight ? "bg-lime/20" : "bg-white"}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border-2 border-pitch bg-cream p-1 shadow-brutal-sm">
                  <Image src={tool.icon} alt="" width={40} height={40} className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1 break-words font-mono text-xs leading-relaxed">
                  <span className="block font-black text-pitch">{tool.name}</span>
                  <span className="block font-medium text-zinc-700">{tool.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        <div className="px-2 pt-1 text-center">
          <DuctTapeBadge rotate="none" className="max-w-full leading-relaxed">
            LIVE WIDGET — TRY IT
          </DuctTapeBadge>
        </div>

        <div className="relative h-[620px] overflow-hidden border-4-black bg-white shadow-brutal-xl">
          <div className="flex h-9 items-center gap-1.5 border-b-2 border-pitch bg-zinc-100 px-3" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-rose-400" /><span className="h-3 w-3 rounded-full bg-amber-300" /><span className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="ml-3 truncate font-mono text-[10px] text-zinc-500">your-saas.com/settings/billing</span>
          </div>
          <BoolBulPreview viewport="desktop" planPriceCents={4900} style={{ position: "absolute", inset: "36px 0 0 0" }} />
        </div>

        <p className="text-center font-mono text-xs font-bold leading-relaxed text-zinc-700">
          ↑ This is the real widget, not a screenshot. Click around — nothing is charged or cancelled.
        </p>
      </div>
    </div>
  );
}
