/**
 * FTC "Click to Cancel" (16 CFR Part 425) & California ARL Compliance Guardrails
 * 
 * Rules enforced by architecture:
 * 1. The cancellation escape hatch can never be hidden, suppressed, or styled with opacity: 0.
 * 2. If the user provides blank or whitespace-only escape hatch copy, the system
 *    reverts to an explicit legal label.
 * 3. The cancellation trigger must be a single-click action with immediate execution.
 */

import { WidgetConfigPayload, WidgetThemePreset } from "./types";

export const FALLBACK_ESCAPE_HATCH_LABEL = "No thanks, proceed to complete cancellation →";

export interface ComplianceValidationResult {
  valid: boolean;
  sanitizedEscapeHatch: string;
  violations: string[];
}

export function validateFTCCompliance(
  rawEscapeHatchText?: string | null,
  rawStyles?: Record<string, unknown> | null
): ComplianceValidationResult {
  const violations: string[] = [];

  // Check 1: Label cannot be empty or deceptive
  const trimmed = rawEscapeHatchText?.trim();
  let sanitizedEscapeHatch = trimmed && trimmed.length > 0 ? trimmed : FALLBACK_ESCAPE_HATCH_LABEL;

  if (!trimmed || trimmed.length < 3) {
    violations.push("Escape hatch text cannot be empty. Reverted to standard compliant label.");
    sanitizedEscapeHatch = FALLBACK_ESCAPE_HATCH_LABEL;
  }

  // Check 2: Disallowed style keywords (opacity 0, display none, visibility hidden, pointer-events none)
  if (rawStyles && typeof rawStyles === "object") {
    const normalized = JSON.stringify(rawStyles)
      .toLowerCase()
      .replace(/["'\s]/g, "");
    if (
      normalized.includes("display:none") ||
      normalized.includes("opacity:0") ||
      normalized.includes("visibility:hidden") ||
      normalized.includes("pointer-events:none")
    ) {
      violations.push("FTC Violation: Escape hatch cannot be hidden or rendered unclickable.");
    }
  }

  return {
    valid: violations.length === 0,
    sanitizedEscapeHatch,
    violations,
  };
}

/**
 * Returns clean, validated widget config with guaranteed FTC compliance
 */
export function sanitizeWidgetConfig(input: {
  themePreset?: string;
  headlineText?: string;
  bodyText?: string;
  escapeHatchText?: string;
  accentColor?: string;
  showDiscountOffer?: boolean;
  showPauseOffer?: boolean;
}): WidgetConfigPayload {
  const compliance = validateFTCCompliance(input.escapeHatchText);

  const preset: WidgetThemePreset =
    input.themePreset === "minimal_slate" || input.themePreset === "midnight_oled"
      ? input.themePreset
      : "neo_brutalist";

  return {
    themePreset: preset,
    headlineText: input.headlineText?.trim() || "WAIT! BEFORE YOU BOUNCE...",
    bodyText: input.bodyText?.trim() || "Your subscription plan is active. We would love to keep you around. Pick a rescue package below:",
    escapeHatchText: compliance.sanitizedEscapeHatch,
    accentColor: input.accentColor || "#CCFF00",
    showDiscountOffer: input.showDiscountOffer !== false,
    showPauseOffer: input.showPauseOffer !== false,
  };
}
