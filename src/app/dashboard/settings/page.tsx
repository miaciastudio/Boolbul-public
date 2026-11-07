"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";
import { BillingSection } from "@/components/platform-screens/BillingSection";

type Workspace = { name: string; publicKey: string; gateway: string; primaryDomain: string | null; plan: string; canManage: boolean; email: string | null };
type Notice = { kind: "ok" | "error"; text: string } | null;

const field = "w-full border-2 border-pitch bg-white p-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-lime disabled:opacity-60";
const card = "space-y-3 border-4-black bg-cream p-5 shadow-brutal";

function NoticeBox({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return <p role={notice.kind === "error" ? "alert" : "status"} className={`border-2 border-pitch p-2 font-mono text-xs font-bold ${notice.kind === "ok" ? "bg-lime" : "bg-rose-100 text-red-900"}`}>{notice.text}</p>;
}

export default function SettingsPage() {
  const [ws, setWs] = useState<Workspace | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [name, setName] = useState("");
  const [gateway, setGateway] = useState("dodo_payments");
  const [domain, setDomain] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<Notice>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [secretNotice, setSecretNotice] = useState<Notice>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch("/api/workspace/overview", { cache: "no-store" });
      if (res.status === 401) { window.location.assign("/login?error=session_expired&next=/dashboard/settings"); return; }
      const json = await res.json();
      if (!res.ok) throw new Error();
      if (json.access && json.access.status !== "active") { window.location.replace("/dashboard"); return; }
      const w = json.workspace as Workspace;
      setWs(w);
      setName(w.name);
      setGateway(w.gateway);
      setDomain(w.primaryDomain ?? "");
    } catch {
      setLoadError(true);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const copy = (value: string, key: string) => {
    void navigator.clipboard.writeText(value).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1500); });
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsNotice(null);
    try {
      const res = await fetch("/api/workspace/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, gateway, primaryDomain: domain.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setWs((w) => w && { ...w, name: json.name, gateway: json.gateway, primaryDomain: json.primaryDomain });
      setDomain(json.primaryDomain ?? "");
      setSettingsNotice({ kind: "ok", text: "Workspace settings saved." });
    } catch (e) {
      setSettingsNotice({ kind: "error", text: e instanceof Error ? e.message : "Settings were not saved." });
    } finally {
      setSavingSettings(false);
    }
  };

  const rotate = async () => {
    setRotating(true);
    setSecretNotice(null);
    try {
      const res = await fetch("/api/workspace/secret", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setSecret(json.signingSecret);
      setConfirmRotate(false);
      setSecretNotice({ kind: "ok", text: "New secret issued. Copy it now — it won't be shown again. The old secret stopped working." });
    } catch (e) {
      setSecretNotice({ kind: "error", text: e instanceof Error ? e.message : "Rotation failed." });
    } finally {
      setRotating(false);
    }
  };

  const exportJson = async () => {
    const [overview, widget] = await Promise.all([
      fetch("/api/workspace/overview").then((r) => r.json()),
      fetch("/api/workspace/widget").then((r) => r.json()),
    ]);
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), workspace: overview.workspace, offers: overview.offers, widget: widget.config, last30Days: overview.last30Days }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boolbul-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loadError) {
    return (
      <main className="grid min-h-screen place-items-center bg-cobalt p-4 paper-grain">
        <div className="space-y-4 border-4-black bg-cream p-6 text-center shadow-brutal">
          <p className="font-mono text-sm font-bold">Settings could not be loaded.</p>
          <BrutalButton onClick={() => void load()}>Retry</BrutalButton>
        </div>
      </main>
    );
  }
  if (!ws) return <main className="grid min-h-screen place-items-center bg-cobalt font-mono font-black text-cream paper-grain">Loading settings…</main>;

  const disabled = !ws.canManage;
  return (
    <main className="min-h-screen bg-cobalt p-3 paper-grain sm:p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="border-4-black bg-cream p-5 shadow-brutal">
          <Link href="/dashboard" className="font-mono text-xs font-bold underline">← Dashboard</Link>
          <h1 className="text-3xl font-black uppercase tracking-tight">Settings</h1>
          <p className="font-mono text-xs text-zinc-700">{ws.email} · plan {ws.plan.toUpperCase()}</p>
        </header>

        {disabled && <p className="border-3 border-pitch bg-amber-100 p-3 font-mono text-sm font-bold">View-only access. Ask an owner or admin to change settings.</p>}

        <section className={card}>
          <h2 className="text-xl font-black uppercase">Workspace</h2>
          <label className="block font-mono text-xs font-black uppercase">Name
            <input className={`${field} mt-1`} disabled={disabled} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block font-mono text-xs font-black uppercase">App domain (optional)
            <input className={`${field} mt-1`} disabled={disabled} placeholder="app.example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </label>
          <fieldset disabled={disabled}>
            <legend className="mb-1 font-mono text-xs font-black uppercase">Billing gateway</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {[{ id: "dodo_payments", label: "Dodo Payments" }, { id: "stripe", label: "Stripe" }].map((g) => (
                <button key={g.id} type="button" aria-pressed={gateway === g.id} onClick={() => setGateway(g.id)}
                  className={`border-3 border-pitch p-3 text-left font-black ${gateway === g.id ? "bg-lime shadow-brutal-sm" : "bg-white"}`}>{g.label}</button>
              ))}
            </div>
            <p className="mt-2 font-mono text-[11px] text-zinc-600">Paddle, Lemon Squeezy, Polar and Chargebee are coming soon.</p>
          </fieldset>
          <BrutalButton size="sm" disabled={disabled || savingSettings} onClick={() => void saveSettings()}>{savingSettings ? "Saving…" : "Save workspace"}</BrutalButton>
          <NoticeBox notice={settingsNotice} />
        </section>

        <section className={card}>
          <h2 className="text-xl font-black uppercase">API keys</h2>
          <div>
            <span className="block font-mono text-xs font-black uppercase">Public key — safe in browser code</span>
            <div className="mt-1 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate border-2 border-pitch bg-white p-2 font-mono text-xs">{ws.publicKey}</code>
              <button type="button" onClick={() => copy(ws.publicKey, "pub")} className="border-2 border-pitch bg-white px-2 py-1.5 font-mono text-xs font-black">{copied === "pub" ? "Copied ✓" : "Copy"}</button>
            </div>
          </div>
          <div className="space-y-2">
            <span className="block font-mono text-xs font-black uppercase">Signing secret — server only</span>
            <p className="font-mono text-xs text-zinc-700">Your server uses it to verify offers (<code>BOOLBUL_SIGNING_SECRET</code>). It stays on our servers, is never sent to browsers, and is shown to you only once, right after you rotate.</p>
            {secret ? (
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all border-2 border-pitch bg-pitch p-2 font-mono text-xs text-lime">{secret}</code>
                <button type="button" onClick={() => copy(secret, "sec")} className="border-2 border-pitch bg-white px-2 py-1.5 font-mono text-xs font-black">{copied === "sec" ? "Copied ✓" : "Copy"}</button>
              </div>
            ) : confirmRotate ? (
              <div className="space-y-2 border-3 border-pitch bg-amber-100 p-3">
                <p className="font-mono text-xs font-bold">Rotating immediately invalidates the current secret. Offers will fail open (customers can still cancel) until your server has the new one.</p>
                <div className="flex gap-2">
                  <BrutalButton size="sm" variant="crimson" disabled={rotating} onClick={() => void rotate()}>{rotating ? "Rotating…" : "Yes, rotate now"}</BrutalButton>
                  <BrutalButton size="sm" variant="white" onClick={() => setConfirmRotate(false)}>Keep current</BrutalButton>
                </div>
              </div>
            ) : (
              <BrutalButton size="sm" variant="white" disabled={disabled} onClick={() => setConfirmRotate(true)}>Rotate & reveal new secret</BrutalButton>
            )}
            <NoticeBox notice={secretNotice} />
          </div>
        </section>

        <BillingSection />

        <section className={card}>
          <h2 className="text-xl font-black uppercase">Your data</h2>
          <div className="flex flex-wrap gap-2">
            <BrutalButton size="sm" variant="white" onClick={() => void exportJson()}>Export workspace (JSON)</BrutalButton>
            <a href="/api/workspace/ledger?format=csv"><BrutalButton size="sm" variant="white">Download ledger (CSV)</BrutalButton></a>
          </div>
          <p className="font-mono text-[11px] text-zinc-600">Exports never include secrets. The CSV holds up to 5,000 most recent sessions.</p>
        </section>
      </div>
    </main>
  );
}
