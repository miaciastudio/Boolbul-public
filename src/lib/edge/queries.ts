import type { Client, Row } from "@libsql/client/web";
import { isIdentifier } from "../crypto/jwt";
import { InterceptError } from "./errors";

export type Gateway = "dodo_payments" | "stripe";

export interface EdgeTenant {
  tenantId: string;
  publicKey: string;
  signingSecretHash: string;
  gateway: Gateway;
}

export interface RetentionRule {
  ruleId: string;
  offerType: "discount" | "pause" | "survey_only";
  offerValue: number;
  discountDurationMonths: number;
}

export type EdgeDatabase = Pick<Client, "execute">;

/** UTC month bucket (YYYY-MM) for the lazily reset deflection counter. */
export function usageMonth(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

export async function findTenant(db: EdgeDatabase, publicKey: string, month = usageMonth()): Promise<EdgeTenant> {
  const result = await db.execute({
    sql: `SELECT tenant_id, public_key, signing_secret_hash, gateway FROM edge_tenants
          WHERE public_key = ? AND status IN ('active', 'trial')
          AND (usage_month <> ? OR current_month_usage < monthly_intercept_quota)`,
    args: [publicKey, month],
  });
  const row = result.rows[0];
  if (!row) throw new InterceptError("tenant_unavailable", 403);
  if (!isIdentifier(row.tenant_id) || !isIdentifier(row.public_key) ||
      typeof row.signing_secret_hash !== "string" || !/^[a-f0-9]{64}$/.test(row.signing_secret_hash)) {
    throw new Error("Invalid tenant configuration");
  }
  const gateway: Gateway = row.gateway === "stripe" ? "stripe" : "dodo_payments";
  return { tenantId: row.tenant_id, publicKey: row.public_key, signingSecretHash: row.signing_secret_hash, gateway };
}

/** Counts one deflection (an accepted, signed offer) against the monthly quota. */
export async function incrementUsage(db: EdgeDatabase, tenantId: string, month = usageMonth()): Promise<void> {
  await db.execute({
    sql: `UPDATE edge_tenants SET
          current_month_usage = CASE WHEN usage_month = ? THEN current_month_usage + 1 ELSE 1 END,
          usage_month = ?, updated_at = CURRENT_TIMESTAMP
          WHERE tenant_id = ?`,
    args: [month, month, tenantId],
  });
}

function parseRule(row: Row): RetentionRule | null {
  if (typeof row.trigger_condition !== "string") throw new Error("Invalid rule condition");
  const condition: unknown = JSON.parse(row.trigger_condition);
  if (!condition || typeof condition !== "object" || Array.isArray(condition)) {
    throw new Error("Invalid rule condition");
  }
  const fields = condition as Record<string, unknown>;
  if (Object.keys(fields).some((key) => key !== "min_billing_months" && key !== "plan_tier")) {
    throw new Error("Unsupported rule condition");
  }
  if ((fields.min_billing_months !== undefined &&
      (typeof fields.min_billing_months !== "number" || !Number.isSafeInteger(fields.min_billing_months) || fields.min_billing_months < 0)) ||
      (fields.plan_tier !== undefined && !isIdentifier(fields.plan_tier))) {
    throw new Error("Invalid rule condition");
  }
  // Public browser identifiers do not prove billing age or plan eligibility.
  if ((fields.min_billing_months !== undefined && fields.min_billing_months !== 0) ||
      (fields.plan_tier !== undefined && fields.plan_tier !== "all")) return null;

  const type = row.offer_type;
  const value = type === "discount" ? row.discount_percentage : type === "pause" ? row.pause_duration_days : 0;
  if (!isIdentifier(row.rule_id) || (type !== "discount" && type !== "pause" && type !== "survey_only") ||
      typeof value !== "number" || !Number.isSafeInteger(value) ||
      (type !== "survey_only" && value <= 0) || (type === "discount" && value > 10000) ||
      typeof row.discount_duration_months !== "number" || !Number.isSafeInteger(row.discount_duration_months) || row.discount_duration_months < 0) {
    throw new Error("Invalid rule configuration");
  }
  return { ruleId: row.rule_id, offerType: type, offerValue: value, discountDurationMonths: row.discount_duration_months };
}

export async function findActiveRules(db: EdgeDatabase, tenantId: string): Promise<RetentionRule[]> {
  const result = await db.execute({
    sql: `SELECT rule_id, trigger_condition, offer_type, discount_percentage,
          discount_duration_months, pause_duration_days FROM edge_retention_rules
          WHERE tenant_id = ? AND is_active = 1 ORDER BY priority ASC, rule_id ASC LIMIT 100`,
    args: [tenantId],
  });
  return result.rows.map(parseRule).filter((rule): rule is RetentionRule => rule !== null);
}

/**
 * Tenant + active rules in ONE round trip (the hot path of every cancellation).
 * Same validation as findTenant/findActiveRules, half the edge->database latency.
 */
export async function findTenantWithRules(db: EdgeDatabase, publicKey: string, month = usageMonth()): Promise<{ tenant: EdgeTenant; rules: RetentionRule[] }> {
  const result = await db.execute({
    sql: `SELECT t.tenant_id, t.public_key, t.signing_secret_hash, t.gateway,
          r.rule_id, r.trigger_condition, r.offer_type, r.discount_percentage,
          r.discount_duration_months, r.pause_duration_days
          FROM edge_tenants t
          LEFT JOIN edge_retention_rules r ON r.tenant_id = t.tenant_id AND r.is_active = 1
          WHERE t.public_key = ? AND t.status IN ('active', 'trial')
          AND (t.usage_month <> ? OR t.current_month_usage < t.monthly_intercept_quota)
          ORDER BY r.priority ASC, r.rule_id ASC LIMIT 100`,
    args: [publicKey, month],
  });
  const first = result.rows[0];
  if (!first) throw new InterceptError("tenant_unavailable", 403);
  if (!isIdentifier(first.tenant_id) || !isIdentifier(first.public_key) ||
      typeof first.signing_secret_hash !== "string" || !/^[a-f0-9]{64}$/.test(first.signing_secret_hash)) {
    throw new Error("Invalid tenant configuration");
  }
  const tenant: EdgeTenant = {
    tenantId: first.tenant_id, publicKey: first.public_key, signingSecretHash: first.signing_secret_hash,
    gateway: first.gateway === "stripe" ? "stripe" : "dodo_payments",
  };
  const rules = result.rows.filter((row) => row.rule_id !== null && row.rule_id !== undefined)
    .map(parseRule).filter((rule): rule is RetentionRule => rule !== null);
  return { tenant, rules };
}

const TENANT_CACHE_SECONDS = 60;

/**
 * Session-open variant: serves tenant + rules from Cloudflare's per-colo cache
 * for up to 60 s so most cancellations open without a database round trip.
 * Only positive lookups are cached; /claim always re-reads fresh data.
 */
export async function findTenantWithRulesCached(db: EdgeDatabase, publicKey: string): Promise<{ tenant: EdgeTenant; rules: RetentionRule[] }> {
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  if (!cache) return findTenantWithRules(db, publicKey);
  const month = usageMonth();
  const key = new Request(`https://edge-cache.boolbul.internal/tenant/${encodeURIComponent(publicKey)}/${month}`);
  try {
    const hit = await cache.match(key);
    if (hit) return await hit.json() as { tenant: EdgeTenant; rules: RetentionRule[] };
  } catch { /* cache miss or unavailable: fall through */ }
  const fresh = await findTenantWithRules(db, publicKey, month);
  void cache.put(key, new Response(JSON.stringify(fresh), {
    headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${TENANT_CACHE_SECONDS}` },
  })).catch(() => undefined);
  return fresh;
}

export async function consumeNonce(
  db: EdgeDatabase,
  claim: { nonce: string; tenantId: string; exp: number },
  stage: "claim" | "redeem",
): Promise<void> {
  if (!isIdentifier(claim.nonce) || !isIdentifier(claim.tenantId) || !Number.isSafeInteger(claim.exp)) {
    throw new InterceptError("invalid_request", 400);
  }
  if (claim.exp <= Math.floor(Date.now() / 1000)) throw new InterceptError("expired", 409);
  const expiresAt = new Date(claim.exp * 1000).toISOString();
  const result = await db.execute({
    sql: `INSERT INTO edge_used_nonces (nonce, tenant_id, expires_at)
          SELECT ?, ?, ? WHERE julianday(?) > julianday('now')
          ON CONFLICT(nonce) DO NOTHING`,
    args: [`${stage}:${claim.nonce}`, claim.tenantId, expiresAt, expiresAt],
  });
  if (result.rowsAffected !== 1) throw new InterceptError("already_claimed", 409);
}
