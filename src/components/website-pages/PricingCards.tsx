import React from "react";
import Link from "next/link";
import { BrutalCard } from "@/components/ui-primitives/BrutalCard";
import { DuctTapeBadge } from "@/components/ui-primitives/DuctTapeBadge";

export function PricingCards() {
  const plans = [
    {
      name: "Starter",
      price: "$19",
      mrrLimit: "For apps up to $5,000 MRR",
      features: [
        { name: "In-app cancellation flow", status: "Integration required" },
        { name: "Billing pauses & discounts", status: "Dodo integration required" },
        { name: "Signed JWT offer verification", status: "Available" },
        { name: "Fail-open cancellation handling", status: "Integration required" },
        { name: "Exit-reason survey", status: "Available" },
      ],
      cta: "Choose Starter",
      href: "/dashboard?plan=starter",
      variant: "cream" as const,
      badge: null,
    },
    {
      name: "Pro Punk",
      price: "$49",
      mrrLimit: "For apps up to $25,000 MRR",
      features: [
        { name: "Everything in Starter", status: "Available" },
        { name: "Churn analytics dashboard", status: "Preview only" },
        { name: "Discord & Slack alerts", status: "Not available" },
        { name: "Offer A/B testing", status: "Not available" },
        { name: "Custom themes & multiple workspaces", status: "Not available" },
      ],
      cta: "Choose Pro",
      href: "/dashboard?plan=pro",
      variant: "lime" as const,
      badge: "PRO",
    },
    {
      name: "Scale Crusher",
      price: "$99",
      mrrLimit: "Planned tier · Not available for purchase",
      features: [
        { name: "Multi-gateway support", status: "Not available" },
        { name: "White-label branding", status: "Not available" },
        { name: "Custom retention routing", status: "Not available" },
        { name: "Unlimited workspaces & team seats", status: "Not available" },
      ],
      cta: "Scale is not available yet",
      href: null,
      variant: "pink" as const,
      badge: "PLANNED",
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
          Choose Starter or Pro to continue in the dashboard. Preview and unavailable features are labeled below; selecting a plan does not charge you.
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
                    <span className={`inline-block border border-pitch px-2 py-1 text-xs font-medium ${feature.status === "Not available" || feature.status === "Preview only" ? "bg-white text-zinc-700" : "bg-white/80 text-pitch"}`}>
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
