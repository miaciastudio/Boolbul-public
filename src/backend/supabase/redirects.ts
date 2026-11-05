import "server-only";
import { NextResponse } from "next/server";
import { AuthConfigurationError, getAppUrl } from "./config";

export const LOGIN_ERRORS = {
  configuration: "Sign-in is not configured yet. Please try again later.",
  unavailable: "Sign-in is temporarily unavailable. Please try again.",
  session_expired: "Please sign in to continue. Your session may have expired.",
  oauth_failed: "Google sign-in could not be completed. Please try again.",
  workspace_unavailable: "Your workspace is not available yet. Please try signing in again or contact support.",
  invalid_request: "This request could not be verified. Please try again from the sign-in page.",
  signout_failed: "Sign-out could not be completed. Please try again.",
} as const;

export type LoginError = keyof typeof LOGIN_ERRORS;

export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) return "/dashboard";
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return "/dashboard";
  }
  if (/[\\\u0000-\u0020\u007f]/.test(value) || /[\\\u0000-\u001f\u007f]/.test(decoded)) {
    return "/dashboard";
  }
  // Validate raw paths before URL parsing can normalize traversal segments.
  const path = value.split(/[?#]/, 1)[0];
  if (!/^\/(dashboard|onboarding)(?:\/[A-Za-z0-9_-]+)*\/?$/.test(path)) return "/dashboard";
  return value;
}

export function loginPath(error?: LoginError, next?: unknown): string {
  const params = new URLSearchParams();
  if (error) params.set("error", error);
  if (next !== undefined) params.set("next", safeNextPath(next));
  return `/login${params.size ? `?${params}` : ""}`;
}

export function loginResponse(error?: LoginError, next?: unknown): NextResponse {
  const path = loginPath(error, next);
  let location = path;
  try {
    location = new URL(path, getAppUrl()).toString();
  } catch (cause) {
    if (!(cause instanceof AuthConfigurationError)) throw cause;
    // A relative Location is safe even without configuration; never trust Host.
  }
  return new NextResponse(null, {
    status: 303,
    headers: { Location: location, "Cache-Control": "private, no-store" },
  });
}

export class AuthCookieError extends Error {
  constructor(cause: unknown) {
    super("Unable to persist auth cookies", { cause });
    this.name = "AuthCookieError";
  }
}

export function failureCode(cause: unknown): LoginError {
  // Cookie persistence defects must surface, not masquerade as a logged-out user.
  if (cause instanceof AuthCookieError) throw cause;
  return cause instanceof AuthConfigurationError ? "configuration" : "unavailable";
}

export function sessionErrorCode(error: { status?: number; name?: string } | null): LoginError {
  if (!error || error.name === "AuthSessionMissingError" || (error.status && [400, 401, 403].includes(error.status))) {
    return "session_expired";
  }
  return "unavailable";
}
