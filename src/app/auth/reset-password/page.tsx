"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_password", password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update password. Your recovery link may have expired.");

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: unknown) {
      console.error("Password update error:", err);
      setError(err instanceof Error ? err.message : "Failed to update password. Recovery link may have expired.");
    } finally {
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
          <h1 className="text-2xl sm:text-3xl font-black uppercase text-pitch">Set New Password</h1>
          <p className="font-mono text-sm mt-1 text-zinc-700">
            Choose a new secure password for your workspace account.
          </p>
        </div>

        {error && (
          <div role="alert" className="border-3 border-pitch bg-rose-100 p-3 text-xs font-mono font-bold text-red-900 shadow-brutal-sm">
            ⚠️ {error}
          </div>
        )}

        {success ? (
          <div className="border-3 border-pitch bg-lime p-4 text-xs font-mono font-bold text-pitch shadow-brutal-sm text-center space-y-2">
            <p>✓ Password updated successfully!</p>
            <p className="text-zinc-600 font-normal">Redirecting to your dashboard cockpit...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1">
              <label className="font-mono text-xs font-bold uppercase text-pitch block">
                New Password:
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border-2 border-pitch p-2.5 font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lime"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs font-bold uppercase text-pitch block">
                Confirm New Password:
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border-2 border-pitch p-2.5 font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lime"
              />
            </div>

            <div className="pt-2">
              <BrutalButton
                type="submit"
                variant="lime"
                size="md"
                className="w-full justify-center"
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Password & Open Cockpit →"}
              </BrutalButton>
            </div>
          </form>
        )}

        <div className="pt-2 text-center border-t border-zinc-200">
          <Link href="/login" className="inline-block text-xs font-mono font-bold text-zinc-700 underline hover:text-pitch">
            ← Return to Sign In
          </Link>
        </div>
      </section>
    </main>
  );
}

