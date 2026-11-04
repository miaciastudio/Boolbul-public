import React from "react";
import Image from "next/image";

interface LegalEscapeHatchProps {
  onCancelClick: () => void;
  label?: string;
}

export function LegalEscapeHatch({
  onCancelClick,
  label = "No thanks, proceed to complete cancellation →",
}: LegalEscapeHatchProps) {
  return (
    <div className="text-center pt-2 border-t border-zinc-200">
      <button
        type="button"
        onClick={onCancelClick}
        className="text-xs font-mono text-zinc-600 hover:text-pitch underline font-bold cursor-pointer transition-colors"
      >
        {label}
      </button>

      <div className="text-[10px] text-zinc-500 font-mono mt-1 flex items-center justify-center gap-1">
        <Image
          src="/compliance/ftc-compliant-escape-hatch.png"
          alt="Unhidden Escape Hatch"
          width={12}
          height={12}
          className="object-contain"
        />
        <span>Built without dark patterns: prominent, high-contrast escape hatch</span>
      </div>
    </div>
  );
}
