import { createTursoClient } from "@/backend/turso-edge/client";
import { isIdentifier } from "@/lib/crypto/jwt";
import { InterceptError } from "@/lib/edge/errors";
import { evaluationResponse, preflightResponse, readJsonObject } from "@/lib/edge/http";
import { createInitToken } from "@/lib/edge/init-token";
import { findActiveRules, findTenant } from "@/lib/edge/queries";
import { evaluateRetention } from "@/lib/edge/retention-evaluator";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflightResponse();
}

export async function POST(request: Request) {
  const result = await evaluateRetention(async (signal) => {
    const body = await readJsonObject(request, signal);
    const { publicKey, customerId, subscriptionId } = body;
    if (!isIdentifier(publicKey) || !isIdentifier(customerId) || !isIdentifier(subscriptionId)) {
      throw new InterceptError("invalid_request", 400);
    }
    const db = createTursoClient(signal);
    try {
      const tenant = await findTenant(db, publicKey);
      const rules = await findActiveRules(db, tenant.tenantId);
      if (rules.length === 0) return { failOpen: true, reason: "no_eligible_rules", rules: [] };
      const nonce = crypto.randomUUID();
      const initToken = await createInitToken({
        tenantId: tenant.tenantId, publicKey, customerId, subscriptionId, nonce,
        ruleIds: rules.filter((rule) => rule.offerType !== "survey_only").map((rule) => rule.ruleId),
      });
      return {
        failOpen: false,
        rules,
        nonce,
        initToken,
        compliance: { escapeHatchLabel: "No thanks, proceed to complete cancellation" },
      };
    } finally {
      db.close();
    }
  }, request.signal);
  return evaluationResponse(result);
}
