import React from "react";
import Image from "next/image";
import Link from "next/link";
import { BrutalCard } from "@/components/ui-primitives/BrutalCard";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";
import { DuctTapeBadge } from "@/components/ui-primitives/DuctTapeBadge";

export function PricingCards() {
  const plans = [
    {
      name: "Starter",
      price: "$19",
      billing: "per month",
      mrrLimit: "Up to $5,000 MRR Protected",
      features: [
        "In-App Exit Interceptor Modal",
        "30-Day Billing Pauses & Discounts",
        "Zero-Trust JWT Signature Engine",
        "1500ms Fail-Open Guarantee",
        "Exit Reason Feedback Telemetry",
        "1 Workspace",
      ],
      cta: "Start Protecting MRR",
      variant: "cream" as const,
      badge: null,
    },
    {
      name: "Pro Punk",
      price: "$49",
      billing: "per month",
      mrrLimit: "Up to $25,000 MRR Protected",
      features: [
        "Everything in Starter",
        "Exit Survey & Churn Reason Analytics",
        "Discord & Slack Saved-MRR Alerts",
        "Dynamic Offer A/B Testing",
        "Custom Theme & Mascot Styling",
        "3 Workspaces",
      ],
      cta: "Go Pro Punk ⚡",
      variant: "lime" as const,
      badge: "MOST POPULAR",
    },
    {
      name: "Scale Crusher",
      price: "$99",
      billing: "per month",
      mrrLimit: "Unlimited MRR Protected",
      features: [
        "Everything in Pro Punk",
        "Multi-Gateway Webhook Ingestion",
        "Zero-Brand White-Labeling",
        "Custom Retention Routing Rules",
        "Unlimited Workspaces & Team Seats",
      ],
      cta: "Deploy Enterprise Scale",
      variant: "pink" as const,
      badge: "UNLIMITED",
    },
  ];

  return (
    <div className="mt-20 pt-12 border-t-4 border-pitch">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <DuctTapeBadge rotate="right" className="mb-3">
          FAIR NO-BULLSHIT PRICING
        </DuctTapeBadge>
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-pitch">
          Pays for itself with <span className="bg-lime px-2 border-3 border-pitch">1 Saved User</span>
        </h2>
        <p className="font-mono text-sm text-zinc-700 mt-2">
          Billed via Dodo Payments. No sneaky auto-escalations or enterprise contracts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <BrutalCard
            key={p.name}
            variant={p.variant}
            shadow="lg"
            className="flex flex-col justify-between"
          >
            {p.badge && (
              <div className="absolute -top-3 right-4 bg-crimson text-white px-3 py-0.5 border-2 border-pitch text-xs font-mono font-black uppercase">
                {p.badge}
              </div>
            )}

            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-600 block">
                {p.name}
              </span>
              <div className="flex items-baseline gap-1 my-2">
                <span className="text-4xl md:text-5xl font-black text-pitch">{p.price}</span>
                <span className="font-mono text-xs text-zinc-600 font-bold">/{p.billing}</span>
              </div>
              <div className="bg-white/80 border-2 border-pitch p-2 font-mono text-xs font-bold text-center mb-6">
                🛡️ {p.mrrLimit}
              </div>

              <ul className="space-y-3 font-mono text-xs mb-8">
                {p.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2">
                    <span className="text-crimson font-black">✓</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link href="/onboarding">
              <BrutalButton
                variant={p.variant === "lime" ? "cobalt" : "lime"}
                size="md"
                className="w-full"
              >
                {p.cta}
              </BrutalButton>
            </Link>
          </BrutalCard>
        ))}
      </div>
    </div>
  );
}

