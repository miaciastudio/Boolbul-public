import { createTursoClient } from "@/backend/turso-edge/client";
import { isIdentifier } from "@/lib/crypto/jwt";
import { InterceptError } from "@/lib/edge/errors";
import { evaluationResponse, preflightResponse, readJsonObject } from "@/lib/edge/http";
import { createInitToken, isMrrCents } from "@/lib/edge/init-token";
import { findTenantWithRulesCached } from "@/lib/edge/queries";
import { evaluateRetention } from "@/lib/edge/retention-evaluator";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflightResponse();
}

export async function POST(request: Request) {
  const result = await evaluateRetention(async (signal) => {
    const body = await readJsonObject(request, signal);
    const { publicKey, customerId, subscriptionId } = body;
    const mrrCents = body.mrrCents ?? 0;
    if (!isIdentifier(publicKey) || !isIdentifier(customerId) || !isIdentifier(subscriptionId) || !isMrrCents(mrrCents)) {
      throw new InterceptError("invalid_request", 400);
    }
    const db = createTursoClient(signal);
    try {
      const { tenant, rules } = await findTenantWithRulesCached(db, publicKey);
      const nonce = crypto.randomUUID();
      // A session token is issued even without offers so the exit survey and the
      // cancellation outcome still reach the ledger.
      const initToken = await createInitToken({
        tenantId: tenant.tenantId, publicKey, customerId, subscriptionId, nonce,
        gateway: tenant.gateway, mrrCents,
        ruleIds: rules.filter((rule) => rule.offerType !== "survey_only").map((rule) => rule.ruleId),
      });
      return {
        failOpen: false,
        sessionId: nonce,
        rules,
        nonce,
        initToken,
        gateway: tenant.gateway,
        compliance: { escapeHatchLabel: "No thanks, proceed to complete cancellation" },
      };
    } finally {
      db.close();
    }
  }, request.signal);
  return evaluationResponse(result);
}
