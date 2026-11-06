"use client";

import React, { useState } from "react";
import { WidgetConfigPayload } from "@/lib/widget-themes/types";
import { getThemeTokens } from "@/lib/widget-themes/tokens";

interface ThemePreviewModalProps {
  config: WidgetConfigPayload;
  planPrice?: number;
}

export function ThemePreviewModal({ config, planPrice = 49 }: ThemePreviewModalProps) {
  const [testState, setTestState] = useState<"idle" | "rescued" | "cancelled">("idle");
  const [selectedOffer, setSelectedOffer] = useState<"discount" | "pause">("discount");

  const tokens = getThemeTokens(config.themePreset);
  const discountedPrice = (planPrice * 0.5).toFixed(2);

  const handleReset = () => setTestState("idle");

  return (
    <div className="relative w-full">
      {/* Test State Banners */}
      {testState !== "idle" && (
        <div className="mb-4 flex items-center justify-between border-2 border-pitch p-3 font-mono text-xs shadow-brutal-sm bg-lime">
          <div className="flex items-center gap-2">
            <span className="font-bold">
              {testState === "rescued"
                ? "🎉 SIMULATION: 50% Rescue Discount Applied! MRR Saved: +$24.50"
                : "⚠️ SIMULATION: Customer Proceeded with Cancellation (FTC-Compliant Exit)"}
            </span>
          </div>
          <button
            onClick={handleReset}
            className="underline font-bold hover:text-white transition-colors"
          >
            Reset Preview ↺
          </button>
        </div>
      )}

      {/* Modal Canvas Container */}
      <div
        className={`w-full min-h-[500px] p-4 sm:p-8 flex items-center justify-center transition-colors duration-200 ${
          config.themePreset === "midnight_oled"
            ? "bg-zinc-950/90 border-2 border-zinc-800"
            : config.themePreset === "minimal_slate"
            ? "bg-slate-100 border border-slate-200"
            : "bg-[#0022FF]/10 border-3 border-pitch"
        }`}
      >
        {/* Rendered Modal Card */}
        <div
          className={`w-full max-w-md ${tokens.modalBg} ${tokens.modalBorder} ${tokens.modalShadow} ${tokens.modalRadius} ${tokens.fontFamily} p-6 sm:p-7 space-y-5 transition-all duration-200`}
        >
          {/* Header & Badges */}
          <div className="flex items-center justify-between">
            <span
              className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${tokens.badgeBg} ${tokens.badgeText} ${tokens.badgeBorder} ${tokens.modalRadius}`}
            >
              CANCELLATION INTERCEPT
            </span>
            <span className="text-xs font-mono text-zinc-500">
              Plan: ${planPrice}/mo
            </span>
          </div>

          {/* Headline & Body Copy */}
          <div className="space-y-1.5">
            <h3
              className={`text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight ${tokens.headlineColor}`}
            >
              {config.headlineText}
            </h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${tokens.bodyColor}`}>
              {config.bodyText}
            </p>
          </div>

          {/* Retention Offers List */}
          <div className="space-y-2.5">
            {config.showDiscountOffer && (
              <div
                onClick={() => setSelectedOffer("discount")}
                className={`p-3.5 cursor-pointer transition-all ${tokens.offerCardBg} ${tokens.offerCardBorder} ${tokens.offerCardHover} ${tokens.modalRadius} ${
                  selectedOffer === "discount" ? "ring-2 ring-black/40" : ""
                } flex items-center justify-between`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black">🔥 50% OFF</span>
                    <span className="text-xs text-zinc-500 font-mono">Next 2 months</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-600 block">
                    Only ${discountedPrice}/mo (Save ${discountedPrice}/mo)
                  </span>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 uppercase ${tokens.badgeBg} ${tokens.badgeText} ${tokens.badgeBorder} ${tokens.modalRadius}`}
                >
                  BEST DEAL
                </span>
              </div>
            )}

            {config.showPauseOffer && (
              <div
                onClick={() => setSelectedOffer("pause")}
                className={`p-3.5 cursor-pointer transition-all ${tokens.offerCardBg} ${tokens.offerCardBorder} ${tokens.offerCardHover} ${tokens.modalRadius} ${
                  selectedOffer === "pause" ? "ring-2 ring-black/40" : ""
                } flex items-center justify-between`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black">⏸️ 30-DAY FREEZE</span>
                    <span className="text-xs text-zinc-500 font-mono">Zero charges</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-600 block">
                    Keep all account data & projects intact
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 uppercase border border-zinc-400 bg-white/40 text-zinc-600">
                  PAUSE
                </span>
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          <div>
            <button
              type="button"
              onClick={() => setTestState("rescued")}
              className={`w-full min-h-11 px-4 py-3 text-sm font-black uppercase tracking-wide transition-all ${tokens.accentBg} ${tokens.accentText} ${tokens.accentBorder} ${tokens.modalRadius}`}
            >
              {selectedOffer === "discount"
                ? "Claim 50% Off & Stay Subscribed 🚀"
                : "Pause For 30 Days & Keep Data ⏸️"}
            </button>
          </div>

          {/* FTC / California ARL Compliant Escape Hatch (Mandatory) */}
          <div className="space-y-2 pt-2 border-t border-zinc-200/40">
            <button
              type="button"
              onClick={() => setTestState("cancelled")}
              aria-label="Proceed to cancel"
              className={tokens.escapeHatchClass}
            >
              {config.escapeHatchText || "No thanks, proceed to complete cancellation →"}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-zinc-500">
              <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span>FTC & ARL compliant · Direct 1-click cancellation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

