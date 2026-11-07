import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/backend/supabase/client";
import { getAppUrl } from "@/backend/supabase/config";
import { createRequestCookieBridge } from "@/backend/supabase/request";
import { safeNextPath } from "@/backend/supabase/redirects";
import { ensureWorkspace } from "@/backend/workspace/provision";
import { BetaError, createApplication, notifyAdmin, parseApplication } from "@/backend/beta/applications";
import { runInBackground } from "@/lib/edge/background";

export const dynamic = "force-dynamic";

type Action = "sign_in" | "sign_up" | "apply" | "reset" | "update_password";
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

class AuthFlowError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function friendly(message: string | undefined): string {
  const text = (message ?? "").toLowerCase();
  if (text.includes("invalid login")) return "That email and password don't match. Try again or reset your password.";
  if (text.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the link.";
  if (text.includes("already registered") || text.includes("already been registered")) return "An account with this email already exists. Sign in instead.";
  if (text.includes("password") && text.includes("weak")) return "Choose a stronger password (at least 8 characters, mixing letters and numbers).";
  if (text.includes("rate limit") || text.includes("too many")) return "Too many attempts. Please wait a minute and try again.";
  if (text.includes("same password") || text.includes("different from the old")) return "Your new password must be different from the old one.";
  return "We couldn't complete that request. Please try again.";
}

/**
 * Email/password auth on the server so Supabase sessions live only in
 * httpOnly cookies (readable by middleware, never by page scripts).
 */
export async function POST(request: NextRequest) {
  const bridge = createRequestCookieBridge(request);
  let response: NextResponse;
  try {
    const appUrl = getAppUrl();
    if (request.headers.get("origin") !== appUrl.origin) throw new AuthFlowError(403, "Please use the BoolBul sign-in page.");
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") throw new AuthFlowError(400, "Invalid request.");
    const action = body.action as Action;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const next = safeNextPath(body.next);
    const supabase = createSupabaseServerClient(bridge.cookies);
    const callback = (target: string) => {
      const url = new URL("/auth/callback", appUrl);
      url.searchParams.set("next", target);
      return url.toString();
    };

    if (action === "reset") {
      if (!EMAIL.test(email)) throw new AuthFlowError(400, "Enter a valid email address.");
      // Same answer whether or not the account exists (no account enumeration).
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: callback("/auth/reset-password") });
      response = NextResponse.json({ status: "sent", message: "If an account exists for that email, a reset link is on its way." });
    } else if (action === "update_password") {
      if (password.length < 8 || password.length > 72) throw new AuthFlowError(400, "Use 8–72 characters for your new password.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new AuthFlowError(401, "Your reset link expired. Request a new one from the sign-in page.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new AuthFlowError(400, friendly(error.message));
      response = NextResponse.json({ status: "updated", redirect: "/dashboard" });
    } else if (action === "apply" || action === "sign_up") {
      // Invite-only beta: every new account is an application that starts pending.
      const application = parseApplication(body);
      if (!EMAIL.test(email)) throw new AuthFlowError(400, "Enter a valid work email.");
      if (password.length < 8 || password.length > 72) throw new AuthFlowError(400, "Use 8-72 characters for your password.");
      if (typeof body.confirmPassword === "string" && body.confirmPassword !== password) throw new AuthFlowError(400, "Passwords don't match.");
      const result = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: callback("/dashboard"), data: { full_name: application.fullName } },
      });
      if (result.error || !result.data.user) throw new AuthFlowError(400, friendly(result.error?.message));
      // Supabase returns a user with no identities when the email is already registered.
      if (Array.isArray(result.data.user.identities) && result.data.user.identities.length === 0) {
        throw new AuthFlowError(400, friendly("already registered"));
      }
      const user = result.data.user;
      if (result.data.session) await ensureWorkspace(user.id).catch(() => null);
      const row = await createApplication(user.id, email, application);
      runInBackground(notifyAdmin(row));
      response = result.data.session
        ? NextResponse.json({ status: "applied", redirect: "/dashboard" })
        : NextResponse.json({ status: "confirm_email", message: "Application received! Confirm your email from the link we just sent, then sign in to track your invite." });
    } else if (action === "sign_in") {
      if (!EMAIL.test(email)) throw new AuthFlowError(400, "Enter a valid email address.");
      if (password.length < 1 || password.length > 72) throw new AuthFlowError(400, "Enter your password.");
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw new AuthFlowError(400, friendly(result.error.message));
      if (!result.data.session || !result.data.user) {
        response = NextResponse.json({ status: "confirm_email", message: "Check your inbox to confirm your email, then you're in." });
      } else {
        const workspace = await ensureWorkspace(result.data.user.id).catch(() => null);
        if (!workspace) throw new AuthFlowError(503, "Signed in, but your workspace isn't ready. Please try again in a moment.");
        response = NextResponse.json({ status: "signed_in", redirect: workspace.accessStatus && workspace.accessStatus !== "active" ? "/dashboard" : workspace.onboardingCompleted ? next : "/onboarding" });
      }
    } else {
      throw new AuthFlowError(400, "Unknown action.");
    }
  } catch (error) {
    const known = error instanceof AuthFlowError || error instanceof BetaError;
    response = NextResponse.json({ error: true, message: known ? error.message : "Sign-in is temporarily unavailable. Please try again." },
      { status: known ? (error as AuthFlowError | BetaError).status : 503 });
  }
  return bridge.applyTo(response);
}
