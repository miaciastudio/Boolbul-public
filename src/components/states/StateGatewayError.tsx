import React from "react";
import Image from "next/image";
import { BrutalCard } from "@/components/ui-primitives/BrutalCard";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";

interface StateGatewayErrorProps {
  onRetry?: () => void;
  errorMessage?: string;
}

export function StateGatewayError({
  onRetry,
  errorMessage = "Gateway rejected this key. Looks like missing subscription/discount permissions. Check the docs before we cry.",
}: StateGatewayErrorProps) {
  return (
    <BrutalCard variant="cream" shadow="xl" className="max-w-md mx-auto text-center space-y-4">
      <div className="w-24 h-24 mx-auto bg-crimson border-3 border-pitch shadow-brutal flex items-center justify-center">
        <Image
          src="/stickers/skill-issue.png"
          alt="Skill Issue / Side Eye"
          width={88}
          height={88}
          className="object-contain"
        />
      </div>

      <div className="space-y-1">
        <span className="bg-pitch text-white px-2 py-0.5 border border-pitch font-mono text-xs font-black uppercase">
          GATEWAY AUTH REJECTED
        </span>
        <h2 className="text-4xl font-black uppercase tracking-tight text-crimson">
          BRO... WHAT?
        </h2>
      </div>

      <p className="font-mono text-xs text-zinc-800 leading-relaxed bg-white border-2 border-pitch p-3">
        {errorMessage}
      </p>

      {onRetry && (
        <BrutalButton variant="crimson" size="md" onClick={onRetry} className="w-full">
          Re-enter API Key 🔄
        </BrutalButton>
      )}
    </BrutalCard>
  );
}

