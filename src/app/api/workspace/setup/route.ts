import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/backend/supabase/client";
import { getAppUrl } from "@/backend/supabase/config";
import { createRequestCookieBridge } from "@/backend/supabase/request";
import { requireDashboardContext } from "@/backend/supabase/session";
import { getWorkspaceSetup, saveWorkspaceSetup, WorkspaceSetupError } from "@/backend/workspace/setup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readChoices(request: NextRequest): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new WorkspaceSetupError("invalid_content_type", 415, "Send setup choices as JSON.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new WorkspaceSetupError("invalid_json", 400, "Setup choices are required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) {
        await reader.cancel();
        throw new WorkspaceSetupError("body_too_large", 413, "Setup choices are too large.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof WorkspaceSetupError) throw error;
    throw new WorkspaceSetupError("invalid_json", 400, "Setup choices must be valid JSON.");
  } finally {
    reader.releaseLock();
  }
}

async function handle(request: NextRequest, write: boolean): Promise<NextResponse> {
  const bridge = createRequestCookieBridge(request);
  let response: NextResponse;
  try {
    if (write && request.headers.get("origin") !== getAppUrl().origin) {
      throw new WorkspaceSetupError("invalid_origin", 403, "Save setup from the canonical application origin.");
    }
    const supabase = createSupabaseServerClient(bridge.cookies);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new WorkspaceSetupError("unauthorized", 401, "Please sign in again before continuing setup.");
    if (write) {
      response = NextResponse.json(await saveWorkspaceSetup(supabase, user.id, await readChoices(request)));
    } else {
      const context = await requireDashboardContext();
      if (context.user.id !== user.id) throw new WorkspaceSetupError("unauthorized", 401, "Please sign in again.");
      response = NextResponse.json(await getWorkspaceSetup(context, supabase));
    }
  } catch (error) {
    const known = error instanceof WorkspaceSetupError;
    response = NextResponse.json({
      error: known ? error.code : "setup_unavailable",
      message: known ? error.message : "Workspace setup is unavailable. Please retry or sign in again.",
    }, { status: known ? error.status : 503 });
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  try {
    return bridge.applyTo(response);
  } catch {
    return NextResponse.json({ error: "session_unavailable", message: "Your session could not be refreshed. Please sign in again." }, {
      status: 503, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
    });
  }
}

export function GET(request: NextRequest) { return handle(request, false); }
export function POST(request: NextRequest) { return handle(request, true); }
