import "server-only";
import { createTursoClient } from "@/backend/turso-edge/client";
import { usageMonth } from "@/lib/edge/queries";
import { EXIT_REASONS, isExitReasonId } from "@/lib/retention/reasons";
import { WorkspaceApiError, type WorkspaceCaller } from "./api";
import { getWorkspaceSetup } from "./setup";

export type PlanTier = "free" | "starter" | "pro" | "scale";

/** Monthly saved-subscriber allowance enforced at the edge. */
export const PLAN_QUOTAS: Record<PlanTier, number> = { free: 25, starter: 500, pro: 1_000_000, scale: 1_000_000 };

/** The beta's 3-month free pass counts as Pro until it ends. */
export function effectivePlan(plan: unknown, trialEndsAt?: string | null, now = Date.now()): PlanTier {
  const base = (typeof plan === "string" && plan in PLAN_QUOTAS ? plan : "free") as PlanTier;
  if (trialEndsAt && Date.parse(trialEndsAt) > now && (base === "free" || base === "starter")) return "pro";
  return base;
}

export function quotaForPlan(plan: unknown): number {
  // Self-hosted installs (open-core) have no plan limits.
  if (process.env.BOOLBUL_SELF_HOSTED === "true") return 1_000_000;
  return PLAN_QUOTAS[(typeof plan === "string" && plan in PLAN_QUOTAS ? plan : "free") as PlanTier];
}

export interface LedgerRow {
  id: string;
  customerId: string;
  subscriptionId: string;
  gateway: string;
  mrrCents: number;
  status: string;
  offerType: string | null;
  exitReason: string | null;
  exitReasonLabel: string | null;
  exitFeedback: string | null;
  createdAt: string;
}

type EventRow = {
  id: string; customer_id: string; subscription_id: string; gateway: string; mrr_cents: number; status: string;
  offer_type: string | null; exit_reason: string | null; exit_feedback: string | null; created_at: string;
};

function toLedger(row: EventRow): LedgerRow {
  return {
    id: row.id, customerId: row.customer_id, subscriptionId: row.subscription_id, gateway: row.gateway,
    mrrCents: row.mrr_cents, status: row.status, offerType: row.offer_type, exitReason: row.exit_reason,
    exitReasonLabel: isExitReasonId(row.exit_reason) ? EXIT_REASONS[row.exit_reason].label : row.exit_reason,
    exitFeedback: row.exit_feedback, createdAt: row.created_at,
  };
}

const EVENT_COLUMNS = "id, customer_id, subscription_id, gateway, mrr_cents, status, offer_type, exit_reason, exit_feedback, created_at";

export async function loadLedger(caller: WorkspaceCaller, limit: number, sinceIso?: string): Promise<LedgerRow[]> {
  let query = caller.supabase.from("churn_events").select(EVENT_COLUMNS)
    .eq("tenant_id", caller.tenantId).eq("event_scope", "retention")
    .order("created_at", { ascending: false }).limit(limit);
  if (sinceIso) query = query.gte("created_at", sinceIso);
  const { data, error } = await query.returns<EventRow[]>();
  if (error) throw new WorkspaceApiError("ledger_unavailable", 503, "Retention activity could not be loaded. Please retry.");
  return (data ?? []).map(toLedger);
}

export function summarize(rows: LedgerRow[]) {
  const saved = rows.filter((row) => row.status === "rescued_discount" || row.status === "rescued_pause");
  const cancelled = rows.filter((row) => row.status === "cancelled");
  const decided = saved.length + cancelled.length;
  const reasons = new Map<string, number>();
  for (const row of rows) if (row.exitReason) reasons.set(row.exitReason, (reasons.get(row.exitReason) ?? 0) + 1);
  return {
    sessions: rows.length,
    saved: saved.length,
    cancelled: cancelled.length,
    saveRate: decided ? Math.round((saved.length / decided) * 1000) / 10 : 0,
    savedMrrCents: saved.reduce((sum, row) => sum + row.mrrCents, 0),
    discounts: saved.filter((row) => row.status === "rescued_discount").length,
    pauses: saved.filter((row) => row.status === "rescued_pause").length,
    topReasons: [...reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => ({
      id, count, label: isExitReasonId(id) ? EXIT_REASONS[id].label : id,
    })),
  };
}

