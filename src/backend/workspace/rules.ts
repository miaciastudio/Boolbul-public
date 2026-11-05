import "server-only";
import type { InStatement } from "@libsql/client/web";
import { DISCOUNT_CHOICES, PAUSE_CHOICES, type SetupChoices } from "./contract";

export const WORKSPACE_TIMEOUT_MS = 15_000;

export function workspaceRuleStatements(
  tenantId: string,
  choices: SetupChoices = { discountTier: "50_2mo", pauseTier: "30_day" },
  replace = false,
): InStatement[] {
  const discount = DISCOUNT_CHOICES[choices.discountTier];
  const pause = PAUSE_CHOICES[choices.pauseTier];
  // Login inserts defaults only. Explicit setup changes offer terms/conditions,
  // but preserves existing priority, activation status, and all unrelated rules.
  const conflict = replace ? `DO UPDATE SET
    trigger_condition = excluded.trigger_condition, offer_type = excluded.offer_type,
    discount_percentage = excluded.discount_percentage,
    discount_duration_months = excluded.discount_duration_months,
    pause_duration_days = excluded.pause_duration_days
    WHERE edge_retention_rules.tenant_id = excluded.tenant_id` : "DO NOTHING";
  const sql = `INSERT INTO edge_retention_rules
    (rule_id, tenant_id, priority, trigger_condition, offer_type,
     discount_percentage, discount_duration_months, pause_duration_days)
    VALUES (?, ?, ?, '{}', ?, ?, ?, ?)
    ON CONFLICT(rule_id) ${conflict}`;
  return [
    { sql, args: [`${tenantId}:discount`, tenantId, 1, "discount", discount.basisPoints, discount.months, 0] },
    { sql, args: [`${tenantId}:pause`, tenantId, 2, "pause", 0, 0, pause.days] },
  ];
}
