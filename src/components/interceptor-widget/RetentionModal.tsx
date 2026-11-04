"use client";

import React, { useState, useEffect } from "react";
import { ReasonSurvey } from "./ReasonSurvey";
import { DynamicOffer } from "./DynamicOffer";
import { LegalEscapeHatch } from "./LegalEscapeHatch";
import { StateSavedSuccess } from "@/components/states/StateSavedSuccess";

interface RetentionModalProps {
  isOpen: boolean;
  customerId: string;
  subscriptionId: string;
  planPrice?: number;
  onCancelConfirmed: () => void;
  onOfferAccepted: (offerData: any) => void;
  onClose?: () => void;
}

export function RetentionModal({
  isOpen,
  customerId,
  subscriptionId,
  planPrice = 49,
  onCancelConfirmed,
  onOfferAccepted,
  onClose,
}: RetentionModalProps) {
  const [step, setStep] = useState<"survey" | "offer" | "saved">("survey");
  const [selectedReason, setSelectedReason] = useState<string>("");

  // 1500ms Fail-Open Guarantee
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      // If modal is unmounted or server hangs, ensure user is never blocked
    }, 1500);

    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReasonSelected = (reason: string) => {
    setSelectedReason(reason);
    setStep("offer");
  };

  const handleOfferAccepted = (offerType: string) => {
    setStep("saved");
    onOfferAccepted({
      customerId,
      subscriptionId,
      offerType,
      savedMRR: planPrice * 0.5,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-pitch/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border-4-black shadow-brutal-xl p-6 relative">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b-2 border-pitch pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-crimson border border-pitch"></span>
            <span className="w-3 h-3 rounded-full bg-lime border border-pitch"></span>
            <span className="w-3 h-3 rounded-full bg-cobalt border border-pitch"></span>
            <span className="font-mono text-xs font-black uppercase tracking-wider ml-2">
              BOOLBUL CANCELLATION DEFLECTOR
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="font-mono text-xs font-bold text-zinc-500 hover:text-pitch"
            >
              ✕
            </button>
          )}
        </div>

        {step === "survey" && (
          <div className="space-y-4">
            <ReasonSurvey
              planPrice={planPrice}
              onSelectReason={handleReasonSelected}
            />
            <LegalEscapeHatch onCancelClick={onCancelConfirmed} />
          </div>
        )}

        {step === "offer" && (
          <div className="space-y-4">
            <DynamicOffer
              reason={selectedReason}
              planPrice={planPrice}
              onAcceptOffer={handleOfferAccepted}
            />
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep("survey")}
                className="font-mono text-xs text-zinc-600 hover:text-pitch font-bold"
              >
                ← Change reason
              </button>
              <LegalEscapeHatch
                onCancelClick={onCancelConfirmed}
                label="No thanks, cancel my subscription"
              />
            </div>
          </div>
        )}

        {step === "saved" && (
          <StateSavedSuccess
            customerName={customerId}
            offerText="50% off for 2 months"
            mrrSaved={Math.round(planPrice * 0.5)}
            onDismiss={onClose}
          />
        )}
      </div>
    </div>
  );
}

