import { describe, it, expect } from "vitest";
import {
  validateFTCCompliance,
  sanitizeWidgetConfig,
  FALLBACK_ESCAPE_HATCH_LABEL,
} from "@/lib/widget-themes/compliance";

describe("FTC 16 CFR Part 425 & California ARL Anti-Dark Pattern Guardrails", () => {
  it("approves valid, explicit escape hatch labels", () => {
    const result = validateFTCCompliance("Proceed to cancel subscription");
    expect(result.valid).toBe(true);
    expect(result.sanitizedEscapeHatch).toBe("Proceed to cancel subscription");
    expect(result.violations).toHaveLength(0);
  });

  it("reverts blank or whitespace-only labels to the legal standard fallback", () => {
    const emptyResult = validateFTCCompliance("");
    expect(emptyResult.valid).toBe(false);
    expect(emptyResult.sanitizedEscapeHatch).toBe(FALLBACK_ESCAPE_HATCH_LABEL);
    expect(emptyResult.violations[0]).toContain("Escape hatch text cannot be empty");

    const spacesResult = validateFTCCompliance("     ");
    expect(spacesResult.valid).toBe(false);
    expect(spacesResult.sanitizedEscapeHatch).toBe(FALLBACK_ESCAPE_HATCH_LABEL);

    const nullResult = validateFTCCompliance(null);
    expect(nullResult.valid).toBe(false);
    expect(nullResult.sanitizedEscapeHatch).toBe(FALLBACK_ESCAPE_HATCH_LABEL);
  });

  it("detects and rejects dangerous CSS hiding keywords in custom styles", () => {
    const hiddenDisplay = validateFTCCompliance("Cancel", { display: "none" });
    expect(hiddenDisplay.valid).toBe(false);
    expect(hiddenDisplay.violations.some((v) => v.includes("FTC Violation"))).toBe(true);

    const zeroOpacity = validateFTCCompliance("Cancel", { opacity: "0" });
    expect(zeroOpacity.valid).toBe(false);

    const visibilityHidden = validateFTCCompliance("Cancel", { visibility: "hidden" });
    expect(visibilityHidden.valid).toBe(false);
  });

  it("sanitizeWidgetConfig sanitizes arbitrary user input into a legally compliant payload", () => {
    const sanitized = sanitizeWidgetConfig({
      themePreset: "midnight_oled",
      headlineText: "  Wait, cancel?  ",
      bodyText: "  Keep your discount  ",
      escapeHatchText: "   ", // Blank label should be restored
    });

    expect(sanitized.themePreset).toBe("midnight_oled");
    expect(sanitized.headlineText).toBe("Wait, cancel?");
    expect(sanitized.bodyText).toBe("Keep your discount");
    expect(sanitized.escapeHatchText).toBe(FALLBACK_ESCAPE_HATCH_LABEL);
    expect(sanitized.showDiscountOffer).toBe(true);
    expect(sanitized.showPauseOffer).toBe(true);
  });
});

