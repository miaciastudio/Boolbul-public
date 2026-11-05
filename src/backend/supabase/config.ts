import "server-only";
import type { CookieOptions } from "@supabase/ssr";

export class AuthConfigurationError extends Error {
  constructor(variable: string) {
    super(`Missing or invalid auth configuration: ${variable}`);
    this.name = "AuthConfigurationError";
  }
}

function required(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new AuthConfigurationError(name);
  return value.trim();
}

function configuredUrl(value: string | undefined, name: string): URL {
  const raw = required(value, name);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AuthConfigurationError(name);
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    /[\\\s]/.test(raw) || url.username || url.password ||
    url.pathname !== "/" || url.search || url.hash ||
    (url.protocol !== "https:" && !(local && url.protocol === "http:"))
  ) {
    throw new AuthConfigurationError(name);
  }
  return url;
}

export function getAppUrl(): URL {
  return configuredUrl(process.env.NEXT_PUBLIC_APP_URL, "NEXT_PUBLIC_APP_URL");
}

export function getSupabaseUrl(): string {
  return configuredUrl(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL").origin;
}

export function getAuthConfig() {
  return {
    appUrl: getAppUrl(),
    supabaseUrl: getSupabaseUrl(),
    anonKey: required(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getServiceRoleKey(): string {
  return required(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
}

export function authCookieOptions(appUrl = getAppUrl()): CookieOptions {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    // Only loopback deployments may use HTTP, including local `next start`.
    secure: appUrl.protocol === "https:",
  };
}
