"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";

type Overview = {
  workspace: { id: string; name: string; publicKey: string; plan: string; billingStatus: string; billingMode: string | null;
    gateway: string; primaryDomain: string | null; onboardingCompleted: boolean; role: string; canManage: boolean; email: string | null };
  usage: { month: string; used: number; quota: number };
  last30Days: { sessions: number; saved: number; cancelled: number; saveRate: number; savedMrrCents: number;
    discounts: number; pauses: number; topReasons: { id: string; label: string; count: number }[] };
  ledger: { id: string; customerId: string; subscriptionId: string; mrrCents: number; status: string; offerType: string | null;
    exitReasonLabel: string | null; exitFeedback: string | null; createdAt: string }[];
  offers: { discountTier: string | null; pauseTier: string | null } | null;
  integration: { live: boolean; lastEventAt: string | null };
};

const DISCOUNTS = [
  { id: "50_2mo", label: "50% off for 2 months" },
  { id: "30_3mo", label: "30% off for 3 months" },
  { id: "1mo_free", label: "1 month free" },
];
const PAUSES = [{ id: "30_day", label: "Pause 30 days" }, { id: "60_day", label: "Pause 60 days" }];
const STATUS_STYLE: Record<string, string> = {
  rescued_discount: "bg-lime", rescued_pause: "bg-sky-200", cancelled: "bg-rose-200", intercepted: "bg-zinc-200",
};
const STATUS_LABEL: Record<string, string> = {
  rescued_discount: "Saved · discount", rescued_pause: "Saved · pause", cancelled: "Cancelled", intercepted: "Abandoned",
};

