import React from "react";
import Link from "next/link";
import { BrutalCard } from "@/components/ui-primitives/BrutalCard";
import { DuctTapeBadge } from "@/components/ui-primitives/DuctTapeBadge";

export function PricingCards() {
  const plans = [
    {
      name: "Starter",
      price: "$19",
      mrrLimit: "Up to 500 saved subscribers / month",
      features: [
        { name: "In-app cancellation flow (web + mobile)", status: "Included" },
        { name: "Exit survey mapped to gateway feedback", status: "Included" },
        { name: "Pause & discount offers — Dodo Payments + Stripe", status: "Included" },
        { name: "Live customizer, 4 WCAG-AA themes", status: "Included" },
        { name: "1.5s fail-open + FTC click-to-cancel", status: "Included" },
      ],
      cta: "Claim 3 Months Free",
      href: "/login?mode=apply",
      variant: "cream" as const,
      badge: null,
    },
    {
      name: "Pro Punk",
      price: "$49",
      mrrLimit: "Unlimited saved subscribers",
      features: [
        { name: "Everything in Starter", status: "Included" },
        { name: "Unlimited saves & edge rules", status: "Included" },
        { name: "Saved-MRR dashboard & CSV ledger", status: "Included" },
        { name: "Slack & Discord alerts", status: "Coming soon" },
        { name: "Offer A/B testing", status: "Coming soon" },
      ],
      cta: "Claim 3 Months Free (First 100 SaaS Only)",
      href: "/login?mode=apply",
      variant: "lime" as const,
      badge: "PRO",
    },
    {
      name: "Scale Crusher",
      price: "$99",
      mrrLimit: "Coming soon · join from your dashboard",
      features: [
        { name: "Paddle, Lemon Squeezy, Polar, Chargebee", status: "Coming soon" },
        { name: "White-label widget", status: "Coming soon" },
        { name: "Custom retention routing", status: "Coming soon" },
        { name: "Team seats & multiple workspaces", status: "Coming soon" },
      ],
      cta: "Coming soon",
      href: null,
      variant: "pink" as const,
      badge: "SOON",
    },
  ];

  return (
    <div className="mt-20 border-t-4 border-pitch pt-12">
      <div className="mx-auto mb-12 max-w-2xl space-y-4 text-center">
        <DuctTapeBadge rotate="right" className="max-w-full leading-relaxed">
          FAIR NO-BULLSHIT PRICING
        </DuctTapeBadge>
        <h2 className="text-3xl font-black uppercase leading-tight tracking-tight text-pitch md:text-5xl">
          Your plan. <span className="mt-2 inline-block border-3 border-pitch bg-lime px-2">No surprises.</span>
        </h2>
        <p className="font-mono text-sm leading-relaxed text-zinc-700">
          Invite-only beta: the first 100 approved SaaS founders get Pro free for 3 months — no credit card. After that, pick the plan that fits. Coming-soon features are labeled.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-6">
        {plans.map((p) => (
          <BrutalCard
            key={p.name}
            variant={p.variant}
            shadow="lg"
            className="flex min-w-0 flex-col justify-between !p-4 sm:!p-6"
          >
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-mono text-sm font-black uppercase tracking-wide text-pitch">{p.name}</h3>
                {p.badge && (
                  <span className="border-2 border-pitch bg-pitch px-2 py-1 font-mono text-xs font-black uppercase text-white">
                    {p.badge}
                  </span>
                )}
              </div>
              <div className="my-2 flex flex-wrap items-baseline gap-2">
                <span className="text-4xl font-black text-pitch md:text-5xl">{p.price}</span>
                <span className="font-mono text-sm font-bold text-zinc-700">/month{!p.href && " · planned"}</span>
              </div>
              <div className="mb-6 border-2 border-pitch bg-white/80 p-3 text-center font-mono text-sm font-bold">
                {p.mrrLimit}
              </div>

              <ul className="mb-8 space-y-4 font-mono text-sm">
                {p.features.map((feature) => (
                  <li key={feature.name} className="space-y-1">
                    <span className="block font-bold leading-relaxed">{feature.name}</span>
                    <span className={`inline-block border border-pitch px-2 py-1 text-xs font-medium ${feature.status === "Coming soon" ? "bg-white text-zinc-700" : "bg-white/80 text-pitch"}`}>
                      {feature.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {p.href ? (
              <Link
                href={p.href}
                className={`flex min-h-11 w-full items-center justify-center border-3 border-pitch px-4 py-3 text-center text-sm font-black uppercase tracking-wide shadow-brutal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black ${p.variant === "lime" ? "bg-cobalt text-white hover:bg-cobalt-dark" : "bg-lime text-pitch hover:bg-lime-hover"}`}
              >
                {p.cta}
              </Link>
            ) : (
              <p className="flex min-h-11 items-center justify-center border-3 border-pitch bg-white px-4 py-3 text-center font-mono text-sm font-bold text-pitch">
                {p.cta}
              </p>
            )}
          </BrutalCard>
        ))}
      </div>
    </div>
  );
}
