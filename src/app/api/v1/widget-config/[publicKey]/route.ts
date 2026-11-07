import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_CONFIG, normalizeConfig } from "@boolbul/sdk";
import { runInBackground } from "@/lib/edge/background";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
// Short edge cache: customizer saves show up for customers within about a minute.
const cacheHeaders = {
  ...corsHeaders,
  "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=600",
};

const COLUMNS = [
  "theme_preset", "accent_color", "border_radius_px", "font_family", "headline_text", "body_text",
  "escape_hatch_text", "primary_offer_type", "survey_enabled", "survey_reasons", "success_text",
  "mobile_layout", "logo_url", "show_branding",
].join(",");

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

async function rest(path: string, params: Record<string, string>, signal: AbortSignal): Promise<unknown[] | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;
  const url = new URL(`/rest/v1/${path}`, base);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal, cache: "no-store" });
  if (!response.ok) return null;
  const rows: unknown = await response.json();
  return Array.isArray(rows) ? rows : null;
}

/** Cloudflare's per-colo cache (custom domains only); undefined in tests and workers.dev. */
function edgeCache(): Cache | undefined {
  return (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ publicKey: string }> }) {
  const { publicKey } = await params;
  const cache = edgeCache();
  const cacheKey = new Request(new URL(request.nextUrl.pathname, request.nextUrl.origin));
  const hit = await cache?.match(cacheKey).catch(() => undefined);
  if (hit) return hit;
  const response = await build(publicKey);
  if (cache && response.status === 200) runInBackground(cache.put(cacheKey, response.clone()));
  return response;
}

/** Public widget appearance for a workspace. Never fails: unknown keys get the compliant default. */
async function build(publicKey: string): Promise<Response> {
  if (!/^bb_pub_[A-Za-z0-9_]{6,64}$/.test(publicKey)) {
    return NextResponse.json({ error: "invalid_public_key", ...DEFAULT_CONFIG }, { status: 400, headers: corsHeaders });
  }
  try {
    const signal = AbortSignal.timeout(1200);
    const tenants = await rest("tenants", { select: "id", public_key: `eq.${publicKey}`, limit: "1" }, signal);
    const tenantId = (tenants?.[0] as { id?: unknown } | undefined)?.id;
    if (typeof tenantId !== "string") return NextResponse.json(DEFAULT_CONFIG, { headers: cacheHeaders });
    const configs = await rest("widget_configs", { select: COLUMNS, tenant_id: `eq.${tenantId}`, limit: "1" }, signal);
    return NextResponse.json(normalizeConfig(configs?.[0] ?? {}), { headers: cacheHeaders });
  } catch {
    return NextResponse.json(DEFAULT_CONFIG, { headers: cacheHeaders });
  }
}
