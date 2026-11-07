import "server-only";
import { createSupabaseAdmin } from "@/backend/supabase/admin";
import { createTursoClient } from "@/backend/turso-edge/client";
import { quotaForPlan } from "@/backend/workspace/overview";
import { ensureWorkspace } from "@/backend/workspace/provision";
import { adminAlertEmail, BETA_ADMIN_INBOX, sendEmail, welcomeEmail } from "./email";

export const BETA_SEATS = 100;
export const UNLIMITED_QUOTA = 1_000_000;

export class BetaError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) {
    super(message);
    this.name = "BetaError";
  }
}

export interface ApplicationInput { fullName: string; websiteUrl: string }

/** Accepts "acme.com", "https://acme.com/app"… and returns a normalised https URL. */
export function normalizeWebsite(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new BetaError("invalid_website", 400, "Add your SaaS or app website.");
  const raw = value.trim();
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new BetaError("invalid_website", 400, "Enter a valid website, like acme.com.");
  }
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password ||
      /[^a-z0-9.-]/i.test(url.hostname) || url.href.length > 300) {
    throw new BetaError("invalid_website", 400, "Enter a valid website, like acme.com.");
  }
  url.hash = "";
  return url.href.replace(/\/$/, "");
}

export function parseApplication(body: Record<string, unknown>): ApplicationInput {
  const fullName = typeof body.fullName === "string" ? body.fullName.replace(/\s+/g, " ").trim() : "";
  if (fullName.length < 2 || fullName.length > 100) throw new BetaError("invalid_name", 400, "Enter your full name.");
  return { fullName, websiteUrl: normalizeWebsite(body.websiteUrl) };
}

type Admin = ReturnType<typeof createSupabaseAdmin>;

type ApplicationRow = {
  id: string; user_id: string; tenant_id: string | null; full_name: string; email: string; website_url: string;
  status: "pending" | "confirmed" | "rejected"; applied_at: string; admin_notified_at: string | null;
  edge_synced_at: string | null; welcomed_at: string | null;
};
const APPLICATION_COLUMNS = "id, user_id, tenant_id, full_name, email, website_url, status, applied_at, admin_notified_at, edge_synced_at, welcomed_at";

async function tenantFor(admin: Admin, userId: string): Promise<string | null> {
  const { data } = await admin.from("tenant_memberships").select("tenant_id").eq("user_id", userId)
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  return (data as { tenant_id?: string } | null)?.tenant_id ?? null;
}

/** Idempotent: one application per account. Caller must have verified `userId`. */
export async function createApplication(userId: string, email: string, input: ApplicationInput): Promise<ApplicationRow> {
  const admin = createSupabaseAdmin();
  const existing = await admin.from("invite_applications").select(APPLICATION_COLUMNS).eq("user_id", userId).maybeSingle();
  if (existing.data) return existing.data as ApplicationRow;
  const tenantId = await tenantFor(admin, userId);
  const { data, error } = await admin.from("invite_applications").insert({
    user_id: userId, tenant_id: tenantId, full_name: input.fullName, email, website_url: input.websiteUrl,
  }).select(APPLICATION_COLUMNS).single();
  if (error || !data) throw new BetaError("application_failed", 503, "Your application could not be saved. Please try again.");
  return data as ApplicationRow;
}

export async function notifyAdmin(app: ApplicationRow): Promise<void> {
  if (app.admin_notified_at) return;
  const message = adminAlertEmail({ fullName: app.full_name, email: app.email, websiteUrl: app.website_url, appliedAt: app.applied_at, applicationId: app.id });
  if (await sendEmail({ to: BETA_ADMIN_INBOX, ...message, replyTo: app.email, idempotencyKey: `beta-alert-${app.id}` })) {
    await createSupabaseAdmin().from("invite_applications").update({ admin_notified_at: new Date().toISOString() }).eq("id", app.id);
  }
}

/**
 * Applies an approval/rejection everywhere outside Postgres: edge status and
 * quota in Turso, then the welcome email. Safe to run repeatedly.
 */
