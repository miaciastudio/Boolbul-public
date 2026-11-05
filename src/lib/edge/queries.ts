import type { Client, Row } from "@libsql/client/web";
import { isIdentifier } from "../crypto/jwt";
import { InterceptError } from "./errors";

export interface EdgeTenant {
  tenantId: string;
  publicKey: string;
  signingSecretHash: string;
}

export interface RetentionRule {
  ruleId: string;
  offerType: "discount" | "pause" | "survey_only";
  offerValue: number;
  discountDurationMonths: number;
}

export type EdgeDatabase = Pick<Client, "execute">;

export async function findTenant(db: EdgeDatabase, publicKey: string): Promise<EdgeTenant> {
  const result = await db.execute({
    sql: `SELECT tenant_id, public_key, signing_secret_hash FROM edge_tenants
          WHERE public_key = ? AND status IN ('active', 'trial')
          AND current_month_usage < monthly_intercept_quota`,
    args: [publicKey],
  });
  const row = result.rows[0];
  if (!row) throw new InterceptError("tenant_unavailable", 403);
  if (!isIdentifier(row.tenant_id) || !isIdentifier(row.public_key) ||
      typeof row.signing_secret_hash !== "string" || !/^[a-f0-9]{64}$/.test(row.signing_secret_hash)) {
    throw new Error("Invalid tenant configuration");
  }
  return { tenantId: row.tenant_id, publicKey: row.public_key, signingSecretHash: row.signing_secret_hash };
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
