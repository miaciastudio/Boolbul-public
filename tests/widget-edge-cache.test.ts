import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, OPTIONS } from "@/app/api/v1/widget-config/[publicKey]/route";
import { FALLBACK_ESCAPE_HATCH } from "@boolbul/sdk";

const call = (publicKey: string) =>
  GET(new NextRequest(`https://boolbul.com/api/v1/widget-config/${publicKey}`), { params: Promise.resolve({ publicKey }) });

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("public widget config endpoint", () => {
  it("answers CORS preflight", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
  });

  it("rejects malformed keys with the compliant default and no lookup", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await call("bad");
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid_public_key", themePreset: "neo_brutalist", escapeHatchText: FALLBACK_ESCAPE_HATCH });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the stored design normalised, with a short CDN cache", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    vi.stubGlobal("fetch", vi.fn(async (url: URL) => url.pathname.endsWith("/tenants")
      ? Response.json([{ id: "tenant-1" }])
      : Response.json([{
        theme_preset: "midnight_oled", accent_color: "#ff00aa", border_radius_px: 99, headline_text: "Wait!",
        escape_hatch_text: "No, I hate saving money", survey_reasons: [{ id: "unused", label: "Not using it" }, { id: "hack", label: "x" }],
        mobile_layout: "modal", logo_url: "javascript:alert(1)", show_branding: false, primary_offer_type: "pause_only",
      }])));
    const res = await call("bb_pub_0123456789abcdef");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=60");
    expect(await res.json()).toMatchObject({
      themePreset: "midnight_oled", accentColor: "#FF00AA", borderRadius: 32, headline: "Wait!",
      escapeHatchText: FALLBACK_ESCAPE_HATCH, surveyReasons: [{ id: "unused", label: "Not using it" }],
      mobileLayout: "modal", logoUrl: null, showBranding: false, offerMode: "pause_only",
    });
  });

  it("fails safe to the default when the database is unavailable", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    const res = await call("bb_pub_0123456789abcdef");
    expect(res.status).toBe(200);
    expect((await res.json()).escapeHatchText).toBe(FALLBACK_ESCAPE_HATCH);
  });
});
