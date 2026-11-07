"use client";

import { useCallback, useEffect, useState } from "react";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";

type Status = {
  configured: boolean;
  environment: "test_mode" | "live_mode" | null;
  approved: boolean;
  canManage: boolean;
  trialEndsAt: string | null;
  autoRenew: boolean;
  plan: string;
  billingStatus: string;
  subscription: { plan: string; status: string } | null;
  prices: { starter: number; pro: number };
};

/** Small, recognisable card-network marks (accepted via Dodo Payments' secure checkout). */
export function CardLogos() {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Accepted cards: Visa, Mastercard, American Express, RuPay, Discover">
      <svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="Visa"><rect width="38" height="24" rx="3" fill="#fff" stroke="#d4d4d8" /><text x="19" y="16" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontStyle="italic" fontSize="10" fill="#1A1F71">VISA</text></svg>
      <svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="Mastercard"><rect width="38" height="24" rx="3" fill="#fff" stroke="#d4d4d8" /><circle cx="15.5" cy="12" r="6.5" fill="#EB001B" /><circle cx="22.5" cy="12" r="6.5" fill="#F79E1B" /><path d="M19 6.6a6.5 6.5 0 010 10.8 6.5 6.5 0 010-10.8z" fill="#FF5F00" /></svg>
      <svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="American Express"><rect width="38" height="24" rx="3" fill="#2E77BC" /><text x="19" y="15.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="8" fill="#fff">AMEX</text></svg>
      <svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="RuPay"><rect width="38" height="24" rx="3" fill="#fff" stroke="#d4d4d8" /><text x="17" y="15.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontStyle="italic" fontSize="8.5" fill="#1B3F8B">RuPay</text><path d="M30 7l3 5-3 5z" fill="#F58220" /><path d="M27.5 7l3 5-3 5z" fill="#097A44" /></svg>
      <svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="Discover"><rect width="38" height="24" rx="3" fill="#fff" stroke="#d4d4d8" /><text x="16" y="15" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="6.5" fill="#231F20">DISCOVER</text><circle cx="31.5" cy="12.5" r="3" fill="#F48120" /></svg>
    </div>
  );
}

const money = (cents: number) => `$${(cents / 100).toFixed(0)}`;

