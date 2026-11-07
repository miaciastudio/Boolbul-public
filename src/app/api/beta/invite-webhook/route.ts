import { NextResponse } from "next/server";
import { BetaError, processApplication } from "@/backend/beta/applications";

export const dynamic = "force-dynamic";

function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/**
 * Called by the Supabase database trigger (pg_net) when an application's status
 * changes. The body only names the row; everything is re-read server-side.
 */
export async function POST(request: Request) {
  const expected = process.env.BOOLBUL_INVITE_WEBHOOK_SECRET;
  const provided = request.headers.get("x-boolbul-webhook-secret") ?? "";
  if (!expected || expected.length < 32 || !sameSecret(provided, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as { applicationId?: unknown } | null;
  const id = body?.applicationId;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  try {
    return NextResponse.json(await processApplication(id));
  } catch (error) {
    const status = error instanceof BetaError ? error.status : 503;
    return NextResponse.json({ error: error instanceof BetaError ? error.code : "processing_failed" }, { status });
  }
}
