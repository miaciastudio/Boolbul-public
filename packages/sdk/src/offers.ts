import type { OfferMode, ReasonId } from "./config";

/** A rule as returned by POST /api/v1/intercept/init. */
export interface Offer {
  ruleId: string;
  offerType: "discount" | "pause";
  /** Discount: basis points (5000 = 50%). Pause: days. */
  offerValue: number;
  /** Discount only. 0 = ongoing. */
  discountDurationMonths: number;
}

export interface OfferCopy { badge: string; title: string; detail: string; cta: string }

export function formatMoney(cents: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function percent(basisPoints: number): string {
  const value = basisPoints / 100;
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

export function describeOffer(offer: Offer, priceCents?: number, currency?: string, now = new Date()): OfferCopy {
  if (offer.offerType === "discount") {
    const pct = percent(offer.offerValue);
    const months = offer.discountDurationMonths;
    const span = months === 0 ? "for as long as you stay" : months === 1 ? "on your next month" : `for ${months} months`;
    const free = offer.offerValue >= 10000;
    const title = free ? (months <= 1 ? "Your next month is on us" : `${months} months, on us`) : `${pct} off ${span}`;
    let detail = free ? "No charge — keep everything exactly as it is." : "Same plan, same features — just a lower price.";
    if (priceCents && priceCents > 0 && !free) {
      const discounted = Math.round(priceCents * (1 - offer.offerValue / 10000));
      detail = `Pay ${formatMoney(discounted, currency)} instead of ${formatMoney(priceCents, currency)}. Same plan, same features.`;
    }
    return { badge: free ? "Free month" : "Save money", title, detail, cta: free ? "Claim free month" : `Claim ${pct} off` };
  }
  const days = offer.offerValue;
  const resume = new Date(now.getTime() + days * 86_400_000);
  const until = resume.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const span = days % 30 === 0 ? `${days / 30} month${days === 30 ? "" : "s"}` : `${days} days`;
  return {
    badge: "Take a break",
    title: `Pause for ${span}`,
    detail: `No charges until ${until}. Your account and data stay safe.`,
    cta: "Pause my plan",
  };
}

/** Drops offers the founder switched off and ranks the rest by the stated reason. */
export function selectOffers(offers: Offer[], mode: OfferMode, reason: ReasonId | null): Offer[] {
  const allowed = offers.filter((offer) =>
    mode === "discount_and_pause" ||
    (mode === "discount_only" && offer.offerType === "discount") ||
    (mode === "pause_only" && offer.offerType === "pause"));
  const pauseFirst = reason === "unused" || reason === "too_complex" || reason === "customer_service";
  return [...allowed].sort((a, b) => {
    if (a.offerType === b.offerType) return 0;
    return (a.offerType === "pause") === pauseFirst ? -1 : 1;
  }).slice(0, 3);
}

/** Reason-aware heading for the offer step. */
export function offerHeading(reason: ReasonId | null): string {
  switch (reason) {
    case "too_expensive": return "Let's make the price work";
    case "unused": return "Need a breather instead?";
    case "missing_features": return "Stay while we build it";
    case "switched_service": return "Before you switch…";
    case "too_complex": return "Take a pause, come back fresh";
    default: return "We'd love to keep you";
  }
}

export function parseOffers(rules: unknown): Offer[] {
  if (!Array.isArray(rules)) return [];
  return rules.flatMap((rule): Offer[] => {
    if (!rule || typeof rule !== "object") return [];
    const { ruleId, offerType, offerValue, discountDurationMonths } = rule as Record<string, unknown>;
    if (typeof ruleId !== "string" || (offerType !== "discount" && offerType !== "pause") ||
        typeof offerValue !== "number" || offerValue <= 0) return [];
    return [{ ruleId, offerType, offerValue, discountDurationMonths: typeof discountDurationMonths === "number" ? discountDurationMonths : 0 }];
  });
}
