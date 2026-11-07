// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkCompliance, contrastRatio, DEFAULT_CONFIG, describeOffer, FALLBACK_ESCAPE_HATCH, normalizeConfig,
  open, preview, selectOffers, THEMES, type Offer, type ThemePreset,
} from "@boolbul/sdk";

const shadow = () => document.querySelector("boolbul-widget")?.shadowRoot ?? null;
const q = <T extends Element = HTMLElement>(selector: string) => shadow()?.querySelector<T & Element>(selector) ?? null;
const all = (selector: string) => Array.from(shadow()?.querySelectorAll<HTMLElement>(selector) ?? []);
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const offers: Offer[] = [
  { ruleId: "r-discount", offerType: "discount", offerValue: 5000, discountDurationMonths: 2 },
  { ruleId: "r-pause", offerType: "pause", offerValue: 30, discountDurationMonths: 0 },
];

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.style.overflow = "";
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("config contract", () => {
  it("normalises snake_case rows and rejects unsafe values", () => {
    const config = normalizeConfig({
      theme_preset: "minimal_slate", accent_color: "#00ff88", headline_text: "  Hold\u0000 on  ",
      escape_hatch_text: "x", logo_url: "http://evil.test/a.png", border_radius_px: -5, font_family: "Inter;}body{",
    });
    expect(config).toMatchObject({ themePreset: "minimal_slate", accentColor: "#00FF88", headline: "Hold on",
      escapeHatchText: FALLBACK_ESCAPE_HATCH, logoUrl: null, borderRadius: 0, fontFamily: "Interbody" });
  });

  it.each([
    "No thanks", "No, I hate saving money and want to cancel", "Cancel and lose everything", "",
  ])("never allows a shaming or hidden cancel label: %j", (label) => {
    expect(normalizeConfig({ escapeHatchText: label }).escapeHatchText).toBe(FALLBACK_ESCAPE_HATCH);
  });

  it("keeps a clear, custom cancel label", () => {
    expect(normalizeConfig({ escapeHatchText: "No thanks, cancel my plan" }).escapeHatchText).toBe("No thanks, cancel my plan");
  });

  it.each(Object.keys(THEMES) as ThemePreset[])("%s meets WCAG AA for the cancel link and buttons", (preset) => {
    const theme = THEMES[preset];
    expect(contrastRatio(theme.text, theme.bg)).toBeGreaterThanOrEqual(4.5);
    expect(checkCompliance(normalizeConfig({ themePreset: preset })).ok).toBe(true);
  });
});

describe("offer copy and ranking", () => {
  it("shows the real discounted price and pause date", () => {
    expect(describeOffer(offers[0], 4900, "USD")).toMatchObject({ title: "50% off for 2 months", cta: "Claim 50% off" });
    expect(describeOffer(offers[0], 4900, "USD").detail).toContain("24.50");
    expect(describeOffer(offers[1], undefined, undefined, new Date("2026-01-01T00:00:00Z")).title).toBe("Pause for 1 month");
    expect(describeOffer({ ...offers[0], offerValue: 10000, discountDurationMonths: 1 }).title).toBe("Your next month is on us");
  });

  it("puts the pause first for unused customers and respects the founder's offer mode", () => {
    expect(selectOffers(offers, "discount_and_pause", "unused")[0].offerType).toBe("pause");
    expect(selectOffers(offers, "discount_and_pause", "too_expensive")[0].offerType).toBe("discount");
    expect(selectOffers(offers, "pause_only", "too_expensive").map((o) => o.offerType)).toEqual(["pause"]);
    expect(selectOffers(offers, "survey_only", null)).toEqual([]);
  });
});

describe("preview (dashboard customizer)", () => {
  it("renders inline with no network and keeps the cancel link on every step", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const target = document.createElement("div");
    document.body.append(target);
    const handle = preview(target, { config: { headline: "Hey there" }, viewport: "mobile" });
    expect(q(".bb-title")?.textContent).toBe("Hey there");
    expect(q(".bb")?.getAttribute("data-layout")).toBe("sheet");
    expect(q("[data-boolbul-escape]")?.textContent).toBe(DEFAULT_CONFIG.escapeHatchText);
    all(".bb-reason")[0].click();
    q<HTMLButtonElement>(".bb-btn")!.click();
    expect(all(".bb-offer")).toHaveLength(2);
    expect(q("[data-boolbul-escape]")).not.toBeNull();
    handle.update({ config: { headline: "Hey there", mobileLayout: "modal", themePreset: "midnight_oled" } });
    expect(q(".bb")?.getAttribute("data-layout")).toBe("modal");
    expect(q(".bb")?.getAttribute("data-preset")).toBe("midnight_oled");
    expect(fetchSpy).not.toHaveBeenCalled();
    handle.destroy();
    expect(shadow()).toBeNull();
  });
});