export async function loadOverview(caller: WorkspaceCaller) {
  const { data: tenant, error } = await caller.supabase.from("tenants")
    .select("id, name, public_key, plan_tier, billing_status, billing_mode, gateway, primary_domain, onboarding_completed_at, access_status, trial_ends_at")
    .eq("id", caller.tenantId).maybeSingle()
    .returns<{ id: string; name: string; public_key: string; plan_tier: PlanTier; billing_status: string; billing_mode: string | null;
      gateway: string; primary_domain: string | null; onboarding_completed_at: string | null;
      access_status: "pending" | "active" | "rejected"; trial_ends_at: string | null }>();
  if (error || !tenant) throw new WorkspaceApiError("workspace_unavailable", 503, "Your workspace could not be loaded. Please retry.");

  const { data: application } = await caller.supabase.from("invite_applications" as never)
    .select("full_name, website_url, status, applied_at, confirmed_at").maybeSingle()
    .returns<{ full_name: string; website_url: string; status: string; applied_at: string; confirmed_at: string | null }>();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const month = usageMonth();
  const [recent, ledger, usage, setup] = await Promise.all([
    loadLedger(caller, 2000, since),
    loadLedger(caller, 50),
    (async () => {
      const db = createTursoClient(AbortSignal.timeout(5000));
      try {
        const result = await db.execute({ sql: "SELECT current_month_usage, usage_month, monthly_intercept_quota FROM edge_tenants WHERE tenant_id = ?", args: [caller.tenantId] });
        const row = result.rows[0];
        if (!row) return null;
        return { month, used: row.usage_month === month ? Number(row.current_month_usage) : 0, quota: Number(row.monthly_intercept_quota) };
      } catch {
        return null;
      } finally {
        db.close();
      }
    })(),
    getWorkspaceSetup({ membership: { tenant_id: caller.tenantId, role: caller.role } }, caller.supabase).catch(() => null),
  ]);

  return {
    workspace: {
      id: tenant.id, name: tenant.name, publicKey: tenant.public_key, plan: effectivePlan(tenant.plan_tier, tenant.trial_ends_at),
      billedPlan: tenant.plan_tier, trialEndsAt: tenant.trial_ends_at,
      billingStatus: tenant.billing_status, billingMode: tenant.billing_mode, gateway: tenant.gateway,
      primaryDomain: tenant.primary_domain, onboardingCompleted: tenant.onboarding_completed_at != null,
      role: caller.role, canManage: caller.role === "owner" || caller.role === "admin", email: caller.user.email ?? null,
    },
    access: {
      status: tenant.access_status,
      application: application ? { fullName: application.full_name, websiteUrl: application.website_url, status: application.status,
        appliedAt: application.applied_at, confirmedAt: application.confirmed_at } : null,
    },
    usage: usage ?? { month, used: 0, quota: quotaForPlan(effectivePlan(tenant.plan_tier, tenant.trial_ends_at)) },
    last30Days: summarize(recent),
    ledger,
    offers: setup?.configuration ?? null,
    integration: { live: ledger.length > 0, lastEventAt: ledger[0]?.createdAt ?? null },
  };
}

export function ledgerCsv(rows: LedgerRow[]): string {
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    // Neutralise spreadsheet formula injection from customer-supplied comments.
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const head = ["created_at", "customer_id", "subscription_id", "gateway", "outcome", "offer", "mrr_usd", "exit_reason", "comment"];
  const lines = rows.map((row) => [row.createdAt, row.customerId, row.subscriptionId, row.gateway, row.status, row.offerType,
    (row.mrrCents / 100).toFixed(2), row.exitReason, row.exitFeedback].map(escape).join(","));
  return [head.join(","), ...lines].join("\n");
}
