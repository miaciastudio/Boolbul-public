"use client";

import Link from "next/link";
import { useState } from "react";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";

export interface BetaAccess {
  status: "pending" | "active" | "rejected";
  application: { fullName: string; websiteUrl: string; status: string; appliedAt: string; confirmedAt: string | null } | null;
}

/** Full-page state for workspaces that are not (yet) approved for the invite-only beta. */
export function BetaGate({ access, email, onApplied }: { access: BetaAccess; email: string | null; onApplied: () => void }) {
  const [fullName, setFullName] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/beta/apply", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName, websiteUrl: website }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Your application could not be sent.");
      onApplied();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your application could not be sent.");
    } finally {
      setBusy(false);
    }
  };

  const app = access.application;
  return (
    <main className="flex min-h-screen items-center justify-center bg-cobalt p-4 paper-grain">
      <section className="w-full max-w-xl space-y-5 border-4-black bg-cream p-6 shadow-brutal sm:p-8" aria-live="polite">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-xl font-black tracking-tight">🐦‍🔥 BOOLBUL</Link>
          <form method="post" action="/auth/signout"><button type="submit" className="font-mono text-xs font-bold underline">Sign out</button></form>
        </div>

        {access.status === "rejected" ? (
          <>
            <span className="inline-block border-3 border-pitch bg-rose-200 px-3 py-1 font-mono text-xs font-black uppercase">Not approved</span>
            <h1 className="text-3xl font-black uppercase leading-tight">This beta round is full for now</h1>
            <p className="font-mono text-sm leading-relaxed text-zinc-800">
              Thanks for applying{app ? `, ${app.fullName.split(" ")[0]}` : ""}. We couldn&apos;t fit your app into this cohort. Reply to our email or write to{" "}
              <a className="font-bold underline" href="mailto:hello@boolbul.com">hello@boolbul.com</a> and we&apos;ll keep you posted on public launch.
            </p>
          </>
        ) : !app ? (
          <>
            <span className="inline-block border-3 border-pitch bg-lime px-3 py-1 font-mono text-xs font-black uppercase">One last step</span>
            <h1 className="text-3xl font-black uppercase leading-tight">Claim your 3 free months</h1>
            <p className="font-mono text-sm text-zinc-800">Tell us which app you&apos;re building and we&apos;ll review it — usually within 6 hours. No credit card.</p>
            {error && <p role="alert" className="border-3 border-pitch bg-rose-100 p-3 font-mono text-xs font-bold text-red-900">⚠️ {error}</p>}
            <form onSubmit={apply} className="space-y-3">
              <label className="block font-mono text-xs font-bold uppercase">Full name
                <input required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name"
                  className="mt-1 w-full border-2 border-pitch bg-white p-2.5 font-mono text-sm normal-case" placeholder="Ada Lovelace" />
              </label>
              <label className="block font-mono text-xs font-bold uppercase">Your SaaS / app website
                <input required value={website} onChange={(e) => setWebsite(e.target.value)} inputMode="url" autoComplete="url"
                  className="mt-1 w-full border-2 border-pitch bg-white p-2.5 font-mono text-sm normal-case" placeholder="your-saas.com" />
              </label>
              <BrutalButton type="submit" className="w-full justify-center" disabled={busy}>{busy ? "Sending…" : "Request early access →"}</BrutalButton>
            </form>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-2 border-3 border-pitch bg-amber-200 px-3 py-1 font-mono text-xs font-black uppercase">
              <span className="h-2 w-2 animate-pulse rounded-full bg-pitch" /> Under review
            </span>
            <h1 className="text-3xl font-black uppercase leading-tight">You&apos;re on the list</h1>
            <p className="border-3 border-pitch bg-white p-4 font-mono text-sm font-bold leading-relaxed text-pitch shadow-brutal-sm">
              Your invite application is under review by the BoolBul team. You will receive an activation email at{" "}
              <span className="underline">{email ?? "your registered address"}</span> once approved (usually &lt; 6 hours).
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
              <dt className="font-black uppercase">App</dt><dd className="break-all">{app.websiteUrl}</dd>
              <dt className="font-black uppercase">Applied</dt><dd>{new Date(app.appliedAt).toLocaleString()}</dd>
            </dl>
            <p className="font-mono text-xs text-zinc-700">
              Meanwhile: try the <Link href="/demo" className="font-bold underline">live demo</Link> or read the{" "}
              <Link href="/docs/quickstart" className="font-bold underline">2-minute quickstart</Link>. Your widget and API keys switch on the moment you&apos;re approved.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
