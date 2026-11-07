"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";

const LOGIN_ERRORS: Record<string, string> = {
  configuration: "Sign-in is not configured yet. Please try again later.",
  unavailable: "Sign-in is temporarily unavailable. Please try again.",
  session_expired: "Please sign in to continue. Your session may have expired.",
  oauth_failed: "Google sign-in could not be completed. Please try again.",
  workspace_unavailable: "Your workspace is not available yet. Please try signing in again.",
  invalid_request: "This request could not be verified. Please try again from this page.",
  signout_failed: "Sign-out could not be completed. Please try again.",
};

type Mode = "signin" | "apply" | "forgot";
const input = "w-full border-2 border-pitch bg-white p-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-lime";
const label = "block font-mono text-xs font-bold uppercase text-pitch";

function PasswordField({ id, value, onChange, show, onToggle, autoComplete, placeholder }: {
  id: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; autoComplete: string; placeholder: string;
}) {
  return (
    <div className="relative">
      <input id={id} type={show ? "text" : "password"} required autoComplete={autoComplete} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} className={`${input} pr-12`} />
      <button type="button" onClick={onToggle} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-700 hover:text-pitch">
        {show ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10.4 10.4 0 0112 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.6 3.7M6.6 6.6C4.6 7.9 3.2 9.8 2 12c1 2.5 5 7 10 7 1.6 0 3.1-.4 4.4-1.1" /></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
        )}
      </button>
    </div>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [website, setWebsite] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState("/dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) setNextUrl(next);
    const code = params.get("error");
    if (code && LOGIN_ERRORS[code]) setError(LOGIN_ERRORS[code]);
    if (params.get("mode") === "signup" || params.get("mode") === "apply") setMode("apply");
  }, []);

  const switchMode = (next: Mode) => { setMode(next); setError(null); setSuccess(null); };

  // Google runs on the server (POST /auth/login) so the session lands in httpOnly cookies.
  const google = () => {
    setLoading(true);
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/auth/login";
    const field = document.createElement("input");
    field.type = "hidden";
    field.name = "next";
    field.value = nextUrl;
    form.append(field);
    document.body.append(form);
    form.submit();
  };

  const passwordProblem = mode === "apply" && password.length > 0 && password.length < 8 ? "At least 8 characters." : null;
  const confirmProblem = mode === "apply" && confirm.length > 0 && confirm !== password ? "Passwords don't match." : null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const emailClean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) { setError("Enter a valid email address."); return; }
    if (mode === "apply") {
      if (fullName.trim().length < 2) { setError("Enter your full name."); return; }
      if (password.length < 8) { setError("Use at least 8 characters for your password."); return; }
      if (password !== confirm) { setError("Passwords don't match."); return; }
      if (!website.trim()) { setError("Add your SaaS or app website."); return; }
    }
    setLoading(true);
    try {
      const action = mode === "signin" ? "sign_in" : mode === "apply" ? "apply" : "reset";
      const res = await fetch("/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email: emailClean, password, confirmPassword: confirm, fullName, websiteUrl: website, next: nextUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Request failed");
      if (data.redirect) { window.location.assign(data.redirect); return; }
      setSuccess(data.message || "Done.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cobalt p-4 paper-grain sm:p-6">
      <section className="w-full max-w-md space-y-5 border-4-black bg-cream p-6 shadow-brutal sm:p-8">
        <Link href="/" className="block text-2xl font-black tracking-tight">🐦‍🔥 BOOLBUL</Link>

        {mode === "apply" && (
          <p className="border-2 border-pitch bg-lime px-3 py-2 text-center font-mono text-[11px] font-black uppercase leading-relaxed">
            Invite-only beta • No credit card • Zero dark patterns
          </p>
        )}

        <div>
          <h1 className="text-2xl font-black uppercase text-pitch sm:text-3xl">
            {mode === "apply" ? "Claim 3 months free" : mode === "forgot" ? "Reset password" : "Welcome back"}
          </h1>
          <p className="mt-1 font-mono text-xs text-zinc-700 sm:text-sm">
            {mode === "apply" ? "The first 100 SaaS founders get BoolBul Pro free for 3 months. Apply in 30 seconds — we review every app, usually within 6 hours."
              : mode === "forgot" ? "Enter your email and we'll send a secure recovery link."
                : "Sign in to your BoolBul workspace."}
          </p>
        </div>

        {error && <div role="alert" className="border-3 border-pitch bg-rose-100 p-3 font-mono text-xs font-bold text-red-900 shadow-brutal-sm">⚠️ {error}</div>}
        {success && <div role="status" className="border-3 border-pitch bg-lime p-3 font-mono text-xs font-bold text-pitch shadow-brutal-sm">✓ {success}</div>}

        {mode !== "forgot" && !success && (
          <>
            <BrutalButton type="button" variant="lime" size="lg" className="flex w-full items-center justify-center gap-3" onClick={google} disabled={loading}>
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09zM12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23zM5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85zM12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" /></svg>
              <span>{mode === "apply" ? "Apply with Google" : "Continue with Google"}</span>
            </BrutalButton>
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t-2 border-pitch" />
              <span className="absolute bg-cream px-3 font-mono text-[10px] font-bold uppercase text-zinc-600">or with email</span>
            </div>
          </>
        )}

        {!success && (
          <form onSubmit={submit} className="space-y-3" noValidate>
            {mode === "apply" && (
              <div className="space-y-1">
                <label htmlFor="fullName" className={label}>Full name</label>
                <input id="fullName" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ada Lovelace" className={input} />
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="email" className={label}>Work email</label>
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="founder@your-saas.com" className={input} />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className={label}>Password</label>
                  {mode === "signin" && <button type="button" onClick={() => switchMode("forgot")} className="font-mono text-[11px] text-zinc-600 underline hover:text-pitch">Forgot password?</button>}
                </div>
                <PasswordField id="password" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword((v) => !v)}
                  autoComplete={mode === "apply" ? "new-password" : "current-password"} placeholder={mode === "apply" ? "At least 8 characters" : "••••••••"} />
                {passwordProblem && <p className="font-mono text-[11px] font-bold text-red-800">{passwordProblem}</p>}
              </div>
            )}
            {mode === "apply" && (
              <>
                <div className="space-y-1">
                  <label htmlFor="confirm" className={label}>Confirm password</label>
                  <PasswordField id="confirm" value={confirm} onChange={setConfirm} show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} autoComplete="new-password" placeholder="Type it again" />
                  {confirmProblem && <p className="font-mono text-[11px] font-bold text-red-800">{confirmProblem}</p>}
                </div>
                <div className="space-y-1">
                  <label htmlFor="website" className={label}>Your SaaS / app website</label>
                  <input id="website" required inputMode="url" autoComplete="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="your-saas.com" className={input} />
                </div>
              </>
            )}
            <BrutalButton type="submit" variant={mode === "apply" ? "lime" : "white"} size="md" className="w-full justify-center" disabled={loading}>
              {loading ? "Please wait…" : mode === "apply" ? "Request early access →" : mode === "forgot" ? "Send recovery link →" : "Sign in →"}
            </BrutalButton>
          </form>
        )}

        <div className="text-center font-mono text-xs text-zinc-700">
          {mode === "signin" && <>New to BoolBul? <button type="button" onClick={() => switchMode("apply")} className="font-bold text-pitch underline">Claim 3 months free</button></>}
          {mode === "apply" && <>Already applied? <button type="button" onClick={() => switchMode("signin")} className="font-bold text-pitch underline">Sign in to check your status</button></>}
          {mode === "forgot" && <button type="button" onClick={() => switchMode("signin")} className="font-bold text-pitch underline">← Back to sign in</button>}
        </div>

        <div className="border-t border-zinc-300 pt-3 text-center">
          <Link href="/" className="font-mono text-xs font-bold text-zinc-700 underline hover:text-pitch">← Back to BoolBul home</Link>
        </div>
      </section>
    </main>
  );
}
