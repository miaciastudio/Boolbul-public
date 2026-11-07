import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/backend/supabase/client";
import { getAppUrl } from "@/backend/supabase/config";
import type { MembershipRole } from "@/backend/supabase/database";
import { createRequestCookieBridge } from "@/backend/supabase/request";

export class WorkspaceApiError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string) {
    super(message);
    this.name = "WorkspaceApiError";
  }
}

export interface WorkspaceCaller {
  user: User;
  tenantId: string;
  role: MembershipRole;
  supabase: ReturnType<typeof createSupabaseServerClient>;
}

export function isManager(role: MembershipRole): boolean {
  return role === "owner" || role === "admin";
}

export async function readJsonBody(request: NextRequest, maxBytes = 8192): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new WorkspaceApiError("invalid_content_type", 415, "Send the request body as JSON.");
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new WorkspaceApiError("body_too_large", 413, "The request body is too large.");
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new WorkspaceApiError("invalid_json", 400, "The request body must be valid JSON.");
  }
}

/**
 * Wraps a dashboard API handler: verifies the Supabase session server-side,
 * resolves the caller's workspace from membership (never from browser input),
 * enforces same-origin writes and returns uniform, non-cacheable JSON errors.
 */
export async function handleWorkspaceRequest(
  request: NextRequest,
  options: { write: boolean; managerOnly: boolean },
  handler: (caller: WorkspaceCaller) => Promise<unknown>,
): Promise<NextResponse> {
  const bridge = createRequestCookieBridge(request);
  let response: NextResponse;
  try {
    if (options.write && request.headers.get("origin") !== getAppUrl().origin) {
      throw new WorkspaceApiError("invalid_origin", 403, "Send changes from the BoolBul dashboard.");
    }
    const supabase = createSupabaseServerClient(bridge.cookies);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new WorkspaceApiError("unauthorized", 401, "Please sign in again.");
    const { data: membership, error: membershipError } = await supabase.from("tenant_memberships")
      .select("tenant_id, role").eq("user_id", user.id)
      .order("created_at", { ascending: true }).order("tenant_id", { ascending: true })
      .limit(1).maybeSingle();
    if (membershipError) throw new WorkspaceApiError("workspace_unavailable", 503, "Your workspace could not be loaded. Please retry.");
    if (!membership) throw new WorkspaceApiError("workspace_missing", 404, "No workspace is linked to this account yet. Sign in again to create one.");
    const role = membership.role as MembershipRole;
    if (options.managerOnly && !isManager(role)) {
      throw new WorkspaceApiError("forbidden", 403, "Only a workspace owner or admin can do this.");
    }
    response = NextResponse.json(await handler({ user, tenantId: membership.tenant_id, role, supabase }));
  } catch (error) {
    const known = error instanceof WorkspaceApiError;
    if (!known) console.error("[boolbul] Workspace API failure", { errorType: error instanceof Error ? error.name : "UnknownError" });
    response = NextResponse.json({
      error: known ? error.code : "workspace_unavailable",
      message: known ? error.message : "Something went wrong on our side. Nothing was changed; please retry.",
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
