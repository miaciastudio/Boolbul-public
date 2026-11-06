import React from "react";
import Link from "next/link";
import { DuctTapeBadge } from "@/components/ui-primitives/DuctTapeBadge";

export const metadata = {
  title: "Client SDK & Modal Reference | BoolBul Docs",
  description: "Complete reference for the BoolBul Client SDK: openRetentionModal, props, events, and fail-open guarantees.",
};

export default function ClientSdkPage() {
  return (
    <div className="space-y-6 font-mono">
      <div className="space-y-2 border-b-3 border-pitch pb-4 font-sans">
        <DuctTapeBadge rotate="none">CLIENT SDK SPECIFICATION</DuctTapeBadge>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-pitch">
          Client SDK & Modal Reference
        </h1>
        <p className="font-mono text-sm text-zinc-700">
          Lightweight, zero-dependency modal interceptor with guaranteed 1500ms fail-open SLA.
        </p>
      </div>

      {/* Function signature */}
      <div className="space-y-3">
        <h2 className="text-lg font-black uppercase text-pitch font-sans">openRetentionModal(options)</h2>
        <p className="text-xs text-zinc-700">
          Opens the responsive retention modal with your configured theme (<code className="bg-zinc-200 px-1">neo_brutalist</code>, <code className="bg-zinc-200 px-1">minimal_slate</code>, or <code className="bg-zinc-200 px-1">midnight_oled</code>).
        </p>

        <pre className="p-4 bg-zinc-950 text-lime text-xs border-3 border-pitch overflow-x-auto leading-relaxed">
{`interface RetentionModalOptions {
  publicKey: string;          // Your workspace public key (bb_pub_...)
  customerId: string;         // Customer identifier in your database
  subscriptionId: string;     // Gateway subscription ID (Dodo/Stripe)
  planPrice?: number;         // Monthly plan price in USD (e.g. 49)
  failOpenTimeoutMs?: number; // Fail-open deadline in ms (Default: 1500ms)
  
  onCancelConfirmed: () => void | Promise<void>;
  onOfferAccepted: (offer: ClaimedOffer) => void | Promise<void>;
  onClose?: () => void;
}`}
        </pre>
      </div>

      {/* Parameters Table */}
      <div className="space-y-3 border-t-2 border-pitch pt-4 font-sans">
        <h3 className="text-sm font-black uppercase text-pitch">Parameter Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-2 border-pitch">
            <thead className="bg-white border-b-2 border-pitch">
              <tr>
                <th className="p-2.5">Parameter</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5">Required</th>
                <th className="p-2.5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-300 bg-white/60">
              <tr>
                <td className="p-2.5 font-bold">publicKey</td>
                <td className="p-2.5 text-zinc-600">string</td>
                <td className="p-2.5 font-bold text-pitch">Yes</td>
                <td className="p-2.5">Workspace public key provisioned in your Cockpit.</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold">customerId</td>
                <td className="p-2.5 text-zinc-600">string</td>
                <td className="p-2.5 font-bold text-pitch">Yes</td>
                <td className="p-2.5">Your internal user ID or billing customer ID.</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold">subscriptionId</td>
                <td className="p-2.5 text-zinc-600">string</td>
                <td className="p-2.5 font-bold text-pitch">Yes</td>
                <td className="p-2.5">Subscription identifier (e.g. sub_123 or dodo sub).</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold">onCancelConfirmed</td>
                <td className="p-2.5 text-zinc-600">function</td>
                <td className="p-2.5 font-bold text-pitch">Yes</td>
                <td className="p-2.5">Invoked immediately when customer clicks the escape hatch.</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold">onOfferAccepted</td>
                <td className="p-2.5 text-zinc-600">function</td>
                <td className="p-2.5 font-bold text-pitch">Yes</td>
                <td className="p-2.5">Invoked with tamper-proof offer token when discount/pause is chosen.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-between border-t-2 border-pitch text-xs font-sans">
        <Link href="/docs/quickstart" className="font-mono font-bold underline text-zinc-600">
          ← Quickstart Guide
        </Link>
        <Link
          href="/docs/webhooks"
          className="border-3 border-pitch bg-lime px-4 py-2 font-mono font-black uppercase text-pitch shadow-brutal-sm hover:bg-lime-hover"
        >
          Next: Webhooks & Dodo →
        </Link>
      </div>
    </div>
  );
}

