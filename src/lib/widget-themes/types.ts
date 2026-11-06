export type WidgetThemePreset = "neo_brutalist" | "minimal_slate" | "midnight_oled";

export interface WidgetThemeTokens {
  preset: WidgetThemePreset;
  name: string;
  description: string;
  containerBg: string;
  modalBg: string;
  modalBorder: string;
  modalShadow: string;
  modalRadius: string;
  headlineColor: string;
  bodyColor: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  offerCardBg: string;
  offerCardBorder: string;
  offerCardHover: string;
  escapeHatchClass: string;
  fontFamily: string;
}

export interface WidgetConfigPayload {
  tenantId?: string;
  themePreset: WidgetThemePreset;
  headlineText: string;
  bodyText: string;
  escapeHatchText: string;
  accentColor?: string;
  showDiscountOffer: boolean;
  showPauseOffer: boolean;
  updatedAt?: string;
}

export const DEFAULT_WIDGET_CONFIG: WidgetConfigPayload = {
  themePreset: "neo_brutalist",
  headlineText: "WAIT! BEFORE YOU BOUNCE...",
  bodyText: "Your subscription plan is active. We would love to keep you around. Pick a rescue package below:",
  escapeHatchText: "No thanks, proceed to complete cancellation →",
  accentColor: "#CCFF00",
  showDiscountOffer: true,
  showPauseOffer: true,
};

