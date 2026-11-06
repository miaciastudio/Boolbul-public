import React from "react";
import Link from "next/link";
import { DuctTapeBadge } from "@/components/ui-primitives/DuctTapeBadge";

export const metadata = {
  title: "FTC Click-to-Cancel & California ARL Compliance | BoolBul Docs",
  description: "Legal overview of FTC 16 CFR § 425 and California ARL rules, and how BoolBul guarantees anti-dark-pattern compliance.",
};

export default function FtcCompliancePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b-3 border-pitch pb-4">
        <DuctTapeBadge rotate="none">REGULATORY & LEGAL STANDARDS</DuctTapeBadge>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-pitch">
          FTC Click-to-Cancel & Anti-Dark-Pattern Compliance
        </h1>
        <p className="font-mono text-sm text-zinc-700">
          How BoolBul keeps your SaaS legally compliant with federal and state automatic renewal regulations.
        </p>
      </div>

      <div className="space-y-4 font-mono text-xs leading-relaxed text-zinc-800">
        <h2 className="text-lg font-black uppercase text-pitch font-sans">
          The FTC "Click to Cancel" Rule (16 CFR Part 425)
        </h2>
        <p>
          The Federal Trade Commission’s final rule mandates that cancellation mechanisms must be <strong>at least as easy to use as the mechanism used to initiate the subscription</strong>. Sellers are prohibited from imposing unreasonable barriers, hiding cancellation mechanisms, or requiring consumers to navigate endless labyrinths of retention offers.
        </p>

        <h3 className="text-sm font-black uppercase text-pitch font-sans pt-2">
          California Automatic Renewal Law (ARL)
        </h3>
        <p>
          California Business & Professions Code § 17600 et seq. mandates that consumers who sign up online must be able to cancel online <strong>immediately and without obstructions</strong>.
        </p>
      </div>

      {/* BoolBul Guardrails List */}
      <div className="space-y-3 border-t-2 border-pitch pt-4 font-mono text-xs">
        <h3 className="text-sm font-black uppercase text-pitch font-sans">
          How BoolBul Enforces Compliance By Code:
        </h3>
        <div className="space-y-2">
          <div className="p-3 bg-white border-2 border-pitch flex items-start gap-3">
            <span className="text-emerald-600 font-bold text-sm">✓</span>
            <div>
              <strong className="text-pitch block">Mandatory High-Contrast Escape Hatch:</strong>
              The "Proceed to cancel" button is permanently rendered with WCAG AA 4.5:1 contrast. It cannot be styled with <code className="bg-zinc-200 px-1">opacity: 0</code> or <code className="bg-zinc-200 px-1">display: none</code>.
            </div>
          </div>

          <div className="p-3 bg-white border-2 border-pitch flex items-start gap-3">
            <span className="text-emerald-600 font-bold text-sm">✓</span>
            <div>
              <strong className="text-pitch block">Zero Delay Timers:</strong>
              BoolBul never injects artificial countdown timers (e.g. "Wait 10 seconds to cancel").
            </div>
          </div>

          <div className="p-3 bg-white border-2 border-pitch flex items-start gap-3">
            <span className="text-emerald-600 font-bold text-sm">✓</span>
            <div>
              <strong className="text-pitch block">Single-Click Immediate Execution:</strong>
              Clicking the escape hatch directly invokes your native cancellation callback without triggering secondary retention prompts.
            </div>
          </div>

          <div className="p-3 bg-white border-2 border-pitch flex items-start gap-3">
            <span className="text-emerald-600 font-bold text-sm">✓</span>
            <div>
              <strong className="text-pitch block">1500ms Fail-Open Guarantee:</strong>
              If the edge evaluation network fails or exceeds 1500ms, the modal automatically falls open and grants cancellation.
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-between border-t-2 border-pitch font-mono text-xs">
        <Link href="/docs/webhooks" className="font-bold underline text-zinc-600">
          ← Webhooks & Dodo
        </Link>
        <Link
          href="/docs"
          className="border-3 border-pitch bg-lime px-4 py-2 font-black uppercase text-pitch shadow-brutal-sm hover:bg-lime-hover"
        >
          Return to Overview ↺
        </Link>
      </div>
    </div>
  );
}

