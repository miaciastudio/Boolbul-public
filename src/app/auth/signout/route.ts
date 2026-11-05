import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/backend/supabase/client";
import { getAppUrl } from "@/backend/supabase/config";
import { failureCode, loginResponse } from "@/backend/supabase/redirects";
import { createRequestCookieBridge } from "@/backend/supabase/request";

export const dynamic = "force-dynamic";

// No GET handler: link navigation and cross-site images cannot sign a user out.
export async function POST(request: NextRequest) {
  const bridge = createRequestCookieBridge(request);
  let response: NextResponse;
  try {
    if (request.headers.get("origin") !== getAppUrl().origin) {
      response = loginResponse("invalid_request");
    } else {
      const supabase = createSupabaseServerClient(bridge.cookies);
      const { error } = await supabase.auth.signOut({ scope: "local" });
      response = loginResponse(error ? "signout_failed" : undefined);
    }
  } catch (cause) {
    response = loginResponse(failureCode(cause));
  }
  return bridge.applyTo(response);
}
