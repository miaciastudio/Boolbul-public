import { describe, it, expect } from "vitest";
import { THEME_PRESETS, getThemeTokens } from "@/lib/widget-themes/tokens";
import { DEFAULT_WIDGET_CONFIG, WidgetThemePreset } from "@/lib/widget-themes/types";

describe("Widget Theme Presets & Tokens", () => {
  const presets: WidgetThemePreset[] = ["neo_brutalist", "minimal_slate", "midnight_oled"];

  it("defines all three core theme presets with complete token maps", () => {
    for (const preset of presets) {
      const tokens = THEME_PRESETS[preset];
      expect(tokens).toBeDefined();
      expect(tokens.preset).toBe(preset);
      expect(tokens.name).toBeTruthy();
      expect(tokens.modalBg).toBeTruthy();
      expect(tokens.modalBorder).toBeTruthy();
      expect(tokens.headlineColor).toBeTruthy();
      expect(tokens.escapeHatchClass).toBeTruthy();
    }
  });

  it("neo_brutalist theme has signature punk tokens", () => {
    const neo = THEME_PRESETS.neo_brutalist;
    expect(neo.modalBg).toBe("bg-[#FDFBF7]");
    expect(neo.modalBorder).toContain("border-4 border-black");
    expect(neo.modalShadow).toContain("shadow-[6px_6px_0px_0px_#000000]");
    expect(neo.accentBg).toBe("bg-[#CCFF00]");
    expect(neo.fontFamily).toBe("font-mono");
  });

  it("minimal_slate theme has clean linear/vercel aesthetic", () => {
    const slate = THEME_PRESETS.minimal_slate;
    expect(slate.modalBg).toBe("bg-white");
    expect(slate.modalBorder).toContain("border border-slate-200");
    expect(slate.modalRadius).toBe("rounded-2xl");
    expect(slate.fontFamily).toBe("font-sans");
  });

  it("midnight_oled theme has true black dev-tool aesthetic", () => {
    const oled = THEME_PRESETS.midnight_oled;
    expect(oled.modalBg).toBe("bg-[#09090B]");
    expect(oled.modalBorder).toContain("border border-zinc-800");
    expect(oled.headlineColor).toBe("text-zinc-100");
    expect(oled.accentBg).toContain("bg-emerald-500");
    expect(oled.fontFamily).toBe("font-mono");
  });

  it("getThemeTokens safely falls back to neo_brutalist on unknown or null preset", () => {
    expect(getThemeTokens(null).preset).toBe("neo_brutalist");
    expect(getThemeTokens(undefined).preset).toBe("neo_brutalist");
    expect(getThemeTokens("non_existent" as any).preset).toBe("neo_brutalist");
  });

  it("DEFAULT_WIDGET_CONFIG starts with neo_brutalist preset and legal copy", () => {
    expect(DEFAULT_WIDGET_CONFIG.themePreset).toBe("neo_brutalist");
    expect(DEFAULT_WIDGET_CONFIG.escapeHatchText).toBeTruthy();
    expect(DEFAULT_WIDGET_CONFIG.showDiscountOffer).toBe(true);
    expect(DEFAULT_WIDGET_CONFIG.showPauseOffer).toBe(true);
  });
});

