"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BrutalCard } from "@/components/ui-primitives/BrutalCard";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";
import { DuctTapeBadge } from "@/components/ui-primitives/DuctTapeBadge";
import { RetentionModal } from "@/components/interceptor-widget/RetentionModal";

export function DemoWalkthrough() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [simulatedStatus, setSimulatedStatus] = useState<string | null>(null);

  const handleOfferAccepted: React.ComponentProps<typeof RetentionModal>["onOfferAccepted"] = () => {
    setSimulatedStatus("DEMO: Offer acceptance simulated. No subscription was updated and no revenue was saved.");
  };

  const handleCancelConfirmed = () => {
    setIsModalOpen(false);
    setSimulatedStatus("DEMO: Cancellation path completed. No real subscription was cancelled.");
  };

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-12 break-words">
      {/* Top Punk Header */}
      <div className="flex flex-col items-start justify-between gap-6 border-4-black bg-cream p-4 shadow-brutal sm:p-6 lg:flex-row">
        <div className="min-w-0">
          <Link href="/" className="mb-2 inline-flex min-h-11 items-center gap-1 font-mono text-sm font-bold text-pitch underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
            ← BACK TO HOME
          </Link>
          <h1 className="text-3xl font-black uppercase tracking-tight text-pitch sm:text-4xl">
            BOOLBUL PLATFORM & WIDGET DEMO
          </h1>
          <p className="mt-2 font-mono text-sm leading-relaxed text-zinc-700">
            Explore a simulated cancellation flow and reference screens. No real billing actions take place in this demo.
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row lg:flex-col">
          <Link href="/onboarding" className="inline-flex min-h-11 items-center justify-center border-3 border-pitch bg-lime px-4 py-3 text-center font-mono text-sm font-bold text-pitch shadow-brutal hover:bg-lime-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
            Set up your app →
          </Link>
          <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center border-3 border-pitch bg-white px-4 py-3 text-center font-mono text-sm font-bold text-pitch shadow-brutal hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
            View dashboard
          </Link>
        </div>
      </div>

      {/* SECTION 1: LIVE INTERACTIVE SUBSCRIBER SIMULATOR */}
      <BrutalCard variant="cream" shadow="xl" className="min-w-0 space-y-6 !p-4 sm:!p-6">
        <div className="flex flex-col items-start justify-between gap-4 border-b-3 border-pitch pb-4 lg:flex-row">
          <div className="min-w-0">
            <DuctTapeBadge rotate="left" className="max-w-full leading-relaxed">PART 1: THE SUBSCRIBER EXPERIENCE</DuctTapeBadge>
            <h2 className="mt-5 text-2xl font-black uppercase tracking-tight text-pitch sm:text-3xl">
              TRY A SUBSCRIBER CANCELLATION FLOW
            </h2>
            <p className="mt-2 font-mono text-sm leading-relaxed text-zinc-700">
              Open the demo to explore sample offers. &ldquo;Proceed to cancel&rdquo; stays available in every step, including the simulated success screen.
            </p>
          </div>
          <span className="shrink-0 border-2 border-pitch bg-lime px-3 py-1 font-mono text-xs font-black">
            SIMULATION ONLY
          </span>
        </div>

        {/* Mock Host SaaS Billing Interface */}
        <div className="space-y-4 border-3 border-pitch bg-white p-4 shadow-brutal sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-pitch pb-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-cobalt font-mono text-xs font-bold text-white">
                A
              </span>
              <span className="text-sm font-black uppercase">Acme AI Studio — Example billing settings</span>
            </div>
            <span className="border border-pitch bg-lime px-2 py-1 font-mono text-xs font-bold">
              DEMO SUBSCRIBER
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3 bg-cream border-2 border-pitch">
              <span className="mb-1 block text-zinc-700">CURRENT PLAN</span>
              <span className="font-black text-sm text-pitch">Pro Builder ($49/mo)</span>
            </div>
            <div className="p-3 bg-cream border-2 border-pitch">
              <span className="mb-1 block text-zinc-700">GATEWAY</span>
              <span className="font-black text-sm text-pitch">Dodo Payments Native</span>
            </div>
            <div className="p-3 bg-cream border-2 border-pitch">
              <span className="mb-1 block text-zinc-700">NEXT RENEWAL</span>
              <span className="font-black text-sm text-pitch">Nov 28, 2026</span>
            </div>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 border-t-2 border-dashed border-zinc-300 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="font-mono text-sm text-zinc-700">
              Try cancelling an example subscription.
            </span>
            <BrutalButton
              variant="crimson"
              size="md"
              onClick={() => {
                setSimulatedStatus(null);
                setIsModalOpen(true);
              }}
              className="min-h-11 w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:w-auto"
            >
              Cancel subscription (demo)
            </BrutalButton>
          </div>

          {simulatedStatus && (
            <div role="status" className="border-2 border-pitch bg-lime p-3 font-mono text-sm font-bold leading-relaxed text-pitch">
              {simulatedStatus}
            </div>
          )}
        </div>
      </BrutalCard>

      {/* SECTION 2: STEP-BY-STEP REAL SCREENSHOTS & PIPELINE */}
      <div className="space-y-8">
        <div>
          <DuctTapeBadge rotate="right" className="max-w-full leading-relaxed">PART 2: PLATFORM REFERENCE SCREENS</DuctTapeBadge>
          <h2 className="mt-5 text-3xl font-black uppercase tracking-tight text-white">
            STEP-BY-STEP FOUNDER EXPERIENCE
          </h2>
          <p className="mt-2 font-mono text-sm leading-relaxed text-zinc-200">
            Static reference screenshots may show earlier designs and sample data. Their controls are not interactive; use the simulator above to try the cancellation flow.
          </p>
        </div>

        {/* Step 1: Landing Page */}
        <BrutalCard variant="cream" shadow="lg" className="min-w-0 space-y-4 !p-4 sm:!p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-pitch pb-3">
            <div>
              <span className="font-mono text-xs font-black bg-lime px-2 py-0.5 border border-pitch">
                SCREEN 01
              </span>
              <h3 className="text-xl font-black uppercase text-pitch mt-1">
                LANDING PAGE & DEMO PREVIEW
              </h3>
            </div>
            <Link href="/" className="inline-flex min-h-11 items-center font-mono text-sm font-bold text-pitch underline hover:text-crimson focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
              Open home page →
            </Link>
          </div>
          <p className="font-mono text-sm leading-relaxed text-zinc-700">
            A reference view of the landing page, example retention offers, and pricing. Use the current page for plan availability.
          </p>
          <div className="border-3 border-pitch overflow-hidden shadow-brutal bg-pitch">
            <Image
              src="/screenshots/shot_home.png"
              alt="BoolBul Landing Page Screenshot"
              width={1440}
              height={900}
              className="w-full h-auto object-cover"
            />
          </div>
        </BrutalCard>

        {/* Step 2: Onboarding Setup */}
        <BrutalCard variant="cream" shadow="lg" className="min-w-0 space-y-4 !p-4 sm:!p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-pitch pb-3">
            <div>
              <span className="font-mono text-xs font-black bg-lime px-2 py-0.5 border border-pitch">
                SCREEN 02
              </span>
              <h3 className="text-xl font-black uppercase text-pitch mt-1">
                STEP 1: DROP THE KEYS & ZERO-TRUST TOGGLE
              </h3>
            </div>
            <Link href="/onboarding" className="inline-flex min-h-11 items-center font-mono text-sm font-bold text-pitch underline hover:text-crimson focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
              Open Wizard →
            </Link>
          </div>
          <p className="font-mono text-sm leading-relaxed text-zinc-700">
            A reference view of integration setup. Open the wizard for current setup instructions; this screenshot does not connect a gateway or save credentials.
          </p>
          <div className="border-3 border-pitch overflow-hidden shadow-brutal bg-pitch">
            <Image
              src="/screenshots/shot_onboarding.png"
              alt="BoolBul Onboarding Screenshot"
              width={1440}
              height={1100}
              className="w-full h-auto object-cover"
            />
          </div>
        </BrutalCard>

        {/* Step 3: Cockpit Dashboard */}
        <BrutalCard variant="cream" shadow="lg" className="min-w-0 space-y-4 !p-4 sm:!p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-pitch pb-3">
            <div>
              <span className="font-mono text-xs font-black bg-lime px-2 py-0.5 border border-pitch">
                SCREEN 03
              </span>
              <h3 className="text-xl font-black uppercase text-pitch mt-1">
                DASHBOARD & SAMPLE RETENTION LEDGER
              </h3>
            </div>
            <Link href="/dashboard" className="inline-flex min-h-11 items-center font-mono text-sm font-bold text-pitch underline hover:text-crimson focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
              Open Dashboard →
            </Link>
          </div>
          <p className="font-mono text-sm leading-relaxed text-zinc-700">
            A reference dashboard with sample metrics, discount and pause controls, and a retention ledger. These example numbers are not verified savings or live activity.
          </p>
          <div className="border-3 border-pitch overflow-hidden shadow-brutal bg-pitch">
            <Image
              src="/screenshots/shot_dashboard.png"
              alt="BoolBul Dashboard Screenshot"
              width={1440}
              height={1200}
              className="w-full h-auto object-cover"
            />
          </div>
        </BrutalCard>
      </div>

      {/* Embedded Live Interceptor Modal */}
      <RetentionModal
        isOpen={isModalOpen}
        customerId="demo@example.com"
        subscriptionId="sub_demo_001"
        planPrice={49}
        onCancelConfirmed={handleCancelConfirmed}
        onOfferAccepted={handleOfferAccepted}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

