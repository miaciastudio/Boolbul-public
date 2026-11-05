"use client";

import React, { useState, useEffect, useId, useRef } from "react";
import { ReasonSurvey } from "./ReasonSurvey";
import { DynamicOffer } from "./DynamicOffer";
import { LegalEscapeHatch } from "./LegalEscapeHatch";

interface RetentionModalProps {
  isOpen: boolean;
  customerId: string;
  subscriptionId: string;
  planPrice?: number;
  onCancelConfirmed: () => void;
  onOfferAccepted: (offerData: {
    customerId: string;
    subscriptionId: string;
    offerType: string;
    simulated: true;
  }) => void;
  onClose?: () => void;
}

const offerLabels: Record<string, string> = {
  DISCOUNT_50_PCT: "50% off for 2 months",
  PAUSE_30_DAYS: "Pause for 30 days",
  FREE_MONTH_FOUNDER: "One free month and founder support",
  DISCOUNT_30_PCT: "30% off for 3 months",
};

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
  const [selectedReason, setSelectedReason] = useState("");
  const [acceptedOffer, setAcceptedOffer] = useState("");
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setStep("survey");
    setSelectedReason("");
    setAcceptedOffer("");
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    contentRef.current?.focus();
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [isOpen, step]);

  if (!isOpen) return null;

  const handleReasonSelected = (reason: string) => {
    setSelectedReason(reason);
    setStep("offer");
  };

  const handleOfferAccepted = (offerType: string) => {
    setAcceptedOffer(offerType);
    setStep("saved");
    onOfferAccepted({
      customerId,
      subscriptionId,
      offerType,
      simulated: true,
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && onClose) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
    );
    if (!controls?.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === contentRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pitch/80 p-3 backdrop-blur-sm sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
        className="relative flex max-h-[calc(100dvh-2rem)] w-full min-w-0 max-w-lg flex-col border-4-black bg-white shadow-brutal-xl"
      >
        <div className="shrink-0 border-b-2 border-pitch px-4 py-3 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="py-2 font-mono text-sm font-black uppercase tracking-wide text-pitch">
              BoolBul cancellation demo
            </h2>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close demo"
                className="min-h-11 min-w-11 shrink-0 border-2 border-pitch px-2 font-mono text-sm font-bold text-pitch hover:bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                Close
              </button>
            )}
          </div>
          <p id={descriptionId} className="font-mono text-xs leading-relaxed text-zinc-700">
            Simulation only. No subscription or billing changes are made.
          </p>
        </div>

        <div
          ref={contentRef}
          tabIndex={-1}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain break-words p-4 outline-none sm:p-6 [&_button]:min-h-11 [&_button]:whitespace-normal [&_button]:text-sm [&_button]:leading-relaxed [&_button]:focus-visible:outline [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-black [&_button_span]:text-sm [&_p]:text-sm"
        >
          {step === "survey" && (
            <ReasonSurvey
              planPrice={planPrice}
              onSelectReason={handleReasonSelected}
            />
          )}

          {step === "offer" && (
            <div className="space-y-4">
              <DynamicOffer
                reason={selectedReason}
                planPrice={planPrice}
                onAcceptOffer={handleOfferAccepted}
              />
              <button
                type="button"
                onClick={() => setStep("survey")}
                className="min-h-11 border-2 border-pitch px-3 py-2 font-mono text-sm font-bold text-pitch hover:bg-cream"
              >
                ← Change reason
              </button>
            </div>
          )}

          {step === "saved" && (
            <div role="status" className="space-y-4 border-3 border-pitch bg-cream p-4 text-pitch shadow-brutal-sm">
              <span className="inline-block border-2 border-pitch bg-lime px-2 py-1 font-mono text-xs font-black uppercase">
                Demo complete
              </span>
              <h3 className="text-2xl font-black uppercase tracking-tight">Offer acceptance simulated</h3>
              <p className="font-mono leading-relaxed">
                Selected offer: <strong>{offerLabels[acceptedOffer] ?? acceptedOffer}</strong>.
              </p>
              <p className="font-mono leading-relaxed">
                No offer was applied and no revenue was saved. You can still try the cancellation path below.
              </p>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full border-3 border-pitch bg-lime px-4 py-3 font-mono font-black hover:bg-lime-hover"
                >
                  Close demo
                </button>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t-2 border-pitch bg-white p-4 sm:px-6">
          <LegalEscapeHatch onCancelClick={onCancelConfirmed} />
        </div>
      </div>
    </div>
  );
}
