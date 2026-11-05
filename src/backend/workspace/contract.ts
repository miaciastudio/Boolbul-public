// Public setup contract only. Never put credentials or server clients in this file.
export const DISCOUNT_CHOICES = {
  "50_2mo": { label: "50% off for 2 months", basisPoints: 5000, months: 2 },
  "30_3mo": { label: "30% off for 3 months", basisPoints: 3000, months: 3 },
  "1mo_free": { label: "100% off for 1 month", basisPoints: 10000, months: 1 },
} as const;
export const PAUSE_CHOICES = {
  "30_day": { label: "Pause for 30 days", days: 30 },
  "60_day": { label: "Pause for 60 days", days: 60 },
} as const;

export type DiscountChoice = keyof typeof DISCOUNT_CHOICES;
export type PauseChoice = keyof typeof PAUSE_CHOICES;
export type SetupChoices = { discountTier: DiscountChoice; pauseTier: PauseChoice };

export interface SetupRule {
  ruleId: string;
  offerType: "discount" | "pause" | "survey_only";
  priority: number;
  triggerCondition: Record<string, unknown>;
  discountBasisPoints: number;
  discountDurationMonths: number;
  pauseDurationDays: number;
  isActive: boolean;
}

export interface WorkspaceSetup {
  tenantId: string;
  publicKey: string;
  appOrigin: string;
  onboardingCompleted: boolean;
  canManage: boolean;
  configuration: {
    // Null means the stored rule is custom/missing; do not silently show a default.
    discountTier: DiscountChoice | null;
    pauseTier: PauseChoice | null;
    rules: SetupRule[];
  };
}

export function parseSetupChoices(value: unknown): SetupChoices | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).length !== 2 ||
      typeof body.discountTier !== "string" || typeof body.pauseTier !== "string" ||
      !Object.hasOwn(DISCOUNT_CHOICES, body.discountTier) || !Object.hasOwn(PAUSE_CHOICES, body.pauseTier)) {
    return null;
  }
  return { discountTier: body.discountTier as DiscountChoice, pauseTier: body.pauseTier as PauseChoice };
}
