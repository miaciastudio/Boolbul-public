"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Offer } from "@boolbul/sdk";
import { BoolBulPreview } from "@boolbul/sdk/react";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";
import { reactSnippet, scriptSnippet, serverSnippet } from "@/lib/docs/snippets";

type Gateway = "dodo_payments" | "stripe";
type Notice = { kind: "ok" | "error"; text: string } | null;

const DISCOUNTS = {
  "50_2mo": { label: "50% off for 2 months", bp: 5000, months: 2 },
  "30_3mo": { label: "30% off for 3 months", bp: 3000, months: 3 },
  "1mo_free": { label: "1 month free", bp: 10000, months: 1 },
} as const;
const PAUSES = { "30_day": { label: "Pause 30 days", days: 30 }, "60_day": { label: "Pause 60 days", days: 60 } } as const;
type DiscountTier = keyof typeof DISCOUNTS;
type PauseTier = keyof typeof PAUSES;

const STEPS = ["Your app", "Gateway", "Offers", "Install"];
const field = "w-full border-2 border-pitch bg-white p-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-lime";

async function api(path: string, method: string, body?: unknown) {
  const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) window.location.assign("/login?error=session_expired&next=/onboarding");
  if (!res.ok) throw new Error(json.message || "Something went wrong. Please retry.");
  return json;
}

