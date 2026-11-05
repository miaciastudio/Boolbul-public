import "server-only";
import type { Row } from "@libsql/client/web";
import { createSupabaseAdmin } from "@/backend/supabase/admin";
import { getAppUrl } from "@/backend/supabase/config";
import type { createSupabaseServerClient } from "@/backend/supabase/client";
import { createServerSupabaseClient } from "@/backend/supabase/server";
import type { DashboardContext } from "@/backend/supabase/session";
import { createTursoClient } from "@/backend/turso-edge/client";
import {
  DISCOUNT_CHOICES, PAUSE_CHOICES, parseSetupChoices,
  type DiscountChoice, type PauseChoice, type SetupRule, type WorkspaceSetup,
} from "./contract";
import { workspaceRuleStatements, WORKSPACE_TIMEOUT_MS } from "./rules";

type SetupClient = ReturnType<typeof createSupabaseServerClient>;
type SetupContext = Pick<DashboardContext, "membership">;
type PublicTenant = { id: string; public_key: string; onboarding_completed_at: string | null };

export class WorkspaceSetupError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string) {
    super(message);
    this.name = "WorkspaceSetupError";
  }
}

export function canManageWorkspace(role: string): boolean {
  return role === "owner" || role === "admin";
}

function unavailable(): WorkspaceSetupError {
  return new WorkspaceSetupError("workspace_unavailable", 503, "Workspace setup is unavailable. Please sign in again to retry.");
}

async function publicTenant(supabase: SetupClient, tenantId: string): Promise<PublicTenant> {
  // Extend only this query's result, not the auth/session database types.
  const { data, error } = await supabase.from("tenants")
    .select("id, public_key, onboarding_completed_at")
    .eq("id", tenantId).returns<PublicTenant[]>().maybeSingle();
  if (error || !data || data.id !== tenantId || typeof data.public_key !== "string" || !data.public_key) {
    throw unavailable();
  }
  return data;
}

function publicRule(row: Row): SetupRule {
  if (typeof row.trigger_condition !== "string" || typeof row.rule_id !== "string" ||
      !["discount", "pause", "survey_only"].includes(String(row.offer_type))) throw unavailable();
  const condition: unknown = JSON.parse(row.trigger_condition);
  if (!condition || typeof condition !== "object" || Array.isArray(condition)) throw unavailable();
  for (const key of ["priority", "discount_percentage", "discount_duration_months", "pause_duration_days"]) {
    if (typeof row[key] !== "number" || !Number.isSafeInteger(row[key]) || Number(row[key]) < 0) throw unavailable();
  }
  if (Number(row.discount_percentage) > 10000 || (row.is_active !== 0 && row.is_active !== 1)) throw unavailable();
  return {
    ruleId: row.rule_id,
    offerType: row.offer_type as SetupRule["offerType"],
    priority: Number(row.priority),
    triggerCondition: condition as Record<string, unknown>,
    discountBasisPoints: Number(row.discount_percentage),
    discountDurationMonths: Number(row.discount_duration_months),
    pauseDurationDays: Number(row.pause_duration_days),
    isActive: row.is_active === 1,
  };
}

function configuration(tenantId: string, rows: Row[]): WorkspaceSetup["configuration"] {
  const rules = rows.map(publicRule);
  const discount = rules.find((rule) => rule.ruleId === `${tenantId}:discount` && rule.offerType === "discount");
  const pause = rules.find((rule) => rule.ruleId === `${tenantId}:pause` && rule.offerType === "pause");
  const unconditional = (rule: SetupRule | undefined) => rule && Object.keys(rule.triggerCondition).length === 0;
  const discountTier = unconditional(discount)
    ? (Object.keys(DISCOUNT_CHOICES) as DiscountChoice[]).find((key) =>
      DISCOUNT_CHOICES[key].basisPoints === discount!.discountBasisPoints &&
      DISCOUNT_CHOICES[key].months === discount!.discountDurationMonths) ?? null : null;
  const pauseTier = unconditional(pause)
    ? (Object.keys(PAUSE_CHOICES) as PauseChoice[]).find((key) => PAUSE_CHOICES[key].days === pause!.pauseDurationDays) ?? null : null;
  return { discountTier, pauseTier, rules };
}

