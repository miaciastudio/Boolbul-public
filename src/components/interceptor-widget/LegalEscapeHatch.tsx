import React from "react";
import Image from "next/image";

interface LegalEscapeHatchProps {
  onCancelClick: () => void;
  label?: string;
}

export function LegalEscapeHatch({
  onCancelClick,
  label = "Proceed to cancel",
}: LegalEscapeHatchProps) {
  return (
    <div className="w-full text-center">
      <button
        type="button"
        onClick={onCancelClick}
        aria-label="Proceed to cancel"
        className="min-h-11 w-full border-3 border-black bg-black px-4 py-3 font-mono text-sm font-black text-white hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      >
        {label}
      </button>

      <div className="mt-2 flex items-center justify-center gap-2 font-mono text-xs leading-relaxed text-zinc-700">
        <Image
          src="/compliance/ftc-compliant-escape-hatch.png"
          alt=""
          width={16}
          height={16}
          className="shrink-0 object-contain"
        />
        <span>No offer or survey required to continue.</span>
      </div>
    </div>
  );
}
