"use client";

import React, { useState } from "react";
import Image from "next/image";
import { BrutalCard } from "@/components/ui-primitives/BrutalCard";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";

export function RuleMatrixTuner() {
  const [discountPct, setDiscountPct] = useState(50);
  const [pauseDays, setPauseDays] = useState(30);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSave = () => {
    setSaveStatus("Syncing with Turso Edge DB...");
    setTimeout(() => {
      setSaveStatus("✓ Live at Edge (<10ms globally)");
      setTimeout(() => setSaveStatus(null), 3000);
    }, 600);
  };

  return (
    <BrutalCard variant="cream" shadow="lg" className="space-y-4">
      <div className="flex items-center justify-between border-b-3 border-pitch pb-3">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-pitch">
            RULE MATRIX & OFFER TUNER
          </h2>
          <p className="font-mono text-xs text-zinc-600">
            Tune discount percentages and pause durations pushed to Turso Edge replicas.
          </p>
        </div>
        <span className="font-mono text-xs font-black bg-lime px-2 py-1 border border-pitch">
          SYNC ENGINE: READY
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Discount Tuner */}
        <div className="p-4 bg-white border-3 border-pitch space-y-3">
          <div className="flex justify-between items-center font-mono text-xs">
            <span className="font-black uppercase">Primary Churn Discount:</span>
            <span className="font-black bg-lime px-2 py-0.5 border border-pitch text-sm">
              {discountPct}% OFF
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="80"
            step="5"
            value={discountPct}
            onChange={(e) => setDiscountPct(Number(e.target.value))}
            className="w-full accent-lime cursor-pointer"
          />
          <div className="flex justify-between font-mono text-[11px] text-zinc-500">
            <span>10% (Subtle)</span>
            <span>50% (Recommended)</span>
            <span>80% (Aggressive)</span>
          </div>
        </div>

        {/* Pause Tuner */}
        <div className="p-4 bg-white border-3 border-pitch space-y-3">
          <div className="flex justify-between items-center font-mono text-xs">
            <span className="font-black uppercase">Max Subscription Freeze:</span>
            <span className="font-black bg-blush px-2 py-0.5 border border-pitch text-sm">
              {pauseDays} DAYS
            </span>
          </div>
          <input
            type="range"
            min="14"
            max="90"
            step="7"
            value={pauseDays}
            onChange={(e) => setPauseDays(Number(e.target.value))}
            className="w-full accent-cobalt cursor-pointer"
          />
          <div className="flex justify-between font-mono text-[11px] text-zinc-500">
            <span>14 Days</span>
            <span>30 Days (Standard)</span>
            <span>90 Days (Sabbatical)</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="font-mono text-xs font-bold text-cobalt">
          {saveStatus}
        </span>
        <BrutalButton variant="lime" size="sm" onClick={handleSave}>
          Push Changes to Edge →
        </BrutalButton>
      </div>
    </BrutalCard>
  );
}