export function BillingSection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [plan, setPlan] = useState<"pro" | "starter">("pro");
  const [autoRenew, setAutoRenew] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/status", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = await res.json() as Status;
      setStatus(json);
      setAutoRenew(json.autoRenew);
    } catch {
      setUnavailable(true);
    }
  }, []);
  useEffect(() => {
    void load();
    if (new URLSearchParams(window.location.search).get("billing") === "return") {
      setNotice({ kind: "ok", text: "Thanks! Your card is being confirmed with Dodo Payments — this can take a minute." });
    }
  }, [load]);

  const saveAutoRenew = async (next: boolean) => {
    setAutoRenew(next);
    setBusy("renew");
    setNotice(null);
    try {
      const res = await fetch("/api/billing/auto-renew", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ autoRenew: next }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message);
      setNotice({ kind: "ok", text: next ? "Auto-renew is on." : "Auto-renew is off — you won't be charged when your pass ends." });
    } catch (e) {
      setAutoRenew(!next);
      setNotice({ kind: "error", text: e instanceof Error && e.message ? e.message : "Couldn't save auto-renew." });
    } finally {
      setBusy(null);
    }
  };

  const addCard = async () => {
    setBusy("card");
    setNotice(null);
    try {
      // Save the auto-renew choice first so the webhook can apply it to the new subscription.
      await fetch("/api/billing/auto-renew", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ autoRenew }) });
      const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error(json.message);
      window.location.assign(json.url);
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error && e.message ? e.message : "Secure checkout could not start. Please retry." });
      setBusy(null);
    }
  };

  const openPortal = async () => {
    setBusy("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error(json.message);
      window.location.assign(json.url);
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error && e.message ? e.message : "Card management is unavailable right now." });
      setBusy(null);
    }
  };

  const card = "space-y-3 border-4-black bg-cream p-5 shadow-brutal";
  if (unavailable) {
    return (
      <section className={card} aria-labelledby="billing-heading">
        <h2 id="billing-heading" className="text-xl font-black uppercase">Billing</h2>
        <p className="font-mono text-sm text-zinc-700">Billing isn&apos;t available on this installation.</p>
      </section>
    );
  }
  if (!status) {
    return <section className={card}><h2 className="text-xl font-black uppercase">Billing</h2><p className="font-mono text-sm">Loading…</p></section>;
  }

  const passEnds = status.trialEndsAt ? new Date(status.trialEndsAt) : null;
  const passActive = passEnds !== null && passEnds.getTime() > Date.now();
  const passDate = passEnds?.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

  return (
    <section className={card} aria-labelledby="billing-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="billing-heading" className="text-xl font-black uppercase">Billing</h2>
        {status.environment === "test_mode" && <span className="border-2 border-pitch bg-amber-200 px-2 py-0.5 font-mono text-[10px] font-black">TEST MODE</span>}
      </div>

      {passActive && (
        <p className="border-3 border-pitch bg-lime p-3 font-mono text-sm font-bold">
          🎟️ Your free Pro pass is active until {passDate}. No card needed — adding one is optional.
        </p>
      )}

      {!status.approved ? (
        <p className="font-mono text-sm text-zinc-700">You can add a card after your beta application is approved.</p>
      ) : status.subscription ? (
        <div className="space-y-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-sm">
            <dt className="font-black uppercase">Plan</dt><dd className="uppercase">{status.subscription.plan} · {money(status.subscription.plan === "pro" ? status.prices.pro : status.prices.starter)}/month</dd>
            <dt className="font-black uppercase">Status</dt><dd className="uppercase">{status.subscription.status}</dd>
            <dt className="font-black uppercase">Card</dt><dd>On file with Dodo Payments</dd>
          </dl>
          <label className="flex items-start gap-2 font-mono text-sm font-bold">
            <input type="checkbox" className="mt-0.5 h-5 w-5 accent-black" checked={autoRenew} disabled={!status.canManage || busy === "renew"} onChange={(e) => void saveAutoRenew(e.target.checked)} />
            <span>Auto-renew{passActive ? ` from ${passDate}` : ""} — charge my card each month. Untick to stop at the end of the current period.</span>
          </label>
          <BrutalButton size="sm" variant="white" disabled={!status.canManage || busy === "portal"} onClick={() => void openPortal()}>
            {busy === "portal" ? "Opening…" : "Update card / invoices"}
          </BrutalButton>
        </div>
      ) : !status.configured ? (
        <div className="space-y-2">
          <CardLogos />
          <p className="font-mono text-sm text-zinc-700">
            Card setup opens soon. {passActive ? `Your pass stays free until ${passDate}, and ` : ""}we&apos;ll never charge you without a card you add yourself.
          </p>
          <BrutalButton size="sm" variant="white" disabled>Add card (coming soon)</BrutalButton>
        </div>
      ) : (
        <div className="space-y-3">
          <fieldset className="grid gap-2 sm:grid-cols-2" disabled={!status.canManage}>
            <legend className="mb-1 font-mono text-xs font-black uppercase">Plan after your free pass</legend>
            {(["pro", "starter"] as const).map((p) => (
              <label key={p} className={`flex cursor-pointer items-center gap-2 border-3 border-pitch p-3 font-bold ${plan === p ? "bg-lime" : "bg-white"}`}>
                <input type="radio" name="plan" className="accent-black" checked={plan === p} onChange={() => setPlan(p)} />
                <span>{p === "pro" ? "Pro" : "Starter"} · {money(status.prices[p])}/month <span className="block font-mono text-[11px] font-normal">{p === "pro" ? "Unlimited saves" : "Up to 500 saves / month"}</span></span>
              </label>
            ))}
          </fieldset>
          <label className="flex items-start gap-2 font-mono text-sm font-bold">
            <input type="checkbox" className="mt-0.5 h-5 w-5 accent-black" checked={autoRenew} disabled={!status.canManage} onChange={(e) => setAutoRenew(e.target.checked)} />
            <span>Auto-renew {passActive ? `from ${passDate}` : "monthly"} — I authorise BoolBul to charge this card {passActive ? "when my free pass ends" : "each month"}. I can turn this off any time here.</span>
          </label>
          <CardLogos />
          <BrutalButton size="sm" disabled={!status.canManage || busy === "card"} onClick={() => void addCard()}>
            {busy === "card" ? "Opening secure checkout…" : "Add card securely →"}
          </BrutalButton>
          <p className="font-mono text-[11px] text-zinc-600">
            {passActive ? `You won't be charged today. ` : ""}Card details are entered on Dodo Payments&apos; secure checkout and never touch BoolBul&apos;s servers.
          </p>
        </div>
      )}
      {notice && <p role={notice.kind === "error" ? "alert" : "status"} className={`border-2 border-pitch p-2 font-mono text-xs font-bold ${notice.kind === "ok" ? "bg-lime" : "bg-rose-100 text-red-900"}`}>{notice.text}</p>}
    </section>
  );
}
