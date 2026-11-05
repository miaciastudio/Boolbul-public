import "server-only";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { authCookieOptions, getAuthConfig } from "./config";
import type { AuthDatabase } from "./database";

// Per-request clients prevent sharing session state across users.
export function createSupabaseServerClient(cookies: CookieMethodsServer) {
  const config = getAuthConfig();
  return createServerClient<AuthDatabase>(config.supabaseUrl, config.anonKey, {
    auth: { flowType: "pkce", autoRefreshToken: false, detectSessionInUrl: false, persistSession: true },
    cookieOptions: authCookieOptions(config.appUrl),
    cookies,
  });
}
