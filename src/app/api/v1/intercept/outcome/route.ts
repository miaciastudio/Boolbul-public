import { NextResponse } from "next/server";
import { runInBackground } from "@/lib/edge/background";
import { InterceptError } from "@/lib/edge/errors";
import { preflightResponse, readJsonObject } from "@/lib/edge/http";
import { verifyInitTokenForOutcome } from "@/lib/edge/init-token";
import { recordLedgerEvent } from "@/lib/edge/ledger";
import { isExitReasonId } from "@/lib/retention/reasons";

export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store, private",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return preflightResponse();
}

/**
 * Analytics beacon for a cancellation session. Only "shown" and "cancelled" are
 * accepted from the browser; rescues are recorded server-side by /claim, so a
 * customer cannot inflate the host's saved-revenue numbers.
 */
export async function POST(request: Request) {
  const signal = AbortSignal.timeout(3000);
  try {
    const body = await readJsonObject(request, signal);
    const { initToken, event } = body;
    if (typeof initToken !== "string" || !initToken.length || initToken.length > 12000 ||
        (event !== "shown" && event !== "cancelled")) {
      throw new InterceptError("invalid_request", 400);
    }
    const reasonId = body.reasonId === undefined || body.reasonId === null ? null : body.reasonId;
    if (reasonId !== null && !isExitReasonId(reasonId)) throw new InterceptError("invalid_request", 400);
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 1000) || null : null;
    const context = await verifyInitTokenForOutcome(initToken).catch(() => {
      throw new InterceptError("offer_unavailable", 403);
    });
    runInBackground(recordLedgerEvent({
      tenantId: context.tenantId, sessionId: context.nonce,
      customerId: context.customerId, subscriptionId: context.subscriptionId,
      gateway: context.gateway, mrrCents: context.mrrCents,
      status: event === "shown" ? "intercepted" : "cancelled",
      exitReason: reasonId, exitFeedback: comment,
    }));
    return NextResponse.json({ received: true }, { status: 202, headers });
  } catch (error) {
    const known = error instanceof InterceptError;
    return NextResponse.json({ error: known ? error.code : "invalid_request" }, { status: known ? error.status : 400, headers });
  }
}
