"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BrutalCard } from "@/components/ui-primitives/BrutalCard";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";
import { DuctTapeBadge } from "@/components/ui-primitives/DuctTapeBadge";

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Step 1 Form State
  const [gateway, setGateway] = useState<"dodo" | "stripe" | "lemon">("dodo");
  const [executionMode, setExecutionMode] = useState<"zero-trust" | "hosted">("zero-trust");
  const [apiKey, setApiKey] = useState("");

  // Step 2 Rules State
  const [discountTier, setDiscountTier] = useState("50_2mo");
  const [pauseTier, setPauseTier] = useState("30_day");
  const [competitorMatch, setCompetitorMatch] = useState(true);

  const samplePublicKey = "bb_pub_c984fd72e10a8b41";
  const sampleSigningSecret = "bb_sec_993fa88c12b4e7230114a";

  const cursorPrompt = `You are integrating BoolBul (boolbul.com) — the Neo-Brutalist retention interceptor for Dodo Payments — into this Next.js App Router codebase.

WORKSPACE CREDENTIALS:
- BOOLBUL_PUBLIC_KEY: "${samplePublicKey}"
- BOOLBUL_SIGNING_SECRET: "${sampleSigningSecret}"
- DODO_PAYMENTS_API_KEY: process.env.DODO_PAYMENTS_API_KEY

EXECUTION PLAN:

1. Create a server-side route at \`app/api/boolbul/claim-offer/route.ts\`:
   - Accept POST requests with \`{ offerToken: string }\`.
   - Verify the HMAC-SHA256 signature using \`BOOLBUL_SIGNING_SECRET\`.
   - Decode payload: \`{ subscriptionId, action, payload: { discountCode, pauseDurationDays } }\`.
   - Call Dodo Payments API using \`DODO_PAYMENTS_API_KEY\`:
     * If \`action === "APPLY_DISCOUNT"\`: Call \`POST https://api.dodopayments.com/subscriptions/\${subscriptionId}/discount\` with \`{ code: discountCode }\`.
     * If \`action === "PAUSE_SUBSCRIPTION"\`: Call \`POST https://api.dodopayments.com/subscriptions/\${subscriptionId}/pause\` with \`{ pause_duration: pauseDurationDays }\`.
   - Return \`{ success: true, message: "Offer applied to subscription" }\` or throw 400 on invalid signature.

2. Create the client hook at \`hooks/useBoolBul.ts\`:
   - Expose \`openRetentionModal({ customerId, subscriptionId, mrr, onCancelConfirmed, onOfferAccepted })\`.
   - Wire fail-open logic: If the interceptor fails to load within 1200ms, immediately invoke \`onCancelConfirmed()\` so the customer is never blocked.

3. Wrap the existing "Cancel Subscription" button on the billing/settings page:
   - Intercept the \`onClick\` event.
   - Trigger \`openRetentionModal(...)\`.
   - If user claims an offer, call \`/api/boolbul/claim-offer\`, toast success ("Discount applied!"), and refresh subscription state.
   - If user confirms cancellation, proceed with native cancellation.

Use standard fetch with error handling. Do not alter existing styling outside the cancel trigger button.`;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header & Step Progress Bar */}
      <BrutalCard variant="cream" shadow="default" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs font-bold text-zinc-600 hover:text-pitch mb-1">
            ← BACK TO HOME
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-pitch flex items-center gap-2">
            RETENTION COCKPIT SETUP
          </h1>
        </div>

        {/* 3 Steps Indicator */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {[
            { num: 1, label: "KEYS" },
            { num: 2, label: "OFFERS" },
            { num: 3, label: "LAUNCH" },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num as 1 | 2 | 3)}
              className={`px-3 py-1.5 border-3 border-pitch font-black ${
                currentStep === s.num
                  ? "bg-lime text-pitch shadow-brutal-sm"
                  : "bg-white text-zinc-500 hover:text-pitch"
              }`}
            >
              0{s.num}. {s.label}
            </button>
          ))}
        </div>
      </BrutalCard>

      {/* STEP 1: DROP THE KEYS */}
      {currentStep === 1 && (
        <BrutalCard variant="cream" shadow="lg" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <DuctTapeBadge rotate="left">STEP 1: GATEWAY LINK</DuctTapeBadge>
              <h2 className="text-3xl font-black uppercase tracking-tight mt-2 text-pitch">
                DROP THE KEYS 🔑
              </h2>
              <p className="font-mono text-xs text-zinc-700 mt-1">
                Read-only & mutation permissions for discounts/pauses only. We can&apos;t touch your funds, we only stop your users from walking out into the cold.
              </p>
            </div>
            <div className="w-20 h-20 bg-lime border-3 border-pitch flex items-center justify-center shadow-brutal flex-shrink-0">
              <Image
                src="/mascot/bulbul-sticker-logo.png"
                alt="Bulbul Mascot"
                width={70}
                height={70}
                className="object-contain"
              />
            </div>
          </div>

          {/* Gateway Selector */}
          <div className="space-y-2">
            <label className="block font-mono text-xs font-black uppercase text-zinc-700">
              Select Primary Billing Gateway:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "dodo", name: "Dodo Payments", badge: "NATIVE FIRST", img: "/integrations/dodo-payments.png" },
                { id: "stripe", name: "Stripe", badge: "SUPPORTED", img: "/integrations/stripe.png" },
                { id: "lemon", name: "Lemon Squeezy", badge: "SUPPORTED", img: "/integrations/lemon-squeezy.png" },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGateway(g.id as any)}
                  className={`p-3 border-3 border-pitch text-left flex items-center justify-between transition-transform ${
                    gateway === g.id
                      ? "bg-lime text-pitch shadow-brutal translate-x-1"
                      : "bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Image src={g.img} alt={g.name} width={24} height={24} className="object-contain" />
                    <span className="font-black text-sm">{g.name}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.5 border border-pitch">
                    {g.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Execution Mode Selector (Zero-Trust vs Hosted) */}
          <div className="p-4 bg-white border-3 border-pitch space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-black uppercase">Execution Security Mode:</span>
              <span className="text-[11px] font-mono bg-blush px-2 py-0.5 border border-pitch font-bold">
                {executionMode === "zero-trust" ? "ENTERPRISE ZERO-TRUST" : "NO-CODE HOSTED"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExecutionMode("zero-trust")}
                className={`p-3 border-3 border-pitch text-left font-mono text-xs ${
                  executionMode === "zero-trust" ? "bg-lime font-bold shadow-brutal-sm" : "bg-cream"
                }`}
              >
                <div className="font-black text-sm mb-1">🛡️ Zero-Trust (Recommended)</div>
                <p className="text-zinc-600">
                  Your server makes the mutation using signed JWTs. No API keys ever stored on BoolBul.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExecutionMode("hosted")}
                className={`p-3 border-3 border-pitch text-left font-mono text-xs ${
                  executionMode === "hosted" ? "bg-lime font-bold shadow-brutal-sm" : "bg-cream"
                }`}
              >
                <div className="font-black text-sm mb-1">⚡ Hosted Scoped Key</div>
                <p className="text-zinc-600">
                  For Webflow/HTML builders. Encrypted with AES-256-GCM. We trigger discount on your behalf.
                </p>
              </button>
            </div>
          </div>

          {/* Key Input */}
          <div className="space-y-2">
            <label className="block font-mono text-xs font-black uppercase text-zinc-700">
              {gateway.toUpperCase()} API Key (Restricted / Scoped):
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="dodo_sec_live_..."
              className="w-full bg-white border-3 border-pitch p-3 font-mono text-sm focus:bg-lime/10 outline-none shadow-brutal-sm"
            />
            <span className="block font-mono text-[11px] text-zinc-500">
              * In Zero-Trust mode, this key is only used to verify your subscription catalog during setup.
            </span>
          </div>

          <div className="flex justify-end pt-4">
            <BrutalButton
              variant="lime"
              size="lg"
              onClick={() => setCurrentStep(2)}
            >
              Lock Keys & Setup Offers →
            </BrutalButton>
          </div>
        </BrutalCard>
      )}

      {/* STEP 2: THE OFFER BLUEPRINT */}
      {currentStep === 2 && (
        <BrutalCard variant="cream" shadow="lg" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <DuctTapeBadge rotate="left">STEP 2: RETENTION LOGIC</DuctTapeBadge>
              <h2 className="text-3xl font-black uppercase tracking-tight mt-2 text-pitch">
                THE OFFER BLUEPRINT 🎯
              </h2>
              <p className="font-mono text-xs text-zinc-700 mt-1">
                Configure what BoolBul offers your users based on their cancellation reason.
              </p>
            </div>
            <div className="w-20 h-20 bg-blush border-3 border-pitch flex items-center justify-center shadow-brutal flex-shrink-0">
              <Image
                src="/stickers/not-today.png"
                alt="Not Today"
                width={70}
                height={70}
                className="object-contain"
              />
            </div>
          </div>

          {/* Reason 1: Too expensive */}
          <div className="p-4 bg-white border-3 border-pitch space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-black uppercase text-crimson">
                Reason 1: &quot;Too expensive&quot;
              </span>
              <span className="text-[10px] font-mono bg-lime px-2 py-0.5 border border-pitch font-bold">
                HIGH CONVERTING
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: "50_2mo", label: "50% off for 2 mos" },
                { id: "30_3mo", label: "30% off for 3 mos" },
                { id: "1mo_free", label: "1 month Free" },
              ].map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setDiscountTier(tier.id)}
                  className={`p-2 border-2 border-pitch text-xs font-mono font-bold ${
                    discountTier === tier.id ? "bg-lime shadow-brutal-sm" : "bg-cream hover:bg-zinc-100"
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reason 2: Not using it right now */}
          <div className="p-4 bg-white border-3 border-pitch space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-black uppercase text-cobalt">
                Reason 2: &quot;Not using it right now&quot;
              </span>
              <span className="text-[10px] font-mono bg-blush px-2 py-0.5 border border-pitch font-bold">
                CHURN FREEZE
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: "30_day", label: "30-Day Pause (Zero charge)" },
                { id: "60_day", label: "60-Day Pause (Keep data)" },
                { id: "free_tier", label: "Downgrade to Free Tier" },
              ].map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setPauseTier(tier.id)}
                  className={`p-2 border-2 border-pitch text-xs font-mono font-bold ${
                    pauseTier === tier.id ? "bg-lime shadow-brutal-sm" : "bg-cream hover:bg-zinc-100"
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reason 3: Found a bug / Missing feature */}
          <div className="p-4 bg-white border-3 border-pitch flex items-center justify-between gap-4">
            <div>
              <span className="font-mono text-xs font-black uppercase block">
                Reason 3: &quot;Found a bug / Missing feature&quot;
              </span>
              <p className="font-mono text-xs text-zinc-600 mt-0.5">
                Pipes feedback directly into your Telegram / Discord webhook with public roadmap link.
              </p>
            </div>
            <span className="bg-lime px-3 py-1 border-2 border-pitch font-mono text-xs font-black">
              AUTO-WIRED
            </span>
          </div>

          {/* Reason 4: Switching to competitor */}
          <div className="p-4 bg-white border-3 border-pitch flex items-center justify-between gap-4">
            <div>
              <span className="font-mono text-xs font-black uppercase block">
                Reason 4: &quot;Switching to competitor&quot;
              </span>
              <p className="font-mono text-xs text-zinc-600 mt-0.5">
                Displays 1-to-1 competitor teardown comparison modal + price match offer.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCompetitorMatch(!competitorMatch)}
              className={`px-3 py-1 border-2 border-pitch font-mono text-xs font-black ${
                competitorMatch ? "bg-lime shadow-brutal-sm" : "bg-zinc-200"
              }`}
            >
              {competitorMatch ? "ENABLED" : "DISABLED"}
            </button>
          </div>

          <div className="flex justify-between pt-4">
            <BrutalButton variant="white" size="md" onClick={() => setCurrentStep(1)}>
              ← Back
            </BrutalButton>
            <BrutalButton variant="lime" size="lg" onClick={() => setCurrentStep(3)}>
              Generate Launch Guns →
            </BrutalButton>
          </div>
        </BrutalCard>
      )}

      {/* STEP 3: THE 4 LAUNCH GUNS */}
      {currentStep === 3 && (
        <BrutalCard variant="cream" shadow="lg" className="space-y-6">
          <div>
            <DuctTapeBadge rotate="right">STEP 3: DEPLOYMENT</DuctTapeBadge>
            <h2 className="text-3xl font-black uppercase tracking-tight mt-2 text-pitch">
              THE 4 LAUNCH GUNS 🔫
            </h2>
            <p className="font-mono text-xs text-zinc-700 mt-1">
              Pick your weapon of choice. Copy, paste, and start intercepting churn in 45 seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gun 1: Cursor / Claude Prompt */}
            <div className="p-5 bg-white border-3 border-pitch shadow-brutal flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">⚡</span>
                  <span className="font-black text-sm uppercase">1. Cursor / Claude Code Prompt</span>
                </div>
                <p className="font-mono text-xs text-zinc-600 mb-4">
                  One-click prompt to paste directly into your AI terminal. Zero documentation reading.
                </p>
                <div className="bg-zinc-900 text-lime font-mono text-[11px] p-3 border-2 border-pitch h-24 overflow-y-auto mb-4">
                  {cursorPrompt.slice(0, 240)}...
                </div>
              </div>

              <BrutalButton
                variant="lime"
                size="sm"
                onClick={() => copyToClipboard(cursorPrompt, 1)}
              >
                {copiedIndex === 1 ? "✓ Prompt Copied!" : "Copy Cursor / Claude Prompt"}
              </BrutalButton>
            </div>

            {/* Gun 2: 1-Line Embed Script */}
            <div className="p-5 bg-white border-3 border-pitch shadow-brutal flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📜</span>
                  <span className="font-black text-sm uppercase">2. 1-Line Embed Script</span>
                </div>
                <p className="font-mono text-xs text-zinc-600 mb-4">
                  Simple script tag for Webflow, Framer, and custom static HTML projects.
                </p>
                <div className="bg-zinc-900 text-lime font-mono text-xs p-3 border-2 border-pitch mb-4 break-all">
                  {`<script src="https://cdn.boolbul.com/v1/intercept.js" data-key="${samplePublicKey}"></script>`}
                </div>
              </div>

              <BrutalButton
                variant="white"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    `<script src="https://cdn.boolbul.com/v1/intercept.js" data-key="${samplePublicKey}"></script>`,
                    2
                  )
                }
              >
                {copiedIndex === 2 ? "✓ Script Copied!" : "Copy <script> Tag"}
              </BrutalButton>
            </div>

            {/* Gun 3: Next.js React Hook */}
            <div className="p-5 bg-white border-3 border-pitch shadow-brutal flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">⚛️</span>
                  <span className="font-black text-sm uppercase">3. Next.js / React Hook</span>
                </div>
                <p className="font-mono text-xs text-zinc-600 mb-4">
                  Custom <code className="bg-cream px-1 border border-pitch">useBoolBul()</code> hook for App Router and client components.
                </p>
                <div className="bg-zinc-900 text-lime font-mono text-xs p-3 border-2 border-pitch mb-4">
                  {`npm i @boolbul/react`}
                </div>
              </div>

              <BrutalButton
                variant="white"
                size="sm"
                onClick={() => copyToClipboard("npm i @boolbul/react", 3)}
              >
                {copiedIndex === 3 ? "✓ Command Copied!" : "Copy Install Command"}
              </BrutalButton>
            </div>

            {/* Gun 4: Hosted Direct Link */}
            <div className="p-5 bg-white border-3 border-pitch shadow-brutal flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🔗</span>
                  <span className="font-black text-sm uppercase">4. Hosted Direct Redirect</span>
                </div>
                <p className="font-mono text-xs text-zinc-600 mb-4">
                  Hosted deflection URL to redirect users directly from email or Typeform cancellation requests.
                </p>
                <div className="bg-zinc-900 text-lime font-mono text-xs p-3 border-2 border-pitch mb-4 break-all">
                  {`https://boolbul.com/rescue/${samplePublicKey}`}
                </div>
              </div>

              <BrutalButton
                variant="white"
                size="sm"
                onClick={() => copyToClipboard(`https://boolbul.com/rescue/${samplePublicKey}`, 4)}
              >
                {copiedIndex === 4 ? "✓ URL Copied!" : "Copy Hosted URL"}
              </BrutalButton>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t-2 border-pitch">
            <BrutalButton variant="white" size="md" onClick={() => setCurrentStep(2)}>
              ← Back to Offers
            </BrutalButton>
            <Link href="/dashboard">
              <BrutalButton variant="lime" size="lg">
                Enter Cockpit Dashboard 🚀
              </BrutalButton>
            </Link>
          </div>
        </BrutalCard>
      )}
    </div>
  );
}

