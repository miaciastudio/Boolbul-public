import { errors } from "jose";
import { createTursoClient } from "@/backend/turso-edge/client";
import { createOfferJwt, isIdentifier, OFFER_TTL_SECONDS } from "@/lib/crypto/jwt";
import { runInBackground } from "@/lib/edge/background";
import { InterceptError } from "@/lib/edge/errors";
import { evaluationResponse, preflightResponse, readJsonObject } from "@/lib/edge/http";
import { verifyInitToken } from "@/lib/edge/init-token";
import { recordLedgerEvent } from "@/lib/edge/ledger";
import { consumeNonce, findTenantWithRules, incrementUsage } from "@/lib/edge/queries";
import { evaluateRetention } from "@/lib/edge/retention-evaluator";
import { getTenantSigningSecret } from "@/lib/edge/tenant-secret";
import { isExitReasonId } from "@/lib/retention/reasons";

export const dynamic = "force-dynamic";

// The customer is explicitly waiting on "Claim", so signing gets a larger budget
// than the 1.5 s fail-open session open. The cancel link stays usable meanwhile.
const CLAIM_BUDGET = { upstreamMs: 4500, deadlineMs: 5000 };

export function OPTIONS() {
  return preflightResponse();
}

export async function POST(request: Request) {
  const result = await evaluateRetention(async (signal) => {
    const body = await readJsonObject(request, signal);
    const { initToken, selection } = body;
    const reasonId = isExitReasonId(body.reasonId) ? body.reasonId : null;
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
      const { tenant, rules } = await findTenantWithRules(db, context.publicKey);
      if (tenant.tenantId !== context.tenantId) throw new InterceptError("offer_unavailable", 403);
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
      // A signed, single-use claim is the only event that counts as a rescue.
      // Same connection as the nonce lock (closed below), so it is awaited; a failed
      // counter must never cost the customer their already-signed offer.
      await incrementUsage(db, tenant.tenantId).catch(() => undefined);
      runInBackground(recordLedgerEvent({
        tenantId: tenant.tenantId, sessionId: context.nonce,
        customerId: context.customerId, subscriptionId: context.subscriptionId,
        gateway: context.gateway, mrrCents: context.mrrCents,
        status: rule.offerType === "discount" ? "rescued_discount" : "rescued_pause",
        offerType: rule.offerType, exitReason: reasonId,
      }));
      return { failOpen: false, offerJwt, offerType: rule.offerType, offerValue: rule.offerValue,
        discountDurationMonths: rule.offerType === "discount" ? rule.discountDurationMonths : undefined };
    } finally {
      db.close();
    }
  }, request.signal, CLAIM_BUDGET);
  return evaluationResponse(result);
}
