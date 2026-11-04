import React from "react";
import Image from "next/image";
import { BrutalCard } from "@/components/ui-primitives/BrutalCard";

export function StateEmptyQuiet() {
  return (
    <BrutalCard variant="cream" shadow="default" className="text-center py-10 space-y-4">
      <div className="w-20 h-20 mx-auto bg-cobalt border-3 border-pitch shadow-brutal flex items-center justify-center">
        <Image
          src="/memes/churn-dont-know-her.png"
          alt="Churn? I Don't Know Her"
          width={72}
          height={72}
          className="object-contain"
        />
      </div>

      <div>
        <h3 className="text-3xl font-black uppercase tracking-tight text-pitch">
          DEAD QUIET. 🔌
        </h3>
        <p className="font-mono text-xs text-zinc-700 max-w-sm mx-auto mt-2">
          Nobody has hit cancel yet. Either your product is cracked, or your cancel button is hidden too well.
        </p>
      </div>

      <div className="inline-block bg-lime border-2 border-pitch px-3 py-1 font-mono text-[11px] font-black uppercase">
        LISTENING FOR DODO PAYMENT EVENTS...
      </div>
    </BrutalCard>
  );
}