describe("live open()", () => {
  const base = { publicKey: "bb_pub_test1234", customerId: "cus_1", subscriptionId: "sub_1", mrrCents: 4900 };

  function api(overrides: Partial<Record<"init" | "claim" | "config", () => Response | Promise<Response>>> = {}) {
    const calls: Array<{ url: string; body: Record<string, unknown> | null }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
      if (url.includes("/widget-config/")) return overrides.config?.() ?? Response.json({ headline: "Wait up" });
      if (url.endsWith("/intercept/init")) return overrides.init?.() ?? Response.json({ failOpen: false, initToken: "init.jwt", rules: offers });
      if (url.endsWith("/intercept/claim")) return overrides.claim?.() ?? Response.json({ failOpen: false, offerJwt: "offer.jwt" });
      return new Response(null, { status: 202 });
    }));
    return calls;
  }

  it("runs survey → offer → host apply → success, recording the session", async () => {
    const calls = api();
    const onOfferAccepted = vi.fn(async () => undefined);
    const onCancel = vi.fn();
    await open({ ...base, onOfferAccepted, onCancel });
    expect(q(".bb-title")?.textContent).toBe("Wait up");
    expect(calls.find((c) => c.url.endsWith("/init"))?.body).toMatchObject({ mrrCents: 4900, customerId: "cus_1" });
    all(".bb-reason").find((el) => el.textContent?.includes("too expensive"))!.click();
    q<HTMLButtonElement>(".bb-btn")!.click();
    all(".bb-offer .bb-btn")[0].click();
    await flush(); await flush();
    expect(calls.find((c) => c.url.endsWith("/claim"))?.body).toEqual({ initToken: "init.jwt", selection: "r-discount", reasonId: "too_expensive" });
    expect(onOfferAccepted).toHaveBeenCalledWith(expect.objectContaining({ offerJwt: "offer.jwt", offerType: "discount", reasonId: "too_expensive" }));
    expect(q(".bb-title")?.textContent).toBe("Done!");
    expect(onCancel).not.toHaveBeenCalled();
    expect(calls.filter((c) => c.url.endsWith("/outcome")).map((c) => c.body?.event)).toEqual(["shown"]);
  });

  it("cancels in one click from any step and forwards the reason", async () => {
    const calls = api();
    const onCancel = vi.fn();
    await open({ ...base, onOfferAccepted: vi.fn(), onCancel });
    all(".bb-reason").find((el) => el.textContent?.includes("not using"))!.click();
    q<HTMLButtonElement>("[data-boolbul-escape]")!.click();
    expect(onCancel).toHaveBeenCalledWith({ reasonId: "unused", comment: null, failedOpen: false });
    expect(shadow()).toBeNull();
    expect(calls.filter((c) => c.url.endsWith("/outcome")).map((c) => c.body?.event)).toEqual(["shown", "cancelled"]);
  });

  it("fails open within 1.5s when BoolBul is slow", async () => {
    vi.useFakeTimers();
    api({ init: () => new Promise<Response>(() => undefined) });
    const onCancel = vi.fn();
    const pending = open({ ...base, onOfferAccepted: vi.fn(), onCancel });
    await vi.advanceTimersByTimeAsync(1499);
    expect(onCancel).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    await pending;
    expect(onCancel).toHaveBeenCalledWith({ reasonId: null, comment: null, failedOpen: true });
    expect(shadow()).toBeNull();
  });

  it.each([
    ["an error response", () => Response.json({ error: "tenant_unavailable", failOpen: true }, { status: 403 })],
    ["a fail-open answer", () => Response.json({ status: "failed_open", failOpen: true, rules: [] })],
  ])("fails open on %s", async (_label, init) => {
    api({ init });
    const onCancel = vi.fn();
    await open({ ...base, onOfferAccepted: vi.fn(), onCancel });
    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ failedOpen: true }));
  });

  it("shows a retry message when the host can't apply the offer, and cancel still works", async () => {
    api();
    const onCancel = vi.fn();
    await open({ ...base, onOfferAccepted: vi.fn(async () => { throw new Error("billing down"); }), onCancel });
    all(".bb-reason")[0].click();
    q<HTMLButtonElement>(".bb-btn")!.click();
    all(".bb-offer .bb-btn")[0].click();
    await flush(); await flush();
    expect(q(".bb-error")?.textContent).toContain("couldn't apply");
    q<HTMLButtonElement>("[data-boolbul-escape]")!.click();
    expect(onCancel).toHaveBeenCalled();
  });

  it("refuses to open without required options and still lets the host cancel", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onCancel = vi.fn();
    await open({ ...base, customerId: "", onOfferAccepted: vi.fn(), onCancel });
    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ failedOpen: true }));
  });
});