const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
const card = "border-4-black bg-cream p-4 shadow-brutal sm:p-5";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={`${card} min-w-0`}>
      <span className="block font-mono text-[11px] font-black uppercase text-zinc-600">{label}</span>
      <span className="mt-1 block break-words text-3xl font-black text-pitch xl:text-4xl">{value}</span>
      {hint && <span className="mt-1 block font-mono text-[11px] text-zinc-600">{hint}</span>}
    </div>
  );
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="shrink-0 border-2 border-pitch bg-white px-2 py-1 font-mono text-xs font-black hover:bg-lime"
      onClick={() => { void navigator.clipboard.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }); }}>
      {done ? "Copied ✓" : label}
    </button>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discount, setDiscount] = useState("50_2mo");
  const [pause, setPause] = useState("30_day");
  const [offerStatus, setOfferStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [savingOffers, setSavingOffers] = useState(false);
  const [billingBusy, setBillingBusy] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/workspace/overview", { cache: "no-store" });
      if (res.status === 401) { window.location.assign("/login?error=session_expired&next=/dashboard"); return; }
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setData(json);
      if (json.offers?.discountTier) setDiscount(json.offers.discountTier);
      if (json.offers?.pauseTier) setPause(json.offers.pauseTier);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Your dashboard could not be loaded.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveOffers = async () => {
    setSavingOffers(true);
    setOfferStatus(null);
    try {
      const res = await fetch("/api/workspace/setup", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ discountTier: discount, pauseTier: pause }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setOfferStatus({ kind: "ok", text: "Saved to the edge. New cancellations get these offers within about a minute." });
    } catch (e) {
      setOfferStatus({ kind: "error", text: e instanceof Error ? e.message : "Offers were not saved." });
    } finally {
      setSavingOffers(false);
    }
  };

  const upgrade = async (plan: "starter" | "pro") => {
    setBillingBusy(plan);
    setBillingError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      window.location.assign(json.url);
    } catch (e) {
      setBillingError(e instanceof Error ? e.message : "Checkout could not start.");
      setBillingBusy(null);
    }
  };

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-cobalt p-4 paper-grain">
        <div className="max-w-md space-y-4 border-4-black bg-cream p-6 text-center shadow-brutal">
          <h1 className="text-2xl font-black uppercase">Dashboard unavailable</h1>
          <p className="font-mono text-sm">{error}</p>
          <BrutalButton onClick={() => void load()}>Retry</BrutalButton>
        </div>
      </main>
    );
  }
  if (!data) return <main className="grid min-h-screen place-items-center bg-cobalt font-mono font-black text-cream paper-grain">Loading your cockpit…</main>;

  const { workspace: ws, usage, last30Days: stats } = data;
  const usagePct = usage.quota ? Math.min(100, Math.round((usage.used / usage.quota) * 100)) : 0;
  const unlimited = usage.quota >= 1_000_000;
  const maxReason = Math.max(1, ...stats.topReasons.map((r) => r.count));

  return (
    <main className="min-h-screen bg-cobalt p-3 paper-grain sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-4-black bg-cream p-4 shadow-brutal">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex h-11 w-11 shrink-0 items-center justify-center border-3 border-pitch bg-lime shadow-brutal-sm">
              <Image src="/brand/logo.png" alt="BoolBul" width={34} height={34} />
            </Link>
            <div className="min-w-0">
              <span className="block truncate text-xl font-black uppercase tracking-tight">{ws.name}</span>
              <span className="block truncate font-mono text-xs text-zinc-600">{ws.email} · {ws.role}</span>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/customizer"><BrutalButton size="sm">🎨 Customizer</BrutalButton></Link>
            <Link href="/dashboard/settings"><BrutalButton size="sm" variant="white">⚙️ Settings</BrutalButton></Link>
            <Link href="/docs/quickstart"><BrutalButton size="sm" variant="white">Docs</BrutalButton></Link>
            <form method="post" action="/auth/signout"><BrutalButton size="sm" variant="cream" type="submit">Sign out</BrutalButton></form>
          </nav>
        </header>

        {!ws.onboardingCompleted && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-4-black bg-amber-200 p-4 shadow-brutal">
            <p className="font-mono text-sm font-bold">Setup isn&apos;t finished yet — pick your gateway and offers and grab your snippet.</p>
            <Link href="/onboarding"><BrutalButton size="sm">Finish setup →</BrutalButton></Link>
          </div>
        )}

        <section className={`${card} flex flex-wrap items-center justify-between gap-4`}>
          <div className="min-w-0 space-y-1">
            <span className={`inline-flex items-center gap-2 border-2 border-pitch px-2 py-0.5 font-mono text-xs font-black uppercase ${data.integration.live ? "bg-lime" : "bg-white"}`}>
              <span className={`h-2 w-2 rounded-full ${data.integration.live ? "bg-emerald-600" : "bg-zinc-400"}`} />
              {data.integration.live ? "Live" : "Waiting for first cancellation"}
            </span>
            <p className="font-mono text-xs text-zinc-700">
              {data.integration.live
                ? `Last activity ${new Date(data.integration.lastEventAt!).toLocaleString()} · ${ws.gateway === "stripe" ? "Stripe" : "Dodo Payments"}`
                : <>Add the snippet to your cancel button — <Link className="font-bold underline" href="/docs/quickstart">quickstart</Link>. Gateway: {ws.gateway === "stripe" ? "Stripe" : "Dodo Payments"}.</>}
            </p>
          </div>
          <div className="flex min-w-0 max-w-full items-center gap-2">
            <code className="truncate border-2 border-pitch bg-white px-2 py-1 font-mono text-xs">{ws.publicKey}</code>
            <CopyButton value={ws.publicKey} />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Saved MRR · 30 days" value={money(stats.savedMrrCents)} hint={`${stats.discounts} discounts · ${stats.pauses} pauses`} />
          <Stat label="Subscribers saved" value={stats.saved.toLocaleString()} />
          <Stat label="Save rate" value={`${stats.saveRate}%`} hint={`${stats.saved} saved / ${stats.saved + stats.cancelled} decided`} />
          <Stat label="Cancel sessions" value={stats.sessions.toLocaleString()} hint={`${stats.cancelled} cancelled`} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className={`${card} space-y-3`}>
            <h2 className="text-xl font-black uppercase">Offer tuner</h2>
            <p className="font-mono text-xs text-zinc-700">What customers are offered when they try to cancel. Order adapts to their reason automatically.</p>
            <label className="block font-mono text-xs font-black uppercase">Discount offer
              <select value={discount} disabled={!ws.canManage} onChange={(e) => setDiscount(e.target.value)} className="mt-1 w-full border-2 border-pitch bg-white p-2.5 font-mono text-sm">
                {DISCOUNTS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </label>
            <label className="block font-mono text-xs font-black uppercase">Pause offer
              <select value={pause} disabled={!ws.canManage} onChange={(e) => setPause(e.target.value)} className="mt-1 w-full border-2 border-pitch bg-white p-2.5 font-mono text-sm">
                {PAUSES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <BrutalButton size="sm" disabled={!ws.canManage || savingOffers} onClick={() => void saveOffers()}>{savingOffers ? "Saving…" : "Save offers"}</BrutalButton>
              <Link href="/dashboard/customizer" className="font-mono text-xs font-bold underline">Choose which offers show →</Link>
            </div>
            {offerStatus && <p role="status" className={`border-2 border-pitch p-2 font-mono text-xs font-bold ${offerStatus.kind === "ok" ? "bg-lime" : "bg-rose-100 text-red-900"}`}>{offerStatus.text}</p>}
          </section>

          <section className={`${card} space-y-3`}>
            <h2 className="text-xl font-black uppercase">Why people leave</h2>
            {stats.topReasons.length === 0
              ? <p className="font-mono text-sm text-zinc-700">Exit reasons appear here after your first cancellation sessions.</p>
              : <ul className="space-y-2">{stats.topReasons.map((r) => (
                <li key={r.id}>
                  <div className="flex justify-between font-mono text-xs font-bold"><span>{r.label}</span><span>{r.count}</span></div>
                  <div className="mt-1 h-3 border-2 border-pitch bg-white"><div className="h-full bg-pitch" style={{ width: `${(r.count / maxReason) * 100}%` }} /></div>
                </li>))}</ul>}
          </section>
        </div>

        <section className={`${card} space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black uppercase">Plan & usage</h2>
              <p className="font-mono text-xs text-zinc-700">
                Plan: <strong className="uppercase">{ws.plan}</strong> · Billing: <strong className="uppercase">{ws.billingStatus}</strong>
                {ws.billingMode === "test_mode" && <span className="ml-2 border border-pitch bg-amber-200 px-1">TEST MODE</span>}
              </p>
            </div>
            {ws.canManage && ws.plan !== "pro" && process.env.NEXT_PUBLIC_BOOLBUL_SELF_HOSTED !== "true" && (
              <div className="flex flex-wrap gap-2">
                {ws.plan === "free" && <BrutalButton size="sm" variant="white" disabled={!!billingBusy} onClick={() => void upgrade("starter")}>{billingBusy === "starter" ? "Opening…" : "Starter · $19/mo"}</BrutalButton>}
                <BrutalButton size="sm" disabled={!!billingBusy} onClick={() => void upgrade("pro")}>{billingBusy === "pro" ? "Opening…" : "Pro · $49/mo"}</BrutalButton>
              </div>
            )}
          </div>
          <div>
            <div className="flex justify-between font-mono text-xs font-bold">
              <span>Saved subscribers in {usage.month}</span>
              <span>{usage.used.toLocaleString()} / {unlimited ? "unlimited" : usage.quota.toLocaleString()}</span>
            </div>
            <div className="mt-1 h-4 border-2 border-pitch bg-white"><div className={`h-full ${usagePct >= 90 ? "bg-rose-500" : "bg-lime"}`} style={{ width: `${unlimited ? 2 : usagePct}%` }} /></div>
            {!unlimited && usagePct >= 90 && <p className="mt-1 font-mono text-xs font-bold text-red-800">Almost at your limit. When it&apos;s reached, BoolBul steps aside and customers cancel normally.</p>}
          </div>
          {billingError && <p role="alert" className="border-2 border-pitch bg-rose-100 p-2 font-mono text-xs font-bold text-red-900">{billingError}</p>}
        </section>

        <section className={`${card} space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black uppercase">Retention ledger</h2>
              <p className="font-mono text-xs text-zinc-700">Latest 50 cancellation sessions.</p>
            </div>
            <div className="flex gap-2">
              <BrutalButton size="sm" variant="white" onClick={() => void load()}>Refresh</BrutalButton>
              <a href="/api/workspace/ledger?format=csv"><BrutalButton size="sm" variant="white">Download CSV</BrutalButton></a>
            </div>
          </div>
          {data.ledger.length === 0 ? (
            <p className="border-2 border-dashed border-pitch bg-white p-6 text-center font-mono text-sm">No sessions yet. Every cancellation attempt — saved or not — lands here with its reason.</p>
          ) : (
            <div className="overflow-x-auto border-2 border-pitch bg-white">
              <table className="w-full min-w-[640px] text-left font-mono text-xs">
                <thead className="bg-zinc-100"><tr className="border-b-2 border-pitch">
                  <th className="p-2.5">When</th><th className="p-2.5">Customer</th><th className="p-2.5">Outcome</th><th className="p-2.5">MRR</th><th className="p-2.5">Reason</th>
                </tr></thead>
                <tbody className="divide-y divide-zinc-200">
                  {data.ledger.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="whitespace-nowrap p-2.5">{new Date(row.createdAt).toLocaleString()}</td>
                      <td className="max-w-[180px] break-all p-2.5">{row.customerId}</td>
                      <td className="p-2.5"><span className={`border border-pitch px-1.5 py-0.5 font-bold ${STATUS_STYLE[row.status] ?? "bg-white"}`}>{STATUS_LABEL[row.status] ?? row.status}</span></td>
                      <td className="p-2.5">{money(row.mrrCents)}</td>
                      <td className="p-2.5">{row.exitReasonLabel ?? "—"}{row.exitFeedback && <span className="block text-zinc-500">“{row.exitFeedback}”</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
