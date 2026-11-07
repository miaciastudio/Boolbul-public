import "server-only";
import { createSupabaseAdmin } from "@/backend/supabase/admin";
import { createTursoClient } from "@/backend/turso-edge/client";
import { hashSigningSecret } from "@/lib/edge/tenant-secret";
import { WorkspaceApiError } from "./api";
import { WORKSPACE_TIMEOUT_MS } from "./rules";

export type GatewayId = "dodo_payments" | "stripe";

export interface WorkspaceSettingsInput {
  name?: string;
  gateway?: GatewayId;
  primaryDomain?: string | null;
}

const DOMAIN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export function parseWorkspaceSettings(value: unknown): WorkspaceSettingsInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new WorkspaceApiError("invalid_settings", 400, "Send workspace settings as a JSON object.");
  }
  const body = value as Record<string, unknown>;
  const allowed = new Set(["name", "gateway", "primaryDomain"]);
  if (Object.keys(body).some((key) => !allowed.has(key)) || Object.keys(body).length === 0) {
    throw new WorkspaceApiError("invalid_settings", 400, "Only name, gateway and primaryDomain can be changed here.");
  }
  const settings: WorkspaceSettingsInput = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 80) {
      throw new WorkspaceApiError("invalid_name", 400, "Workspace name must be 1-80 characters.");
    }
    settings.name = body.name.trim();
  }
  if (body.gateway !== undefined) {
    if (body.gateway !== "dodo_payments" && body.gateway !== "stripe") {
      throw new WorkspaceApiError("invalid_gateway", 400, "BoolBul currently supports Dodo Payments and Stripe. Other gateways are coming soon.");
    }
    settings.gateway = body.gateway;
  }
  if (body.primaryDomain !== undefined) {
    if (body.primaryDomain === null || body.primaryDomain === "") {
      settings.primaryDomain = null;
    } else {
      const domain = typeof body.primaryDomain === "string"
        ? body.primaryDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
        : "";
      if (!DOMAIN.test(domain) || domain.length > 253) {
        throw new WorkspaceApiError("invalid_domain", 400, "Enter a domain like app.example.com.");
      }
      settings.primaryDomain = domain;
    }
  }
  return settings;
}

/** Caller must be a verified owner/admin of tenantId (see handleWorkspaceRequest). */
export async function updateWorkspaceSettings(tenantId: string, settings: WorkspaceSettingsInput) {
  const admin = createSupabaseAdmin();
  const update: Record<string, string | null> = {};
  if (settings.name !== undefined) update.name = settings.name;
  if (settings.gateway !== undefined) update.gateway = settings.gateway;
  if (settings.primaryDomain !== undefined) update.primary_domain = settings.primaryDomain;
  const { data, error } = await admin.from("tenants").update(update).eq("id", tenantId)
    .select("id, name, gateway, primary_domain").single();
  if (error || !data) throw new WorkspaceApiError("settings_failed", 503, "Settings could not be saved. Please retry.");
  if (settings.gateway !== undefined) {
    const db = createTursoClient(AbortSignal.timeout(WORKSPACE_TIMEOUT_MS));
    try {
      await db.execute({ sql: "UPDATE edge_tenants SET gateway = ?, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = ?", args: [settings.gateway, tenantId] });
    } catch {
      throw new WorkspaceApiError("edge_write_failed", 503, "The gateway was saved but the edge did not confirm it. Save again to retry.");
    } finally {
      db.close();
    }
  }
  return { name: data.name as string, gateway: data.gateway as GatewayId, primaryDomain: (data.primary_domain as string | null) ?? null };
}

export function generateSigningSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `bb_sec_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Issues a new signing secret, stores it server-side and updates the edge hash.
 * The plaintext is returned exactly once to the caller and never persisted in the browser.
 */
export async function rotateSigningSecret(tenantId: string): Promise<{ signingSecret: string; rotatedAt: string }> {
  const signingSecret = generateSigningSecret();
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("tenants").update({ signing_secret: signingSecret })
    .eq("id", tenantId).select("id, updated_at").single();
  if (error || !data) throw new WorkspaceApiError("rotation_failed", 503, "The secret was not rotated. Your old secret still works; please retry.");
  const db = createTursoClient(AbortSignal.timeout(WORKSPACE_TIMEOUT_MS));
  try {
    const result = await db.execute({
      sql: "UPDATE edge_tenants SET signing_secret_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = ?",
      args: [await hashSigningSecret(signingSecret), tenantId],
    });
    if (result.rowsAffected !== 1) throw new Error("missing edge tenant");
  } catch {
    // Offers fail open (customers can still cancel) until a retry re-syncs the edge.
    throw new WorkspaceApiError("edge_write_failed", 503, "The new secret was not confirmed at the edge. Rotate again; offers stay paused until it succeeds.");
  } finally {
    db.close();
  }
  return { signingSecret, rotatedAt: String(data.updated_at) };
}
