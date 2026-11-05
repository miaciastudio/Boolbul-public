"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";
import { createClient } from "@supabase/supabase-js";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://doesmcrkuorjkmwtrbbv.supabase.co";
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

      if (!key) {
        throw new Error("Supabase Anon Key is missing");
      }

      const supabase = createClient(url, key);

      // In production, force https://boolbul.com/dashboard as the destination
      const isProd = typeof window !== "undefined" && window.location.origin.includes("boolbul.com");
      const redirectUri = isProd
        ? "https://boolbul.com/dashboard"
        : (typeof window !== "undefined" ? `${window.location.origin}/dashboard` : "https://boolbul.com/dashboard");

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

  return (
    <main className="min-h-screen bg-cobalt paper-grain flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-cream border-4-black shadow-brutal p-8 space-y-6">
        <Link href="/" className="font-black text-2xl tracking-tight block">
          🐦‍🔥 BOOLBUL
        </Link>
        <div>
          <h1 className="text-3xl font-black uppercase text-pitch">Your retention cockpit.</h1>
          <p className="font-mono text-sm mt-2 text-zinc-700">
            Sign in or create your workspace securely with Google.
          </p>
        </div>

        {error && (
          <div role="alert" className="border-3 border-pitch bg-rose-100 p-3 text-xs font-mono font-bold text-red-900 shadow-brutal-sm">
            ⚠️ {error}
          </div>
        )}

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
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            <span>{loading ? "Connecting to Google..." : "Continue with Google"}</span>
          </BrutalButton>
        </div>

        <p className="text-xs font-mono text-zinc-600 bg-white border border-pitch p-3">
          ⚡ <strong>New here?</strong> Your first sign-in automatically provisions your workspace and HMAC signing keys.
        </p>

        <div className="pt-2 text-center">
          <Link href="/" className="inline-block text-xs font-mono font-bold text-zinc-700 underline hover:text-pitch">
            ← Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
