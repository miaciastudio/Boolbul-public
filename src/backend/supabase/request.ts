import "server-only";
import type { CookieMethodsServer, CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { AuthCookieError } from "./redirects";

export function createRequestCookieBridge(request: NextRequest) {
  const pending = new Map<string, { name: string; value: string; options: CookieOptions }>();
  const headers = new Headers();
  let writeError: AuthCookieError | undefined;

  const cookies: CookieMethodsServer = {
    getAll: () => request.cookies.getAll(),
    setAll(updates, responseHeaders) {
      try {
        for (const cookie of updates) {
          // Forward refreshed cookies to the downstream Server Components, too.
          request.cookies.set(cookie.name, cookie.value);
          pending.set(cookie.name, cookie);
        }
        Object.entries(responseHeaders ?? {}).forEach(([name, value]) => headers.set(name, value));
      } catch (cause) {
        writeError = new AuthCookieError(cause);
        throw writeError;
      }
    },
  };

  return {
    cookies,
    applyTo(response: NextResponse): NextResponse {
      // Also surface failures if an auth library catches a cookie adapter error.
      if (writeError) throw writeError;
      pending.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      headers.forEach((value, name) => response.headers.set(name, value));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    },
  };
}
