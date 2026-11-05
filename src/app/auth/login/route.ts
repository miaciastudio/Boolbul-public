import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/backend/supabase/client";
import { getAuthConfig } from "@/backend/supabase/config";
import { failureCode, loginResponse, safeNextPath } from "@/backend/supabase/redirects";
import { createRequestCookieBridge } from "@/backend/supabase/request";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const bridge = createRequestCookieBridge(request);
  let next = "/dashboard";
  let response: NextResponse;
  try {
    const config = getAuthConfig();
    // Browser form POSTs include Origin. Fail closed when it is absent or foreign.
    if (request.headers.get("origin") !== config.appUrl.origin) {
      response = loginResponse("invalid_request");
    } else {
      next = safeNextPath((await request.formData()).get("next"));
      const callback = new URL("/auth/callback", config.appUrl);
      callback.searchParams.set("next", next);
      const supabase = createSupabaseServerClient(bridge.cookies);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
      });
      const destination = data.url ? new URL(data.url) : null;
      response = error || !destination || destination.origin !== config.supabaseUrl
        ? loginResponse("oauth_failed", next)
        : NextResponse.redirect(destination, 303);
    }
  } catch (cause) {
    response = loginResponse(failureCode(cause), next);
  }
  return bridge.applyTo(response);
}