export async function processApplication(applicationId: string): Promise<{ status: string; edgeSynced: boolean; welcomed: boolean }> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("invite_applications").select(APPLICATION_COLUMNS).eq("id", applicationId).maybeSingle();
  const app = data as ApplicationRow | null;
  if (!app) throw new BetaError("not_found", 404, "Application not found.");
  if (!app.admin_notified_at) await notifyAdmin(app).catch(() => undefined);

  let edgeSynced = app.edge_synced_at != null;
  if (!edgeSynced && app.status !== "pending") {
    const confirmed = app.status === "confirmed";
    // Make sure the edge binding exists (first login may not have happened yet).
    const workspace = confirmed ? await ensureWorkspace(app.user_id).catch(() => null) : null;
    const tenantId = app.tenant_id ?? workspace?.tenantId ?? await tenantFor(admin, app.user_id);
    if (tenantId) {
      const db = createTursoClient(AbortSignal.timeout(8000));
      try {
        const result = await db.execute({
          sql: "UPDATE edge_tenants SET status = ?, monthly_intercept_quota = ?, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = ?",
          args: [confirmed ? "active" : "suspended", confirmed ? UNLIMITED_QUOTA : 0, tenantId],
        });
        edgeSynced = result.rowsAffected === 1;
      } finally {
        db.close();
      }
      if (edgeSynced) await admin.from("invite_applications").update({ edge_synced_at: new Date().toISOString(), tenant_id: tenantId }).eq("id", app.id);
    }
  }

  let welcomed = app.welcomed_at != null;
  if (app.status === "confirmed" && edgeSynced && !welcomed) {
    const tenantId = app.tenant_id ?? await tenantFor(admin, app.user_id);
    const { data: tenant } = await admin.from("tenants").select("public_key, trial_ends_at").eq("id", tenantId ?? "").maybeSingle();
    const t = tenant as { public_key?: string; trial_ends_at?: string | null } | null;
    if (t?.public_key) {
      const message = welcomeEmail({ firstName: app.full_name.split(" ")[0], publicKey: t.public_key, trialEndsAt: t.trial_ends_at ?? null });
      welcomed = await sendEmail({ to: app.email, ...message, idempotencyKey: `beta-welcome-${app.id}` });
      if (welcomed) await admin.from("invite_applications").update({ welcomed_at: new Date().toISOString() }).eq("id", app.id);
    }
  }
  return { status: app.status, edgeSynced, welcomed };
}

/** Cron safety net: finishes anything the database webhook missed and ends expired passes. */
export async function reconcileBeta(): Promise<{ processed: number; expired: number; pruned: number }> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("invite_applications").select("id")
    .or("admin_notified_at.is.null,and(status.neq.pending,edge_synced_at.is.null),and(status.eq.confirmed,welcomed_at.is.null)")
    .limit(50);
  let processed = 0;
  for (const row of (data ?? []) as { id: string }[]) {
    try { await processApplication(row.id); processed++; } catch { /* retried next run */ }
  }
  const { data: expiredRows } = await admin.from("tenants").select("id, plan_tier")
    .lt("trial_ends_at", new Date().toISOString()).eq("access_status", "active").limit(200);
  let expired = 0;
  if (expiredRows?.length) {
    const db = createTursoClient(AbortSignal.timeout(8000));
    try {
      for (const t of expiredRows as { id: string; plan_tier: string }[]) {
        const quota = quotaForPlan(t.plan_tier);
        const result = await db.execute({
          sql: "UPDATE edge_tenants SET monthly_intercept_quota = ? WHERE tenant_id = ? AND monthly_intercept_quota <> ?",
          args: [quota, t.id, quota],
        });
        expired += result.rowsAffected;
      }
    } finally {
      db.close();
    }
  }
  const pruned = await pruneDeletedWorkspaces().catch(() => 0);
  return { processed, expired, pruned };
}

/**
 * Removes edge bindings (and their rules) for workspaces that no longer exist in
 * Supabase, so a deleted workspace's public key stops opening sessions.
 * Only runs when the Supabase listing is complete, never on partial reads.
 */
export async function pruneDeletedWorkspaces(): Promise<number> {
  const admin = createSupabaseAdmin();
  const { data, error, count } = await admin.from("tenants").select("id", { count: "exact" }).limit(10_000);
  if (error || !data || count === null || data.length !== count) return 0;
  const live = new Set((data as { id: string }[]).map((t) => t.id));
  const db = createTursoClient(AbortSignal.timeout(8000));
  try {
    const edge = await db.execute("SELECT tenant_id FROM edge_tenants");
    const orphans = edge.rows.map((r) => String(r.tenant_id)).filter((id) => !live.has(id));
    if (!orphans.length || orphans.length > 500) return 0;
    for (const id of orphans) {
      await db.batch([
        { sql: "DELETE FROM edge_retention_rules WHERE tenant_id = ?", args: [id] },
        { sql: "DELETE FROM edge_tenants WHERE tenant_id = ?", args: [id] },
      ], "write");
    }
    return orphans.length;
  } finally {
    db.close();
  }
}

export async function seatsTaken(): Promise<number> {
  const { count } = await createSupabaseAdmin().from("invite_applications").select("id", { count: "exact", head: true }).eq("status", "confirmed");
  return count ?? 0;
}