/** Context must come from requireDashboardContext() or a verified getUser + membership lookup. */
export async function getWorkspaceSetup(context: SetupContext, client?: SetupClient): Promise<WorkspaceSetup> {
  const supabase = client ?? await createServerSupabaseClient("read-only");
  const tenant = await publicTenant(supabase, context.membership.tenant_id);
  const appOrigin = getAppUrl().origin;
  const signal = AbortSignal.timeout(WORKSPACE_TIMEOUT_MS);
  const db = createTursoClient(signal);
  try {
    // Explicit projections: neither the secret nor its hash is read for setup.
    const [binding, result] = await db.batch([
      { sql: "SELECT public_key FROM edge_tenants WHERE tenant_id = ?", args: [tenant.id] },
      {
        sql: `SELECT rule_id, priority, trigger_condition, offer_type, discount_percentage,
          discount_duration_months, pause_duration_days, is_active FROM edge_retention_rules
          WHERE tenant_id = ? ORDER BY priority, rule_id`,
        args: [tenant.id],
      },
    ], "read");
    signal.throwIfAborted();
    if (binding.rows[0]?.public_key !== tenant.public_key) throw unavailable();
    return {
      tenantId: tenant.id, publicKey: tenant.public_key, appOrigin,
      onboardingCompleted: tenant.onboarding_completed_at != null,
      canManage: canManageWorkspace(context.membership.role),
      configuration: configuration(tenant.id, result.rows),
    };
  } catch {
    throw unavailable();
  } finally {
    db.close();
  }
}

/** The caller must verify supabase.auth.getUser(); no tenant identity is accepted from the browser. */
export async function saveWorkspaceSetup(supabase: SetupClient, userId: string, input: unknown): Promise<WorkspaceSetup> {
  const choices = parseSetupChoices(input);
  if (!choices) throw new WorkspaceSetupError("invalid_choices", 400, "Choose a supported discount and pause duration. Extra fields are not allowed.");
  const { data: membership, error } = await supabase.from("tenant_memberships")
    .select("tenant_id, role").eq("user_id", userId)
    .order("created_at", { ascending: true }).order("tenant_id", { ascending: true }).limit(1).maybeSingle();
  if (error) throw unavailable();
  if (!membership || !canManageWorkspace(membership.role)) {
    throw new WorkspaceSetupError("forbidden", 403, "Only a workspace owner or admin can save setup.");
  }
  const tenant = await publicTenant(supabase, membership.tenant_id);
  const signal = AbortSignal.timeout(WORKSPACE_TIMEOUT_MS);
  const db = createTursoClient(signal);
  try {
    const binding = await db.execute({
      sql: "SELECT public_key FROM edge_tenants WHERE tenant_id = ?", args: [tenant.id],
    });
    if (binding.rows[0]?.public_key !== tenant.public_key) throw unavailable();
    const results = await db.batch(workspaceRuleStatements(tenant.id, choices, true), "write");
    signal.throwIfAborted();
    if (results.some((result) => result.rowsAffected !== 1)) throw unavailable();
  } catch {
    throw new WorkspaceSetupError("edge_write_failed", 503, "Offers could not be confirmed saved. Retry with the same choices; setup has not been marked complete.");
  } finally {
    db.close();
  }

  // A separate database cannot join the edge transaction. Never mark complete
  // before the write above succeeds; retries replace only these two offer terms.
  const admin = createSupabaseAdmin();
  const { data: completed, error: completionError } = await admin.from("tenants")
    .update({ onboarding_completed_at: tenant.onboarding_completed_at ?? new Date().toISOString() })
    .eq("id", tenant.id).select("id").single();
  if (completionError || !completed) {
    throw new WorkspaceSetupError("completion_failed", 503, "Offers were saved, but setup could not be marked complete. Retry with the same choices.");
  }
  return getWorkspaceSetup({ membership }, supabase);
}
