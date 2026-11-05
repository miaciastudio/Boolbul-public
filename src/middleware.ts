import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/backend/supabase/client";
import { createRequestCookieBridge } from "@/backend/supabase/request";
import { failureCode, loginResponse, sessionErrorCode } from "@/backend/supabase/redirects";

export async function middleware(request: NextRequest) {
  const bridge = createRequestCookieBridge(request);
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  let response: NextResponse;
  try {
    const supabase = createSupabaseServerClient(bridge.cookies);
    // Verify with Supabase Auth, never authorize a cached getSession() payload.
    const { data, error } = await supabase.auth.getUser();
    response = error || !data.user
      ? loginResponse(sessionErrorCode(error), next)
      : NextResponse.next({ request: { headers: request.headers } });
  } catch (cause) {
    response = loginResponse(failureCode(cause), next);
  }
  return bridge.applyTo(response);
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};
