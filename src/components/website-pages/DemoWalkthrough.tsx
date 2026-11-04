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

  const handleOfferAccepted = (data: any) => {
    setSimulatedStatus(
      `🎉 SUCCESS: User accepted ${data.offerType}! Gateway subscription updated on Dodo Payments. +$24.50 MRR Saved!`
    );
  };

  const handleCancelConfirmed = () => {
    setIsModalOpen(false);
    setSimulatedStatus("⚠️ USER CANCELLED: Legal escape hatch triggered without friction.");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Top Punk Header */}
      <div className="bg-cream border-4-black shadow-brutal p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <Link href="/" className="inline-flex items-center gap-1 font-mono text-xs font-bold text-zinc-600 hover:text-pitch mb-1">
            ← BACK TO HOME
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-pitch flex items-center gap-2">
            BOOLBUL PLATFORM & WIDGET DEMO 🎬
          </h1>
          <p className="font-mono text-xs text-zinc-700 mt-1">
            Step-by-step visual walkthrough of founder setup & live SaaS subscriber interceptor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/onboarding">
            <BrutalButton variant="lime" size="sm">
              Setup Your App →
            </BrutalButton>
          </Link>
          <Link href="/dashboard">
            <BrutalButton variant="white" size="sm">
              View Cockpit
            </BrutalButton>
          </Link>
        </div>
      </div>

      {/* SECTION 1: LIVE INTERACTIVE SUBSCRIBER SIMULATOR */}
      <BrutalCard variant="cream" shadow="xl" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-3 border-pitch pb-4">
          <div>
            <DuctTapeBadge rotate="left">PART 1: THE SUBSCRIBER EXPERIENCE</DuctTapeBadge>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-pitch mt-2">
              HOW BOOLBUL APPEARS IN A REAL SAAS APP
            </h2>
            <p className="font-mono text-xs text-zinc-700 mt-1">
              Test what happens when a subscriber clicks &ldquo;Cancel Subscription&rdquo; inside your billing settings:
            </p>
          </div>
          <span className="font-mono text-xs font-black bg-lime px-3 py-1 border-2 border-pitch">
            INTERACTIVE SIMULATION
          </span>
        </div>

        {/* Mock Host SaaS Billing Interface */}
        <div className="bg-white border-3 border-pitch p-6 shadow-brutal space-y-4">
          <div className="flex items-center justify-between border-b-2 border-pitch pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-cobalt rounded-sm text-white font-mono text-xs flex items-center justify-center font-bold">
                ▲
              </span>
              <span className="font-black text-sm uppercase">Acme AI Studio — Subscription Settings</span>
            </div>
            <span className="font-mono text-xs bg-lime px-2 py-0.5 border border-pitch font-bold">
              ACTIVE SUBSCRIBER
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3 bg-cream border-2 border-pitch">
              <span className="text-zinc-500 block">CURRENT PLAN</span>
              <span className="font-black text-sm text-pitch">Pro Builder ($49/mo)</span>
            </div>
            <div className="p-3 bg-cream border-2 border-pitch">
              <span className="text-zinc-500 block">GATEWAY</span>
              <span className="font-black text-sm text-pitch">Dodo Payments Native</span>
            </div>
            <div className="p-3 bg-cream border-2 border-pitch">
              <span className="text-zinc-500 block">NEXT RENEWAL</span>
              <span className="font-black text-sm text-pitch">Nov 28, 2026</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t-2 border-dashed border-zinc-300">
            <span className="font-mono text-xs text-zinc-600">
              Need to take a break or stop payments?
            </span>
            <BrutalButton
              variant="crimson"
              size="md"
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto"
            >
              🛑 Cancel Subscription
            </BrutalButton>
          </div>

          {simulatedStatus && (
            <div className="p-3 bg-lime border-2 border-pitch font-mono text-xs font-bold text-pitch">
              {simulatedStatus}
            </div>
          )}
        </div>
      </BrutalCard>

      {/* SECTION 2: STEP-BY-STEP REAL SCREENSHOTS & PIPELINE */}
      <div className="space-y-8">
        <div>
          <DuctTapeBadge rotate="right">PART 2: COMPLETE PLATFORM WALKTHROUGH</DuctTapeBadge>
          <h2 className="text-3xl font-black uppercase tracking-tight text-white mt-2">
            STEP-BY-STEP FOUNDER EXPERIENCE
          </h2>
          <p className="font-mono text-xs text-zinc-200 mt-1">
            Real captured screens from the running engine.
          </p>
        </div>

        {/* Step 1: Landing Page */}
        <BrutalCard variant="cream" shadow="lg" className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-pitch pb-3">
            <div>
              <span className="font-mono text-xs font-black bg-lime px-2 py-0.5 border border-pitch">
                SCREEN 01
              </span>
              <h3 className="text-xl font-black uppercase text-pitch mt-1">
                MARKETING LANDING & LIVE INTERCEPTOR HERO
              </h3>
            </div>
            <Link href="/" className="font-mono text-xs font-bold underline hover:text-crimson">
              Open Live Page →
            </Link>
          </div>
          <p className="font-mono text-xs text-zinc-700">
            Neo-Brutalist hero page communicating the $500–$20k MRR value proposition, live deflection interactive card, Dodo native focus, and 3-tier pricing.
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
        <BrutalCard variant="cream" shadow="lg" className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-pitch pb-3">
            <div>
              <span className="font-mono text-xs font-black bg-lime px-2 py-0.5 border border-pitch">
                SCREEN 02
              </span>
              <h3 className="text-xl font-black uppercase text-pitch mt-1">
                STEP 1: DROP THE KEYS & ZERO-TRUST TOGGLE
              </h3>
            </div>
            <Link href="/onboarding" className="font-mono text-xs font-bold underline hover:text-crimson">
              Open Wizard →
            </Link>
          </div>
          <p className="font-mono text-xs text-zinc-700">
            Founders drop their Dodo Payments API key with restricted permissions and choose between Zero-Trust client verification (no keys on BoolBul) or Hosted Scoped Key mode.
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
        <BrutalCard variant="cream" shadow="lg" className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-pitch pb-3">
            <div>
              <span className="font-mono text-xs font-black bg-lime px-2 py-0.5 border border-pitch">
                SCREEN 03
              </span>
              <h3 className="text-xl font-black uppercase text-pitch mt-1">
                FOUNDER COCKPIT & LIVE SAVED LEDGER
              </h3>
            </div>
            <Link href="/dashboard" className="font-mono text-xs font-bold underline hover:text-crimson">
              Open Dashboard →
            </Link>
          </div>
          <p className="font-mono text-xs text-zinc-700">
            Real-time feed of saved MRR, interactive discount & pause rule matrix tuner (pushed to Turso Edge globally in &lt;10ms), and reconciled subscriber retention ledger.
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
        customerId="alex@vibe-stack.io"
        subscriptionId="sub_dodo_live_981a2"
        planPrice={49}
        onCancelConfirmed={handleCancelConfirmed}
        onOfferAccepted={handleOfferAccepted}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

