"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import { BrutalCard } from "@/components/ui-primitives/BrutalCard";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";

interface StateSavedSuccessProps {
  customerName?: string;
  offerText?: string;
  mrrSaved?: number;
  onDismiss?: () => void;
}

export function StateSavedSuccess({
  customerName = "@alex_dev",
  offerText = "30% off for 3 months",
  mrrSaved = 29,
  onDismiss,
}: StateSavedSuccessProps) {
  useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#1D2BFF", "#CCFF00", "#E11D24"],
    });
  }, []);

  return (
    <BrutalCard variant="cream" shadow="xl" className="max-w-md mx-auto text-center space-y-4">
      <div className="w-24 h-24 mx-auto bg-lime border-3 border-pitch shadow-brutal flex items-center justify-center">
        <Image
          src="/stickers/not-today.png"
          alt="Not Today"
          width={88}
          height={88}
          className="object-contain"
        />
      </div>

      <div className="space-y-1">
        <span className="bg-crimson text-white px-2 py-0.5 border border-pitch font-mono text-xs font-black uppercase">
          CHURN INTERCEPTED 🎉
        </span>
        <h2 className="text-4xl font-black uppercase tracking-tight text-pitch">
          NOT TODAY.
        </h2>
      </div>

      <p className="font-mono text-xs text-zinc-800 leading-relaxed">
        User <strong className="text-pitch">{customerName}</strong> just tried to bail. We offered{" "}
        <strong className="bg-lime px-1 border border-pitch">{offerText}</strong>. They stayed.
      </p>

      <div className="bg-white border-3 border-pitch p-3 shadow-brutal-sm font-mono text-sm font-black text-pitch">
        YOU JUST SAVED <span className="text-crimson">+${mrrSaved} MRR</span>
      </div>

      {onDismiss && (
        <BrutalButton variant="lime" size="md" onClick={onDismiss} className="w-full">
          Back to Cockpit →
        </BrutalButton>
      )}
    </BrutalCard>
  );
}

