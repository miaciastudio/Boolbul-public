import React from "react";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";

interface DynamicOfferProps {
  reason: string;
  onAcceptOffer: (offerType: string) => void;
  planPrice?: number;
}

export function DynamicOffer({
  reason,
  onAcceptOffer,
  planPrice = 49,
}: DynamicOfferProps) {
  const getOfferDetails = () => {
    switch (reason) {
      case "TOO_EXPENSIVE":
        return {
          title: "KEEP YOUR WORKFLOW AT HALF THE PRICE",
          discount: "50% OFF",
          desc: `Stay subscribed for just $${(planPrice * 0.5).toFixed(2)}/mo for the next 2 months.`,
          offerType: "DISCOUNT_50_PCT",
          cta: "Claim 50% Off & Stay Subscribed 🚀",
        };
      case "NOT_USING":
        return {
          title: "PAUSE YOUR SUBSCRIPTION, KEEP YOUR DATA",
          discount: "FREEZE 30 DAYS",
          desc: "Zero charges for the next 30 days. All projects & settings remain safely intact.",
          offerType: "PAUSE_30_DAYS",
          cta: "Freeze Subscription For 30 Days ⏸️",
        };
      case "FOUND_BUG":
        return {
          title: "DIRECT ACCESS TO FOUNDER + 1 MO FREE",
          discount: "FREE MONTH",
          desc: "We’ll credit next month free while our team pushes your feature fix this week.",
          offerType: "FREE_MONTH_FOUNDER",
          cta: "Claim Free Month & Chat With Founder 🛠️",
        };
      default:
        return {
          title: "SPECIAL FOUNDER RETENTION OFFER",
          discount: "30% OFF",
          desc: "Get 30% off for 3 months automatically applied to your gateway billing.",
          offerType: "DISCOUNT_30_PCT",
          cta: "Apply 30% Discount & Continue",
        };
    }
  };

  const offer = getOfferDetails();

  return (
    <div className="space-y-4">
      <div className="bg-lime border-3 border-pitch p-4 shadow-brutal-sm">
        <span className="text-[10px] font-mono bg-pitch text-white px-2 py-0.5 border border-pitch font-black uppercase">
          EXCLUSIVE RETENTION DEAL
        </span>
        <h3 className="text-xl font-black uppercase tracking-tight text-pitch mt-1">
          {offer.title}
        </h3>
        <p className="font-mono text-xs text-zinc-800 mt-1">
          {offer.desc}
        </p>
      </div>

      <BrutalButton
        variant="lime"
        size="lg"
        onClick={() => onAcceptOffer(offer.offerType)}
        className="w-full"
      >
        {offer.cta}
      </BrutalButton>
    </div>
  );
}

