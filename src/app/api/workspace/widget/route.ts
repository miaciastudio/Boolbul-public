import type { NextRequest } from "next/server";
import { normalizeConfig, type WidgetConfig } from "@boolbul/sdk";
import { handleWorkspaceRequest, readJsonBody, WorkspaceApiError } from "@/backend/workspace/api";

export const dynamic = "force-dynamic";

const COLUMNS = "theme_preset, accent_color, border_radius_px, font_family, headline_text, body_text, escape_hatch_text, " +
  "primary_offer_type, survey_enabled, survey_reasons, success_text, mobile_layout, logo_url, show_branding, updated_at";

function toRow(config: WidgetConfig) {
  return {
    theme_preset: config.themePreset, accent_color: config.accentColor, border_radius_px: config.borderRadius,
    font_family: config.fontFamily || "Inter", headline_text: config.headline, body_text: config.body,
    escape_hatch_text: config.escapeHatchText, primary_offer_type: config.offerMode, survey_enabled: config.surveyEnabled,
    survey_reasons: config.surveyReasons, success_text: config.successText, mobile_layout: config.mobileLayout,
    logo_url: config.logoUrl, show_branding: config.showBranding,
  };
}

async function load(caller: Parameters<Parameters<typeof handleWorkspaceRequest>[2]>[0]) {
  const [{ data: row, error }, { data: tenant }] = await Promise.all([
    caller.supabase.from("widget_configs" as never).select(COLUMNS).eq("tenant_id", caller.tenantId).maybeSingle(),
    caller.supabase.from("tenants").select("public_key").eq("id", caller.tenantId).maybeSingle(),
  ]);
  if (error) throw new WorkspaceApiError("widget_unavailable", 503, "Your widget settings could not be loaded. Please retry.");
  const record = (row ?? {}) as Record<string, unknown>;
  return {
    config: normalizeConfig(record),
    updatedAt: typeof record.updated_at === "string" ? record.updated_at : null,
    publicKey: (tenant as { public_key?: string } | null)?.public_key ?? null,
    canManage: caller.role === "owner" || caller.role === "admin",
  };
}

export function GET(request: NextRequest) {
  return handleWorkspaceRequest(request, { write: false, managerOnly: false }, load);
}

/** Saves through the caller's own session: RLS + column grants decide what may change. */
export function PUT(request: NextRequest) {
  return handleWorkspaceRequest(request, { write: true, managerOnly: true }, async (caller) => {
    const body = await readJsonBody(request, 16_384);
    const config = normalizeConfig((body as { config?: unknown })?.config ?? body);
    const { error } = await caller.supabase.from("widget_configs" as never)
      .update(toRow(config) as never).eq("tenant_id", caller.tenantId);
    if (error) throw new WorkspaceApiError("widget_save_failed", 503, "Your changes were not saved. Please retry.");
    return load(caller);
  });
}
