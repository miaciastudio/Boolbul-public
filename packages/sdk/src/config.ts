// Shared widget contract: the edge API, the dashboard customizer and the
// embeddable SDK all normalise configuration through this one module, so the
// preview a founder sees is byte-for-byte what their customers see.

export type ThemePreset = "neo_brutalist" | "minimal_slate" | "midnight_oled" | "high_contrast";
export type OfferMode = "discount_and_pause" | "discount_only" | "pause_only" | "survey_only";
export type MobileLayout = "sheet" | "modal";
export type ReasonId =
  | "too_expensive" | "unused" | "missing_features" | "switched_service"
  | "customer_service" | "low_quality" | "too_complex" | "other";

export interface SurveyReason { id: ReasonId; label: string }

export interface WidgetConfig {
  themePreset: ThemePreset;
  accentColor: string;
  borderRadius: number;
  fontFamily: string;
  headline: string;
  body: string;
  escapeHatchText: string;
  successText: string;
  offerMode: OfferMode;
  surveyEnabled: boolean;
  surveyReasons: SurveyReason[];
  mobileLayout: MobileLayout;
  logoUrl: string | null;
  showBranding: boolean;
}

export const REASON_IDS: readonly ReasonId[] = [
  "too_expensive", "unused", "missing_features", "switched_service",
  "customer_service", "low_quality", "too_complex", "other",
];

export const DEFAULT_REASONS: SurveyReason[] = [
  { id: "too_expensive", label: "It's too expensive" },
  { id: "unused", label: "I'm not using it enough" },
  { id: "missing_features", label: "It's missing features I need" },
  { id: "switched_service", label: "I'm switching to another tool" },
  { id: "other", label: "Something else" },
];

/** FTC 16 CFR 425 / California ARL: the way out is always explicit and never blank. */
export const FALLBACK_ESCAPE_HATCH = "No thanks, cancel my subscription";

export const DEFAULT_CONFIG: WidgetConfig = {
  themePreset: "neo_brutalist",
  accentColor: "#CCFF00",
  borderRadius: 0,
  fontFamily: "",
  headline: "Before you go…",
  body: "Tell us what's not working. If we can fix it, we'll make it worth your while.",
  escapeHatchText: FALLBACK_ESCAPE_HATCH,
  successText: "You're all set. Thanks for sticking with us!",
  offerMode: "discount_and_pause",
  surveyEnabled: true,
  surveyReasons: DEFAULT_REASONS,
  mobileLayout: "sheet",
  logoUrl: null,
  showBranding: true,
};

const PRESETS: readonly ThemePreset[] = ["neo_brutalist", "minimal_slate", "midnight_oled", "high_contrast"];
const OFFER_MODES: readonly OfferMode[] = ["discount_and_pause", "discount_only", "pause_only", "survey_only"];

function text(value: unknown, fallback: string, max: number): string {
  if (typeof value !== "string") return fallback;
  // Strip control characters; the renderer only ever uses textContent.
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, max) : fallback;
}

function hex(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : fallback;
}

/**
 * Escape-hatch copy may not be blank, too short, or phrased to shame or hide
 * the cancellation ("No, I hate saving money"). Anything suspicious reverts
 * to the plain legal label.
 */
