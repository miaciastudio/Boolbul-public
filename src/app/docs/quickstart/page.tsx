import React from "react";
import Link from "next/link";
import { DuctTapeBadge } from "@/components/ui-primitives/DuctTapeBadge";

export const metadata = {
  title: "5-Minute Quickstart Integration | BoolBul Docs",
  description: "Step-by-step 5-minute guide to embed BoolBul's in-app cancellation interceptor into your SaaS app.",
};

export default function QuickstartPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b-3 border-pitch pb-4">
        <DuctTapeBadge rotate="none">INTEGRATION TUTORIAL</DuctTapeBadge>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-pitch">
          5-Minute Quickstart Guide
        </h1>
        <p className="font-mono text-sm text-zinc-700">
          Follow these 3 simple steps to integrate BoolBul into your Next.js, React, or HTML app.
        </p>
      </div>

      {/* Step 1 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-black text-white font-mono text-xs font-black flex items-center justify-center">
            1
          </span>
          <h2 className="text-lg font-black uppercase text-pitch">Get Your Workspace Public Key</h2>
        </div>
        <p className="font-mono text-xs text-zinc-700">
          Sign in to your <Link href="/login" className="underline font-bold text-pitch">BoolBul Cockpit</Link> and complete the 4-step onboarding wizard. Copy your <code className="bg-zinc-200 px-1 font-bold">bb_pub_...</code> public key.
        </p>
      </div>

      {/* Step 2 */}
      <div className="space-y-3 border-t-2 border-pitch pt-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-black text-white font-mono text-xs font-black flex items-center justify-center">
            2
          </span>
          <h2 className="text-lg font-black uppercase text-pitch">Wrap Your Cancellation Button</h2>
        </div>
        <p className="font-mono text-xs text-zinc-700">
          When the user clicks "Cancel Subscription" in your billing settings, trigger BoolBul before calling your payment gateway API:
        </p>

        <pre className="p-4 bg-zinc-950 text-lime font-mono text-xs border-3 border-pitch overflow-x-auto leading-relaxed">
{`import { openRetentionModal } from "@boolbul/sdk";

function handleCancelClick() {
  openRetentionModal({
    publicKey: process.env.NEXT_PUBLIC_BOOLBUL_KEY,
    customerId: user.customerId,
    subscriptionId: user.subscriptionId,
    planPrice: 49,
    
    // 1. If customer chooses the FTC escape hatch:
    onCancelConfirmed: async () => {
      await fetch("/api/billing/cancel", { method: "POST" });
      window.location.reload();
    },

    // 2. If customer accepts the rescue package (e.g. 50% discount):
    onOfferAccepted: async (offer) => {
      await fetch("/api/billing/apply-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerToken: offer.token }),
      });
      alert("Discount applied! Thank you for staying.");
    }
  });
}`}
        </pre>
      </div>

      {/* Step 3 */}
      <div className="space-y-3 border-t-2 border-pitch pt-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-black text-white font-mono text-xs font-black flex items-center justify-center">
            3
          </span>
          <h2 className="text-lg font-black uppercase text-pitch">Verify Your Connection</h2>
        </div>
        <p className="font-mono text-xs text-zinc-700">
          Open your app, click your cancellation button, and test both branches. Your rescued MRR and exit events will immediately stream into your <Link href="/dashboard" className="underline font-bold text-pitch">Cockpit</Link>.
        </p>
      </div>

      <div className="pt-4 flex items-center justify-between border-t-2 border-pitch font-mono text-xs">
        <Link href="/docs" className="font-bold underline text-zinc-600">
          ← Overview & Architecture
        </Link>
        <Link
          href="/docs/client-sdk"
          className="border-3 border-pitch bg-lime px-4 py-2 font-black uppercase text-pitch shadow-brutal-sm hover:bg-lime-hover"
        >
          Next: Client SDK Reference →
        </Link>
      </div>
    </div>
  );
}