function NoticeBox({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return <p role={notice.kind === "error" ? "alert" : "status"} className={`border-2 border-pitch p-2 font-mono text-xs font-bold ${notice.kind === "ok" ? "bg-lime" : "bg-rose-100 text-red-900"}`}>{notice.text}</p>;
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden border-3 border-pitch">
      <div className="flex items-center justify-between border-b-2 border-pitch bg-lime px-3 py-1">
        <span className="font-mono text-[11px] font-black uppercase">{label}</span>
        <button type="button" className="font-mono text-[11px] font-black underline"
          onClick={() => { void navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="max-h-72 overflow-auto bg-pitch p-3 font-mono text-[11px] leading-relaxed text-lime"><code>{code}</code></pre>
    </div>
  );
}

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [publicKey, setPublicKey] = useState("");
  const [canManage, setCanManage] = useState(true);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [gateway, setGateway] = useState<Gateway>("dodo_payments");
  const [discount, setDiscount] = useState<DiscountTier>("50_2mo");
  const [pause, setPause] = useState<PauseTier>("30_day");
  const [secret, setSecret] = useState<string | null>(null);
  const [snippetTab, setSnippetTab] = useState<"html" | "react">("html");
  const [ping, setPing] = useState<Notice>(null);

  const load = useCallback(async () => {
    try {
      const data = await api("/api/workspace/overview", "GET");
      if (data.access && data.access.status !== "active") { window.location.replace("/dashboard"); return; }
      setPublicKey(data.workspace.publicKey);
      setCanManage(data.workspace.canManage);
      setName(data.workspace.name);
      setDomain(data.workspace.primaryDomain ?? "");
      setGateway(data.workspace.gateway === "stripe" ? "stripe" : "dodo_payments");
      if (data.offers?.discountTier) setDiscount(data.offers.discountTier);
      if (data.offers?.pauseTier) setPause(data.offers.pauseTier);
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "Your workspace could not be loaded." });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setNotice(null);
    try { await work(); } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong." });
    } finally { setBusy(false); }
  };

  const saveApp = () => run(async () => {
    await api("/api/workspace/settings", "PATCH", { name, primaryDomain: domain.trim() || null });
    setStep(1);
  });
  const saveGateway = () => run(async () => {
    await api("/api/workspace/settings", "PATCH", { gateway });
    setStep(2);
  });
  const saveOffers = () => run(async () => {
    await api("/api/workspace/setup", "POST", { discountTier: discount, pauseTier: pause });
    setStep(3);
  });
  const revealSecret = () => run(async () => {
    const data = await api("/api/workspace/secret", "POST", {});
    setSecret(data.signingSecret);
  });
  const testEdge = async () => {
    setPing(null);
    const started = performance.now();
    try {
      const res = await fetch("/api/v1/intercept/init", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey, customerId: "boolbul_setup_check", subscriptionId: "boolbul_setup_check" }),
      });
      const json = await res.json();
      const ms = Math.round(performance.now() - started);
      if (res.ok && json.failOpen === false) {
        setPing({ kind: "ok", text: `Edge reachable in ${ms} ms · ${json.rules.length} offer${json.rules.length === 1 ? "" : "s"} live. (Setup checks aren't recorded in your ledger.)` });
      } else {
        setPing({ kind: "error", text: `Edge answered but would step aside (${json.error ?? json.reason ?? res.status}). Check your plan quota in the dashboard.` });
      }
    } catch {
      setPing({ kind: "error", text: "Couldn't reach the edge. Check your connection and try again." });
    }
  };

  const previewOffers: Offer[] = [
    { ruleId: "d", offerType: "discount", offerValue: DISCOUNTS[discount].bp, discountDurationMonths: DISCOUNTS[discount].months },
    { ruleId: "p", offerType: "pause", offerValue: PAUSES[pause].days, discountDurationMonths: 0 },
  ];

  if (loading) return <div className="grid min-h-[60vh] place-items-center font-mono font-black text-cream">Loading your workspace…</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="space-y-3 border-4-black bg-cream p-5 shadow-brutal">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">Set up BoolBul</h1>
          <Link href="/dashboard" className="font-mono text-xs font-bold underline">Skip to dashboard →</Link>
        </div>
        <ol className="grid grid-cols-4 gap-2">
          {STEPS.map((label, index) => (
            <li key={label}>
              <button type="button" disabled={index > step} onClick={() => setStep(index)}
                className={`w-full border-3 border-pitch px-2 py-2 text-left font-mono text-[11px] font-black uppercase sm:text-xs ${index === step ? "bg-lime shadow-brutal-sm" : index < step ? "bg-white" : "bg-zinc-100 text-zinc-500"}`}>
                <span className="block">{index < step ? "✓" : index + 1}</span>{label}
              </button>
            </li>
          ))}
        </ol>
        {!canManage && <p className="border-2 border-pitch bg-amber-100 p-2 font-mono text-xs font-bold">You have view-only access to this workspace. An owner or admin needs to finish setup.</p>}
      </header>

      <NoticeBox notice={notice} />

      {step === 0 && (
        <section className="space-y-4 border-4-black bg-cream p-5 shadow-brutal">
          <h2 className="text-xl font-black uppercase">Tell us about your app</h2>
          <label className="block font-mono text-xs font-black uppercase">App / workspace name
            <input className={`${field} mt-1`} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Analytics" />
          </label>
          <label className="block font-mono text-xs font-black uppercase">Where does your app run? (optional)
            <input className={`${field} mt-1`} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="app.acme.com" />
          </label>
          <BrutalButton disabled={busy || !canManage || !name.trim()} onClick={() => void saveApp()}>{busy ? "Saving…" : "Continue →"}</BrutalButton>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4 border-4-black bg-cream p-5 shadow-brutal">
          <h2 className="text-xl font-black uppercase">Who bills your customers?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {([["dodo_payments", "Dodo Payments", "Merchant of record. Pause, discounts and cancellation feedback via API."],
              ["stripe", "Stripe", "Billing subscriptions. Pause collection, coupons and cancellation feedback."]] as const).map(([id, label, text]) => (
              <button key={id} type="button" aria-pressed={gateway === id} onClick={() => setGateway(id)}
                className={`border-3 border-pitch p-4 text-left ${gateway === id ? "bg-lime shadow-brutal-sm" : "bg-white hover:-translate-y-0.5"}`}>
                <span className="block text-lg font-black">{label}</span>
                <span className="mt-1 block font-mono text-xs text-zinc-700">{text}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {["Paddle", "Lemon Squeezy", "Polar", "Chargebee"].map((g) => (
              <div key={g} className="border-2 border-dashed border-zinc-500 bg-zinc-50 p-2 font-mono text-xs text-zinc-600">
                <span className="block font-black">{g}</span>Coming soon
              </div>
            ))}
          </div>
          <p className="font-mono text-xs text-zinc-700">BoolBul never asks for your gateway API key — your own server applies offers.</p>
          <div className="flex gap-2">
            <BrutalButton variant="white" onClick={() => setStep(0)}>← Back</BrutalButton>
            <BrutalButton disabled={busy || !canManage} onClick={() => void saveGateway()}>{busy ? "Saving…" : "Continue →"}</BrutalButton>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="grid gap-5 border-4-black bg-cream p-5 shadow-brutal lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          <div className="space-y-4">
            <h2 className="text-xl font-black uppercase">Pick your rescue offers</h2>
            <fieldset className="space-y-2">
              <legend className="font-mono text-xs font-black uppercase">Discount</legend>
              {(Object.keys(DISCOUNTS) as DiscountTier[]).map((id) => (
                <label key={id} className={`flex cursor-pointer items-center gap-2 border-3 border-pitch p-3 font-bold ${discount === id ? "bg-lime" : "bg-white"}`}>
                  <input type="radio" name="discount" checked={discount === id} onChange={() => setDiscount(id)} className="accent-black" />{DISCOUNTS[id].label}
                </label>
              ))}
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="font-mono text-xs font-black uppercase">Pause</legend>
              {(Object.keys(PAUSES) as PauseTier[]).map((id) => (
                <label key={id} className={`flex cursor-pointer items-center gap-2 border-3 border-pitch p-3 font-bold ${pause === id ? "bg-lime" : "bg-white"}`}>
                  <input type="radio" name="pause" checked={pause === id} onChange={() => setPause(id)} className="accent-black" />{PAUSES[id].label}
                </label>
              ))}
            </fieldset>
            <p className="font-mono text-xs text-zinc-700">The cancel link is always visible — customers are never forced through an offer.</p>
            <div className="flex gap-2">
              <BrutalButton variant="white" onClick={() => setStep(1)}>← Back</BrutalButton>
              <BrutalButton disabled={busy || !canManage} onClick={() => void saveOffers()}>{busy ? "Saving to edge…" : "Save offers →"}</BrutalButton>
            </div>
          </div>
          <div className="relative h-[600px] overflow-hidden rounded-[40px] border-[9px] border-pitch bg-white">
            <BoolBulPreview viewport="mobile" step="offers" offers={previewOffers} planPriceCents={4900} style={{ position: "absolute", inset: 0 }} />
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-5 border-4-black bg-cream p-5 shadow-brutal">
          <h2 className="text-xl font-black uppercase">Install in two places</h2>

          <div className="space-y-2">
            <h3 className="font-black uppercase">1 · Save your signing secret on your server</h3>
            <p className="font-mono text-xs text-zinc-700">Add it as <code className="bg-zinc-200 px-1">BOOLBUL_SIGNING_SECRET</code>. It&apos;s shown once; you can rotate it later in Settings.</p>
            {secret ? (
              <CodeBlock label="BOOLBUL_SIGNING_SECRET" code={secret} />
            ) : (
              <BrutalButton size="sm" variant="white" disabled={busy || !canManage} onClick={() => void revealSecret()}>{busy ? "Issuing…" : "Reveal my signing secret"}</BrutalButton>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-black uppercase">2 · Open BoolBul from your cancel button</h3>
            <div className="flex border-3 border-pitch" role="tablist">
              {(["html", "react"] as const).map((tab) => (
                <button key={tab} type="button" role="tab" aria-selected={snippetTab === tab} onClick={() => setSnippetTab(tab)}
                  className={`flex-1 px-3 py-1.5 font-mono text-xs font-black uppercase ${snippetTab === tab ? "bg-pitch text-lime" : "bg-white"}`}>{tab === "html" ? "Script tag" : "React / npm"}</button>
              ))}
            </div>
            <CodeBlock label={snippetTab === "html" ? "index.html" : "CancelButton.tsx"} code={snippetTab === "html" ? scriptSnippet(publicKey) : reactSnippet(publicKey)} />
          </div>

          <div className="space-y-2">
            <h3 className="font-black uppercase">3 · Apply offers on your server ({gateway === "stripe" ? "Stripe" : "Dodo Payments"})</h3>
            <CodeBlock label="api/boolbul routes" code={serverSnippet(gateway)} />
            <p className="font-mono text-xs text-zinc-700">Building a mobile app? See <Link href="/docs/mobile-apps" className="font-bold underline">mobile setup</Link>.</p>
          </div>

          <div className="space-y-2 border-t-2 border-pitch pt-4">
            <div className="flex flex-wrap gap-2">
              <BrutalButton variant="white" size="sm" onClick={() => void testEdge()}>Test edge connection</BrutalButton>
              <Link href="/dashboard"><BrutalButton size="sm">Go to dashboard →</BrutalButton></Link>
            </div>
            <NoticeBox notice={ping} />
          </div>
        </section>
      )}
    </div>
  );
}
