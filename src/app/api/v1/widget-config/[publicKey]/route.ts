import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_WIDGET_CONFIG } from "@/lib/widget-themes/types";
import { sanitizeWidgetConfig } from "@/lib/widget-themes/compliance";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  "CDN-Cache-Control": "max-age=3600",
  "Cloudflare-CDN-Cache-Control": "max-age=3600",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { publicKey: string } }
) {
  const { publicKey } = params;

  if (!publicKey || typeof publicKey !== "string" || publicKey.length < 5) {
    return NextResponse.json(
      { error: "Invalid public key", ...DEFAULT_WIDGET_CONFIG },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://doesmcrkuorjkmwtrbbv.supabase.co";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    if (!supabaseKey) {
      return NextResponse.json(DEFAULT_WIDGET_CONFIG, { status: 200, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // 1. Find tenant by publicKey
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id")
      .eq("public_key", publicKey)
      .limit(1)
      .maybeSingle();

    if (tenantError || !tenant) {
      // Fail-safe default
      return NextResponse.json(DEFAULT_WIDGET_CONFIG, { status: 200, headers: corsHeaders });
    }

    // 2. Fetch widget config for tenant
    const { data: config, error: configError } = await supabase
      .from("widget_configs")
      .select("*")
      .eq("tenant_id", tenant.id)
      .limit(1)
      .maybeSingle();

    if (configError || !config) {
      return NextResponse.json(DEFAULT_WIDGET_CONFIG, { status: 200, headers: corsHeaders });
    }

    // 3. Sanitize and enforce FTC compliance before returning
    const sanitized = sanitizeWidgetConfig({
      themePreset: config.theme_preset,
      headlineText: config.headline_text,
      bodyText: config.body_text,
      escapeHatchText: config.escape_hatch_text,
      accentColor: config.accent_color,
      showDiscountOffer: config.primary_offer_type !== "pause_only",
      showPauseOffer: config.primary_offer_type !== "discount_only",
    });

    return NextResponse.json(sanitized, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    // Fail-open: Always return valid widget config with fallback
    return NextResponse.json(DEFAULT_WIDGET_CONFIG, {
      status: 200,
      headers: corsHeaders,
    });
  }
}

