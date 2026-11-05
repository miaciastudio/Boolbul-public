import { errors } from "jose";
import { createTursoClient } from "@/backend/turso-edge/client";
import { createOfferJwt, isIdentifier, OFFER_TTL_SECONDS } from "@/lib/crypto/jwt";
import { InterceptError } from "@/lib/edge/errors";
import { evaluationResponse, preflightResponse, readJsonObject } from "@/lib/edge/http";
import { verifyInitToken } from "@/lib/edge/init-token";
import { consumeNonce, findActiveRules, findTenant } from "@/lib/edge/queries";
import { evaluateRetention } from "@/lib/edge/retention-evaluator";
import { getTenantSigningSecret } from "@/lib/edge/tenant-secret";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflightResponse();
}

export async function POST(request: Request) {
  const result = await evaluateRetention(async (signal) => {
    const body = await readJsonObject(request, signal);
    const { initToken, selection } = body;
    if (typeof initToken !== "string" || !initToken.length || initToken.length > 12000 || !isIdentifier(selection)) {
      throw new InterceptError("invalid_request", 400);
    }
    const context = await verifyInitToken(initToken).catch((error: unknown) => {
      if (error instanceof errors.JWTExpired) throw new InterceptError("expired", 409);
      if (error instanceof errors.JOSEError) {
        console.warn("[boolbul] Invalid offer initialization token", { code: error.code });
        throw new InterceptError("offer_unavailable", 403);
      }
      throw error;
    });
    if (!context.ruleIds.includes(selection)) throw new InterceptError("offer_unavailable", 403);
    const db = createTursoClient(signal);
    try {
      const tenant = await findTenant(db, context.publicKey);
      if (tenant.tenantId !== context.tenantId) throw new InterceptError("offer_unavailable", 403);
      const rules = await findActiveRules(db, tenant.tenantId);
      const rule = rules.find((candidate) => candidate.ruleId === selection);
      if (!rule || rule.offerType === "survey_only") throw new InterceptError("offer_unavailable", 403);
      const secret = await getTenantSigningSecret(tenant, signal);
      const offerJwt = await createOfferJwt({
        tenantId: tenant.tenantId,
        customerId: context.customerId,
        subscriptionId: context.subscriptionId,
        nonce: context.nonce,
        ...(rule.offerType === "discount"
          ? { offerType: "discount", offerValue: rule.offerValue, discountDurationMonths: rule.discountDurationMonths }
          : { offerType: "pause", offerValue: rule.offerValue }),
      }, secret);
      signal.throwIfAborted();
      await consumeNonce(db, { ...context, exp: Math.floor(Date.now() / 1000) + OFFER_TTL_SECONDS }, "claim");
      return { failOpen: false, offerJwt };
    } finally {
      db.close();
    }
  }, request.signal);
  return evaluationResponse(result);
}
