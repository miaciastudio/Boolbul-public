import { describe, it, expect } from "vitest";
import { GET, OPTIONS } from "@/app/api/v1/widget-config/[publicKey]/route";
import { NextRequest } from "next/server";
import { FALLBACK_ESCAPE_HATCH_LABEL } from "@/lib/widget-themes/compliance";

describe("Widget Edge-Cached Endpoint (/api/v1/widget-config/[publicKey])", () => {
  it("OPTIONS preflight returns HTTP 204 with full CORS and Edge Cache headers", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
  });

  it("GET returns 400 with default fallback when publicKey is missing or invalid", async () => {
    const req = new NextRequest("https://boolbul.com/api/v1/widget-config/bad");
    const res = await GET(req, { params: { publicKey: "bad" } });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("Invalid public key");
    expect(body.themePreset).toBe("neo_brutalist");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
  });

  it("GET returns valid widget configuration with 3600s Edge CDN cache headers", async () => {
    const req = new NextRequest("https://boolbul.com/api/v1/widget-config/bb_pub_test_12345");
    const res = await GET(req, { params: { publicKey: "bb_pub_test_12345" } });

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
    expect(res.headers.get("CDN-Cache-Control")).toBe("max-age=3600");
    expect(res.headers.get("Cloudflare-CDN-Cache-Control")).toBe("max-age=3600");

    const body = await res.json();
    expect(body.themePreset).toBeDefined();
    expect(body.headlineText).toBeDefined();
    expect(body.escapeHatchText).toBeTruthy();
    expect(body.showDiscountOffer).toBe(true);
    expect(body.showPauseOffer).toBe(true);
  });
});

