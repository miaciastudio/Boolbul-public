import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/backend/supabase/client";
import { getAppUrl } from "@/backend/supabase/config";
import { failureCode, loginResponse, safeNextPath, sessionErrorCode } from "@/backend/supabase/redirects";
import { createRequestCookieBridge } from "@/backend/supabase/request";
import { ensureWorkspace } from "@/backend/workspace/provision";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const bridge = createRequestCookieBridge(request);
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  let response: NextResponse;
  try {
    // The request URL / forwarded host must never determine the destination.
    const appUrl = getAppUrl();
    const params = request.nextUrl.searchParams;
    const code = params.get("code");
    if (params.has("error") || params.has("error_description") || !code?.trim() || params.getAll("code").length !== 1) {
      response = loginResponse("oauth_failed", next);
    } else {
      const supabase = createSupabaseServerClient(bridge.cookies);
      const exchange = await supabase.auth.exchangeCodeForSession(code);
      if (exchange.error) {
        response = loginResponse("oauth_failed", next);
      } else {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          response = loginResponse(sessionErrorCode(error), next);
        } else {
          try {
            const workspace = await ensureWorkspace(data.user.id);
            response = NextResponse.redirect(new URL(workspace.onboardingCompleted ? next : "/onboarding", appUrl), 303);
          } catch {
            response = loginResponse("workspace_unavailable", next);
          }
        }
      }
    }
  } catch (cause) {
    response = loginResponse(failureCode(cause), next);
  }
  // Apply to the final response, including every failure redirect and deletion.
  return bridge.applyTo(response);
}