export function sanitizeEscapeHatch(value: unknown): string {
  const label = text(value, FALLBACK_ESCAPE_HATCH, 80);
  if (label.length < 6) return FALLBACK_ESCAPE_HATCH;
  if (!/cancel/i.test(label)) return FALLBACK_ESCAPE_HATCH;
  if (/\b(hate|stupid|dumb|lose|losing|waste|don'?t care|i prefer paying)\b/i.test(label)) return FALLBACK_ESCAPE_HATCH;
  return label;
}

function reasons(value: unknown): SurveyReason[] {
  if (!Array.isArray(value)) return DEFAULT_REASONS;
  const seen = new Set<string>();
  const list: SurveyReason[] = [];
  for (const entry of value.slice(0, 8)) {
    if (!entry || typeof entry !== "object") continue;
    const { id, label } = entry as Record<string, unknown>;
    if (typeof id !== "string" || !(REASON_IDS as readonly string[]).includes(id) || seen.has(id)) continue;
    seen.add(id);
    list.push({ id: id as ReasonId, label: text(label, DEFAULT_REASONS.find((r) => r.id === id)?.label ?? id, 60) });
  }
  return list.length ? list : DEFAULT_REASONS;
}

/** Accepts camelCase API payloads and snake_case database rows. Never throws. */
export function normalizeConfig(raw: unknown): WidgetConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = (...keys: string[]) => keys.map((key) => r[key]).find((value) => value !== undefined && value !== null);
  const preset = pick("themePreset", "theme_preset");
  const mode = pick("offerMode", "primary_offer_type");
  const radius = Number(pick("borderRadius", "border_radius_px"));
  const logo = pick("logoUrl", "logo_url");
  const preset0 = (PRESETS as readonly unknown[]).includes(preset) ? (preset as ThemePreset) : DEFAULT_CONFIG.themePreset;
  return {
    themePreset: preset0,
    accentColor: hex(pick("accentColor", "accent_color"), THEMES[preset0].accentDefault),
    borderRadius: Number.isFinite(radius) ? Math.min(32, Math.max(0, Math.round(radius))) : THEMES[preset0].radius,
    fontFamily: text(pick("fontFamily", "font_family"), "", 80).replace(/[^a-zA-Z0-9 ,'-]/g, ""),
    headline: text(pick("headline", "headlineText", "headline_text"), DEFAULT_CONFIG.headline, 120),
    body: text(pick("body", "bodyText", "body_text"), DEFAULT_CONFIG.body, 400),
    escapeHatchText: sanitizeEscapeHatch(pick("escapeHatchText", "escape_hatch_text")),
    successText: text(pick("successText", "success_text"), DEFAULT_CONFIG.successText, 160),
    offerMode: (OFFER_MODES as readonly unknown[]).includes(mode) ? (mode as OfferMode) : DEFAULT_CONFIG.offerMode,
    surveyEnabled: pick("surveyEnabled", "survey_enabled") !== false,
    surveyReasons: reasons(pick("surveyReasons", "survey_reasons")),
    mobileLayout: pick("mobileLayout", "mobile_layout") === "modal" ? "modal" : "sheet",
    logoUrl: typeof logo === "string" && /^https:\/\/[^\s"'<>]+$/.test(logo) && logo.length <= 512 ? logo : null,
    showBranding: pick("showBranding", "show_branding") !== false,
  };
}

// ---------------------------------------------------------------- themes

export interface ThemeTokens {
  name: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  borderWidth: number;
  shadow: string;
  cardShadow: string;
  overlay: string;
  radius: number;
  accentDefault: string;
  font: string;
}

const SYSTEM_FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export const THEMES: Record<ThemePreset, ThemeTokens> = {
  neo_brutalist: {
    name: "Neo-Brutalist", bg: "#FBF8EF", surface: "#FFFFFF", text: "#0A0A0A", muted: "#3F3F46",
    border: "#0A0A0A", borderWidth: 3, shadow: "8px 8px 0 #0A0A0A", cardShadow: "4px 4px 0 #0A0A0A",
    overlay: "rgba(10,10,10,.62)", radius: 0, accentDefault: "#CCFF00",
    font: `'Space Grotesk', 'Inter', ${SYSTEM_FONT}`,
  },
  minimal_slate: {
    name: "Minimal Slate", bg: "#FFFFFF", surface: "#F8FAFC", text: "#0F172A", muted: "#475569",
    border: "#E2E8F0", borderWidth: 1, shadow: "0 32px 64px -16px rgba(15,23,42,.35)", cardShadow: "0 1px 2px rgba(15,23,42,.06)",
    overlay: "rgba(15,23,42,.45)", radius: 16, accentDefault: "#2B4CFF", font: `'Inter', ${SYSTEM_FONT}`,
  },
  midnight_oled: {
    name: "Midnight OLED", bg: "#000000", surface: "#0E0E12", text: "#F5F5F5", muted: "#A1A1AA",
    border: "#27272A", borderWidth: 1, shadow: "0 0 0 1px #27272A, 0 40px 80px rgba(0,0,0,.7)", cardShadow: "none",
    overlay: "rgba(0,0,0,.72)", radius: 20, accentDefault: "#CCFF00", font: `'Inter', ${SYSTEM_FONT}`,
  },
  high_contrast: {
    name: "High Contrast", bg: "#FFFFFF", surface: "#FFFFFF", text: "#000000", muted: "#1F1F1F",
    border: "#000000", borderWidth: 2, shadow: "none", cardShadow: "none",
    overlay: "rgba(0,0,0,.75)", radius: 6, accentDefault: "#0033CC", font: SYSTEM_FONT,
  },
};

// ---------------------------------------------------------------- contrast (WCAG 2.2)

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(color: string): number {
  const n = parseInt(color.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white, whichever reads better on the accent fill. */
export function readableOn(color: string): string {
  return contrastRatio(color, "#0A0A0A") >= contrastRatio(color, "#FFFFFF") ? "#0A0A0A" : "#FFFFFF";
}

export interface ComplianceReport { ok: boolean; escapeHatchContrast: number; accentContrast: number; issues: string[] }

/** What the customizer shows as the live FTC/WCAG validator. */
export function checkCompliance(config: WidgetConfig): ComplianceReport {
  const theme = THEMES[config.themePreset];
  const escapeHatchContrast = contrastRatio(theme.text, theme.bg);
  const accentContrast = contrastRatio(config.accentColor, readableOn(config.accentColor));
  const issues: string[] = [];
  if (escapeHatchContrast < 4.5) issues.push("Cancel link contrast is below WCAG AA 4.5:1.");
  if (accentContrast < 4.5) issues.push("Button text contrast on the accent color is below 4.5:1.");
  return { ok: issues.length === 0, escapeHatchContrast, accentContrast, issues };
}
