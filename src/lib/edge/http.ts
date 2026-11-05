import { NextResponse } from "next/server";
import { InterceptError } from "./errors";
import type { EvaluationResult } from "./retention-evaluator";

export async function readJsonObject(request: Request, signal: AbortSignal): Promise<Record<string, unknown>> {
  signal.throwIfAborted();
  const reader = request.body?.getReader();
  if (!reader) throw new InterceptError("invalid_request", 400);
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener("abort", cancel, { once: true });
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) throw new InterceptError("invalid_request", 400);
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new InterceptError("invalid_request", 400);
    return parsed as Record<string, unknown>;
  } catch {
    throw new InterceptError("invalid_request", 400);
  } finally {
    signal.removeEventListener("abort", cancel);
    cancel();
    reader.releaseLock();
  }
}

const publicHeaders = {
  "Cache-Control": "no-store, private",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function preflightResponse(): Response {
  return new Response(null, { status: 204, headers: publicHeaders });
}

export function evaluationResponse<T>(result: EvaluationResult<T>): NextResponse {
  const headers = publicHeaders;
  if (result.status === "ok") return NextResponse.json(result.data, { headers });
  if (result.status === "rejected") {
    return NextResponse.json({ error: result.error.code, failOpen: true }, { status: result.error.status, headers });
  }
  return NextResponse.json({ status: "failed_open", failOpen: true, reason: result.reason, rules: [] }, { headers });
}
