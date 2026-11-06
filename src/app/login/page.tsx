"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";
import { createClient } from "@supabase/supabase-js";

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState("/dashboard");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      if (next && next.startsWith("/")) {
        setNextUrl(next);
      }
    }
  }, []);

  const getSupabase = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://doesmcrkuorjkmwtrbbv.supabase.co";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (!key) throw new Error("Supabase Anon Key is missing");
    return createClient(url, key);
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabase();

      const origin = typeof window !== "undefined" ? window.location.origin : "https://boolbul.com";
      const redirectUri = `${origin}${nextUrl}`;

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
        },
      });

      if (authError) throw authError;
    } catch (err: unknown) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "Failed to initiate Google sign in");
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const emailClean = email.trim();
    if (!emailClean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      setError("Please provide a valid email address");
      return;
    }

    if (authMode !== "forgot" && (!password || password.length < 6)) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabase();

      if (authMode === "signin") {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: emailClean,
          password,
        });

        if (signInError) throw signInError;
        if (data.session) {
          router.push(nextUrl);
        }
      } else if (authMode === "signup") {
        const origin = typeof window !== "undefined" ? window.location.origin : "https://boolbul.com";
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: emailClean,
          password,
          options: {
            emailRedirectTo: `${origin}${nextUrl}`,
          },
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          router.push(nextUrl);
        } else {
          setSuccessMessage("Account created! Check your email to confirm your account, then sign in.");
        }
      } else if (authMode === "forgot") {
        const origin = typeof window !== "undefined" ? window.location.origin : "https://boolbul.com";
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailClean, {
          redirectTo: `${origin}/auth/reset-password`,
        });

        if (resetError) throw resetError;
        setSuccessMessage("Password reset email sent! Check your inbox for the link.");
      }
    } catch (err: unknown) {
      console.error("Auth error:", err);
      setError(err instanceof Error ? err.message : "Authentication request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-cobalt paper-grain flex items-center justify-center p-4 sm:p-6">
      <section className="w-full max-w-md bg-cream border-4-black shadow-brutal p-6 sm:p-8 space-y-6">
        <Link href="/" className="font-black text-2xl tracking-tight block">
          🐦‍🔥 BOOLBUL
        </Link>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase text-pitch">
            {authMode === "forgot" ? "Reset Password" : "Your Retention Cockpit"}
          </h1>
          <p className="font-mono text-xs sm:text-sm mt-1 text-zinc-700">
            {authMode === "forgot"
              ? "Enter your email to receive a secure recovery link."
              : "Sign in or create your workspace to access your intercept engine."}
          </p>
        </div>

        {error && (
          <div role="alert" className="border-3 border-pitch bg-rose-100 p-3 text-xs font-mono font-bold text-red-900 shadow-brutal-sm">
            ⚠️ {error}
          </div>
        )}

        {successMessage && (
          <div role="status" className="border-3 border-pitch bg-lime p-3 text-xs font-mono font-bold text-pitch shadow-brutal-sm">
            ✓ {successMessage}
          </div>
        )}

        {authMode !== "forgot" ? (
          <>
            {/* Google OAuth Option */}
            <div className="space-y-4">
              <BrutalButton
                type="button"
                variant="lime"
                size="lg"
                className="w-full justify-center flex items-center gap-3"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                {loading ? (
                  <span className="animate-spin inline-block mr-2">⏳</span>
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </BrutalButton>
            </div>

            {/* Brutalist Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t-2 border-pitch w-full" />
              <span className="bg-cream px-3 font-mono text-[10px] uppercase font-bold text-zinc-600 relative shrink-0">
                OR WITH EMAIL & PASSWORD
              </span>
            </div>

            {/* Email + Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-pitch block">
                  Work Email:
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@your-saas.com"
                  className="w-full border-2 border-pitch p-2.5 font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lime"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs font-bold uppercase text-pitch">
                    Password:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("forgot");
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="font-mono text-[11px] underline text-zinc-600 hover:text-pitch"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border-2 border-pitch p-2.5 font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lime"
                />
              </div>

              <div className="pt-2">
                <BrutalButton
                  type="submit"
                  variant="white"
                  size="md"
                  className="w-full justify-center"
                  disabled={loading}
                >
                  {loading
                    ? "Authenticating..."
                    : authMode === "signin"
                    ? "Sign In With Password →"
                    : "Create Workspace Account →"}
                </BrutalButton>
              </div>
            </form>

            {/* Mode Switcher */}
            <div className="pt-1 text-center font-mono text-xs text-zinc-700">
              {authMode === "signin" ? (
                <span>
                  New to BoolBul?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signup");
                      setError(null);
                    }}
                    className="font-bold underline text-pitch hover:text-crimson"
                  >
                    Create an account
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signin");
                      setError(null);
                    }}
                    className="font-bold underline text-pitch hover:text-crimson"
                  >
                    Sign in
                  </button>
                </span>
              )}
            </div>
          </>
        ) : (
          /* Forgot Password View */
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="font-mono text-xs font-bold uppercase text-pitch block">
                Account Email:
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="founder@your-saas.com"
                className="w-full border-2 border-pitch p-2.5 font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lime"
              />
            </div>

            <BrutalButton
              type="submit"
              variant="lime"
              size="md"
              className="w-full justify-center"
              disabled={loading}
            >
              {loading ? "Sending link..." : "Send Recovery Link →"}
            </BrutalButton>

            <button
              type="button"
              onClick={() => {
                setAuthMode("signin");
                setError(null);
                setSuccessMessage(null);
              }}
              className="w-full text-center font-mono text-xs font-bold underline text-zinc-700 hover:text-pitch block"
            >
              ← Back to Sign In
            </button>
          </form>
        )}

        <div className="pt-2 text-center border-t border-zinc-200">
          <Link href="/" className="inline-block text-xs font-mono font-bold text-zinc-700 underline hover:text-pitch">
            ← Back to BoolBul Home
          </Link>
        </div>
      </section>
    </main>
  );
}
