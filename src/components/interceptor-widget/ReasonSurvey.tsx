import React from "react";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";

interface ReasonSurveyProps {
  onSelectReason: (reason: string) => void;
  planPrice?: number;
}

export function ReasonSurvey({
  onSelectReason,
  planPrice = 49,
}: ReasonSurveyProps) {
  const reasons = [
    { id: "TOO_EXPENSIVE", label: "Too expensive for what I need", emoji: "💸" },
    { id: "NOT_USING", label: "Not using it right now / seasonal break", emoji: "⏸️" },
    { id: "FOUND_BUG", label: "Found a bug or missing a key feature", emoji: "🐛" },
    { id: "SWITCHING", label: "Switching to another tool / competitor", emoji: "🔄" },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-blush border-3 border-pitch p-3 flex items-start gap-3">
        <span className="text-3xl">🛑</span>
        <div>
          <h3 className="font-black text-sm uppercase leading-tight text-pitch">
            WAIT! BEFORE YOU BOUNCE...
          </h3>
          <p className="text-xs font-mono text-zinc-700 mt-0.5">
            Your current plan is <strong className="text-pitch">${planPrice}/month</strong>. Help us understand why you are leaving today:
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {reasons.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelectReason(r.id)}
            className="w-full p-3 bg-cream border-3 border-pitch flex items-center justify-between hover:bg-lime/30 cursor-pointer transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{r.emoji}</span>
              <span className="text-xs font-mono font-bold text-pitch">{r.label}</span>
            </div>
            <span className="font-black text-xs">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

