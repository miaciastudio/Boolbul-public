import React from "react";
import Link from "next/link";
import { DuctTapeBadge } from "@/components/ui-primitives/DuctTapeBadge";

export const metadata = {
  title: "Documentation & Architecture Overview | BoolBul",
  description: "Learn how BoolBul intercepts in-app subscription cancellations with <10ms edge latency and zero dark patterns.",
};

export default function DocsOverviewPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 border-b-3 border-pitch pb-4">
        <DuctTapeBadge rotate="none">DEVELOPER SPECIFICATION</DuctTapeBadge>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-pitch">
          BoolBul Core Architecture & Overview
        </h1>
        <p className="font-mono text-sm text-zinc-700 leading-relaxed max-w-2xl">
          BoolBul is an ultra-low-latency, in-app cancellation interceptor and exit telemetry engine built specifically for solo SaaS founders and indie hackers ($500 to $25k MRR).
        </p>
      </div>

      {/* Core Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
        <div className="p-4 bg-white border-3 border-pitch space-y-1">
          <span className="font-black text-sm block text-pitch">⚡ &lt;10ms Edge Engine</span>
          <p className="text-zinc-600">Turso LibSQL edge replicas evaluate discount and pause eligibility closest to the user.</p>
        </div>
        <div className="p-4 bg-white border-3 border-pitch space-y-1">
          <span className="font-black text-sm block text-pitch">⚖️ 0% Dark Patterns</span>
          <p className="text-zinc-600">Strictly conforms to FTC 16 CFR § 425 & California ARL with persistent 1-click escape hatch.</p>
        </div>
        <div className="p-4 bg-white border-3 border-pitch space-y-1">
          <span className="font-black text-sm block text-pitch">🛡️ 1500ms Fail-Open</span>
          <p className="text-zinc-600">If edge or network fails, customer is immediately allowed to cancel without being trapped.</p>
        </div>
      </div>

      {/* Architectural Flow Diagram */}
      <div className="space-y-3">
        <h2 className="text-xl font-black uppercase text-pitch">System Flow & Data Boundary</h2>
        <div className="p-4 bg-zinc-950 text-lime font-mono text-xs border-3 border-pitch overflow-x-auto leading-relaxed">
{`+---------------------------------------------------------------------------------+
|                                 USER BROWSER                                    |
|  [Cancel Subscription Button]  -->  openRetentionModal({ publicKey, ... })      |
+---------------------------------------------------------------------------------+
                                       |
                                       | (1) POST /api/v1/intercept/init (publicKey)
                                       v
+---------------------------------------------------------------------------------+
|                       BOOLBUL EDGE RUNTIME (Cloudflare)                        |
|  - Queries Turso LibSQL Edge Replicas (<10ms globally)                          |
|  - Evaluates MRR triggers, active discounts, and pause rules                   |
|  - Generates tamper-proof initToken & single-use nonce                          |
+---------------------------------------------------------------------------------+
          |                                                     |
          | If Customer Claims Offer                            | If Customer Clicks
          v                                                     | Escape Hatch
+---------------------------------------+             +---------------------------+
| (2) POST /api/v1/intercept/claim      |             | (3) onCancelConfirmed()   |
| Returns HMAC-signed offerJwt          |             | Native billing cancel     |
| Backend executes Dodo/Stripe mutation |             | executed immediately      |
+---------------------------------------+             +---------------------------+`}
        </div>
      </div>

      {/* Security & Obfuscation Guarantees */}
      <div className="space-y-3 border-t-2 border-pitch pt-4 font-mono text-xs leading-relaxed text-zinc-800">
        <h3 className="font-black text-sm uppercase text-pitch">Zero-Trust Credential Isolation</h3>
        <p>
          BoolBul follows strict zero-trust isolation: <strong>No secret keys ever touch your frontend bundle or unauthenticated visitors</strong>. Your workspace <code className="bg-zinc-200 px-1 text-pitch">bb_pub_...</code> public key is safe for client applications, while HMAC signing secrets remain strictly on your authenticated backend.
        </p>
      </div>

      <div className="pt-4 flex items-center justify-between border-t-2 border-pitch">
        <Link href="/" className="font-mono text-xs font-bold underline text-zinc-600">
          ← Back to BoolBul Home
        </Link>
        <Link
          href="/docs/quickstart"
          className="border-3 border-pitch bg-lime px-4 py-2 font-mono text-xs font-black uppercase text-pitch shadow-brutal-sm hover:bg-lime-hover"
        >
          Next: 5-Minute Quickstart →
        </Link>
      </div>
    </div>
  );
}

