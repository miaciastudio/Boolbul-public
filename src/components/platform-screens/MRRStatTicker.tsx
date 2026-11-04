import React from "react";
import { BrutalCard } from "@/components/ui-primitives/BrutalCard";

interface MRRStatTickerProps {
  savedMRR?: number;
  recoveredSubs?: number;
  deflectionRate?: number;
}

export function MRRStatTicker({
  savedMRR = 2840,
  recoveredSubs = 47,
  deflectionRate = 34.2,
}: MRRStatTickerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <BrutalCard variant="cream" shadow="default" className="p-4">
        <span className="font-mono text-xs font-bold text-zinc-600 uppercase block">
          Total MRR Protected
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-3xl md:text-4xl font-black text-pitch">
            ${savedMRR.toLocaleString()}
          </span>
          <span className="text-xs font-mono font-bold bg-lime px-1.5 py-0.5 border border-pitch text-pitch">
            +$640 this mo
          </span>
        </div>
      </BrutalCard>

      <BrutalCard variant="cream" shadow="default" className="p-4">
        <span className="font-mono text-xs font-bold text-zinc-600 uppercase block">
          Recovered Subscribers
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-3xl md:text-4xl font-black text-pitch">
            {recoveredSubs}
          </span>
          <span className="text-xs font-mono font-bold bg-blush px-1.5 py-0.5 border border-pitch text-pitch">
            87% still active
          </span>
        </div>
      </BrutalCard>

      <BrutalCard variant="cream" shadow="default" className="p-4">
        <span className="font-mono text-xs font-bold text-zinc-600 uppercase block">
          Cancel Intercept Rate
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-3xl md:text-4xl font-black text-cobalt">
            {deflectionRate}%
          </span>
          <span className="text-xs font-mono font-bold bg-lime px-1.5 py-0.5 border border-pitch text-pitch">
            Top 5% of SaaS
          </span>
        </div>
      </BrutalCard>
    </div>
  );
}

