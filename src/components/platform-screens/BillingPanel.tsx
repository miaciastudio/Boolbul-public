"use client";

import React, { useState } from "react";
import { BrutalCard } from "@/components/ui-primitives/BrutalCard";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";

interface BillingPanelProps {
  plan?: string | null;
  status?: string | null;
  mode?: string | null;
  canManage?: boolean;
}

export function BillingPanel({
  plan = "free",
  status = "trialing",
  mode = "test_mode",
  canManage = true,
}: BillingPanelProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayPlan = (plan || "free").toUpperCase();
  const displayStatus = (status || "trialing").toUpperCase();
  const isTrial = status === "trialing" || plan === "free";

  const handleUpgrade = async (selectedPlan: "starter" | "pro") => {
    if (!canManage) return;
    setLoadingPlan(selectedPlan);
    setError(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to start checkout session");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err: unknown) {
      console.error("Checkout error:", err);
      // Fallback: Inform user about Dodo Payments test mode sandbox
      setError(
        err instanceof Error
          ? err.message
          : "Dodo Payments sandbox checkout is initializing. Please verify product IDs in settings."
      );
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <BrutalCard className="bg-cream border-4-black shadow-brutal p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-pitch pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-black uppercase text-zinc-600">WORKSPACE BILLING</span>
            <span className="border border-pitch bg-amber-200 px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
              {mode === "test_mode" ? "Dodo Sandbox" : "Live Gateway"}
            </span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-pitch mt-1">
            Current Tier: <span className="bg-lime px-2 py-0.5 border-2 border-pitch">{displayPlan}</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-zinc-600">Status:</span>
          <span
            className={`border-2 border-pitch px-3 py-1 font-mono text-xs font-black uppercase shadow-brutal-sm ${
              status === "active"
                ? "bg-lime text-pitch"
                : status === "paused"
                ? "bg-amber-300 text-pitch"
                : "bg-blush text-pitch"
            }`}
          >
            ● {displayStatus}
          </span>
        </div>
      </div>

      {error && (
        <div className="border-2 border-pitch bg-rose-100 p-3 text-xs font-mono font-bold text-red-900 shadow-brutal-sm">
          ⚠️ {error}
        </div>
      )}

      {isTrial && (
        <div className="bg-white border-2 border-pitch p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="font-mono text-xs text-zinc-800">
            <span className="font-bold">⚡ Free Trial / Community Mode:</span> All edge deflection features are active. Upgrade to Starter or Pro to increase deflection capacity and lock in premium exit analytics.
          </div>
        </div>
      )}

      {/* Plan selection grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Starter Plan */}
        <div
          className={`border-3 border-pitch p-4 flex flex-col justify-between space-y-3 ${
            plan === "starter" ? "bg-lime/20 ring-2 ring-pitch" : "bg-white"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg uppercase tracking-tight">Starter</h3>
              <span className="font-mono text-sm font-black bg-lime px-2 py-0.5 border border-pitch">$19/mo</span>
            </div>
            <p className="font-mono text-xs text-zinc-700 mt-1">
              Up to 500 deflection sessions/mo · Dynamic discount rules · 1 workspace
            </p>
          </div>
          {plan === "starter" ? (
            <span className="text-center font-mono text-xs font-bold text-zinc-600 py-2 border-2 border-pitch bg-zinc-100">
              ✓ CURRENT PLAN
            </span>
          ) : (
            <BrutalButton
              variant="white"
              size="sm"
              className="w-full text-xs"
              onClick={() => handleUpgrade("starter")}
              disabled={loadingPlan !== null || !canManage}
            >
              {loadingPlan === "starter" ? "Connecting..." : "Select Starter ($19)"}
            </BrutalButton>
          )}
        </div>

        {/* Pro Plan */}
        <div
          className={`border-3 border-pitch p-4 flex flex-col justify-between space-y-3 ${
            plan === "pro" ? "bg-lime/20 ring-2 ring-pitch" : "bg-white"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg uppercase tracking-tight">Pro</h3>
                <span className="bg-blush border border-pitch text-[10px] font-mono font-black px-1.5 py-0.5">POPULAR</span>
              </div>
              <span className="font-mono text-sm font-black bg-lime px-2 py-0.5 border border-pitch">$49/mo</span>
            </div>
            <p className="font-mono text-xs text-zinc-700 mt-1">
              Unlimited deflection sessions · Turso edge rules · Custom webhooks & analytics
            </p>
          </div>
          {plan === "pro" ? (
            <span className="text-center font-mono text-xs font-bold text-zinc-600 py-2 border-2 border-pitch bg-zinc-100">
              ✓ CURRENT PLAN
            </span>
          ) : (
            <BrutalButton
              variant="lime"
              size="sm"
              className="w-full text-xs"
              onClick={() => handleUpgrade("pro")}
              disabled={loadingPlan !== null || !canManage}
            >
              {loadingPlan === "pro" ? "Connecting..." : "Upgrade to Pro ($49)"}
            </BrutalButton>
          )}
        </div>
      </div>

      <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-zinc-600">
        <span>🔒 Zero Dark Patterns: Cancel or pause anytime from your dashboard.</span>
        <span>Powered by Dodo Payments</span>
      </div>
    </BrutalCard>
  );
}

