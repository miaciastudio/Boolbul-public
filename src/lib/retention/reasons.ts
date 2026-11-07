// Exit reason ids map 1:1 to Dodo Payments `cancellation_feedback` and
// Stripe `cancellation_details.feedback`, so the host can forward them verbatim.
export const EXIT_REASONS = {
  too_expensive: { label: "It's too expensive", dodo: "too_expensive", stripe: "too_expensive" },
  unused: { label: "I'm not using it enough", dodo: "unused", stripe: "unused" },
  missing_features: { label: "It's missing features I need", dodo: "missing_features", stripe: "missing_features" },
  switched_service: { label: "I'm switching to another tool", dodo: "switched_service", stripe: "switched_service" },
  customer_service: { label: "Support didn't help me", dodo: "customer_service", stripe: "customer_service" },
  low_quality: { label: "Quality wasn't good enough", dodo: "low_quality", stripe: "low_quality" },
  too_complex: { label: "It's too complicated", dodo: "too_complex", stripe: "too_complex" },
  other: { label: "Something else", dodo: "other", stripe: "other" },
} as const;

export type ExitReasonId = keyof typeof EXIT_REASONS;

export function isExitReasonId(value: unknown): value is ExitReasonId {
  return typeof value === "string" && Object.hasOwn(EXIT_REASONS, value);
}
