import "server-only";
import { createSupabaseAdmin } from "@/backend/supabase/admin";
import { createTursoClient } from "@/backend/turso-edge/client";
import { hashSigningSecret } from "@/lib/edge/tenant-secret";
import { quotaForPlan } from "./overview";
import { workspaceRuleStatements, WORKSPACE_TIMEOUT_MS } from "./rules";

/** Internal only: call AFTER a successful Supabase auth.getUser(), never with browser input. */
export async function ensureWorkspace(userId: string): Promise<{ tenantId: string; onboardingCompleted: boolean }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error("Workspace user is invalid");
  }
  const admin = createSupabaseAdmin();
  const { data: tenantId, error: provisionError } = await admin.rpc("ensure_workspace_for_user", { p_user_id: userId });
  if (provisionError || typeof tenantId !== "string") throw new Error("Workspace provisioning failed");

  const { data: tenant, error } = await admin.from("tenants")
    .select("id, public_key, signing_secret, gateway, plan_tier, onboarding_completed_at")
    .eq("id", tenantId).single();
  if (error || !tenant || tenant.id !== tenantId || typeof tenant.public_key !== "string" ||
      typeof tenant.signing_secret !== "string" || !tenant.public_key || tenant.signing_secret.length < 32) {
    throw new Error("Workspace binding is unavailable");
  }

  const secretHash = await hashSigningSecret(tenant.signing_secret);
  const signal = AbortSignal.timeout(WORKSPACE_TIMEOUT_MS);
  const db = createTursoClient(signal);
  try {
    // No distributed transaction exists. If the edge write fails, throw so the
    // callback cannot claim readiness. A later verified login safely retries.
    await db.batch([
      {
        sql: `INSERT INTO edge_tenants (tenant_id, public_key, signing_secret_hash, gateway, monthly_intercept_quota)
          VALUES (?, ?, ?, ?, ?) ON CONFLICT(tenant_id) DO UPDATE SET
          public_key = excluded.public_key, signing_secret_hash = excluded.signing_secret_hash,
          gateway = excluded.gateway, updated_at = CURRENT_TIMESTAMP`, // quota/status: set on insert, then owned by billing
        args: [tenantId, tenant.public_key, secretHash, tenant.gateway === "stripe" ? "stripe" : "dodo_payments", quotaForPlan(tenant.plan_tier)],
      },
      ...workspaceRuleStatements(tenantId),
    ], "write");
    signal.throwIfAborted();
  } catch {
    // Do not propagate upstream errors that might contain SQL or signing material.
    throw new Error("Workspace edge sync failed; please sign in again to retry");
  } finally {
    db.close();
  }
  return { tenantId, onboardingCompleted: tenant.onboarding_completed_at != null };
}
