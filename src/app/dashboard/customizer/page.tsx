"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  checkCompliance, DEFAULT_CONFIG, DEFAULT_REASONS, normalizeConfig, REASON_IDS, THEMES,
  type OfferMode, type ReasonId, type Step, type ThemePreset, type WidgetConfig,
} from "@boolbul/sdk";
import { BoolBulPreview } from "@boolbul/sdk/react";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";

const REASON_LABELS: Record<ReasonId, string> = {
  too_expensive: "It's too expensive",
  unused: "I'm not using it enough",
  missing_features: "It's missing features I need",
  switched_service: "I'm switching to another tool",
  customer_service: "Support didn't help me",
  low_quality: "Quality wasn't good enough",
  too_complex: "It's too complicated",
  other: "Something else",
};
const OFFER_MODES: { id: OfferMode; label: string }[] = [
  { id: "discount_and_pause", label: "Discount + pause" },
  { id: "discount_only", label: "Discount only" },
  { id: "pause_only", label: "Pause only" },
  { id: "survey_only", label: "Survey only (no offers)" },
];
const SWATCHES = ["#CCFF00", "#2B4CFF", "#FF5A1F", "#10B981", "#E11D48", "#A855F7", "#0A0A0A"];

type LoadState = "loading" | "ready" | "error";

const field = "w-full border-2 border-pitch bg-white p-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-lime";
const label = "mb-1 block font-mono text-xs font-black uppercase text-pitch";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-3 border-pitch bg-cream p-4 shadow-brutal-sm">
      <h2 className="font-mono text-sm font-black uppercase tracking-wide text-pitch">{title}</h2>
      {children}
    </section>
  );
}

export default function CustomizerPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [saved, setSaved] = useState<WidgetConfig>(DEFAULT_CONFIG);
  const [draft, setDraft] = useState<WidgetConfig>(DEFAULT_CONFIG);
  const [canManage, setCanManage] = useState(false);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [step, setStep] = useState<Step>("survey");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/workspace/widget", { cache: "no-store" });
      if (res.status === 401) { window.location.assign("/login?error=session_expired&next=/dashboard/customizer"); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const config = normalizeConfig(data.config);
      setSaved(config);
      setDraft(config);
      setCanManage(Boolean(data.canManage));
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const normalized = useMemo(() => normalizeConfig(draft), [draft]);
  const report = useMemo(() => checkCompliance(normalized), [normalized]);
  const dirty = JSON.stringify(normalized) !== JSON.stringify(saved);
  const labelReset = draft.escapeHatchText.trim() !== normalized.escapeHatchText;
  const set = <K extends keyof WidgetConfig>(key: K, value: WidgetConfig[K]) => { setDraft((d) => ({ ...d, [key]: value })); setMessage(null); };

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/workspace/widget", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config: normalized }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Save failed");
      const config = normalizeConfig(data.config);
      setSaved(config);
      setDraft(config);
      setMessage({ kind: "ok", text: "Saved. Your customers will see this within about a minute." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const toggleReason = (id: ReasonId) => {
    const exists = draft.surveyReasons.some((r) => r.id === id);
    if (exists && draft.surveyReasons.length === 1) return;
    set("surveyReasons", exists ? draft.surveyReasons.filter((r) => r.id !== id)
      : [...draft.surveyReasons, { id, label: REASON_LABELS[id] }].sort((a, b) => REASON_IDS.indexOf(a.id) - REASON_IDS.indexOf(b.id)));
  };

  if (state === "loading") {
    return <main className="grid min-h-screen place-items-center bg-cobalt paper-grain font-mono font-black text-cream">Loading your widget…</main>;
  }
  if (state === "error") {
    return (
      <main className="grid min-h-screen place-items-center bg-cobalt p-4 paper-grain">
        <div className="max-w-md space-y-4 border-4-black bg-cream p-6 text-center shadow-brutal">
          <h1 className="text-2xl font-black uppercase">Couldn&apos;t load your widget</h1>
          <p className="font-mono text-sm">Nothing was changed. Check your connection and try again.</p>
          <BrutalButton onClick={() => void load()}>Retry</BrutalButton>
        </div>
      </main>
    );
  }

  const disabled = !canManage;
  return (
    <main className="min-h-screen bg-cobalt p-3 paper-grain sm:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 border-4-black bg-cream p-4 shadow-brutal">
          <div className="min-w-0">
            <Link href="/dashboard" className="font-mono text-xs font-bold underline">← Dashboard</Link>
            <h1 className="text-2xl font-black uppercase tracking-tight text-pitch sm:text-3xl">Widget customizer</h1>
            <p className="font-mono text-xs text-zinc-700">What you see on the right is exactly what your customers get — same code, same pixels.</p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && <span className="border-2 border-pitch bg-amber-200 px-2 py-1 font-mono text-xs font-black">UNSAVED</span>}
            <BrutalButton variant="white" size="sm" disabled={!dirty || saving} onClick={() => setDraft(saved)}>Reset</BrutalButton>
            <BrutalButton size="sm" disabled={!dirty || saving || disabled} onClick={() => void save()}>{saving ? "Saving…" : "Save & publish"}</BrutalButton>
          </div>
        </header>

        {message && (
          <div role={message.kind === "error" ? "alert" : "status"}
            className={`border-3 border-pitch p-3 font-mono text-sm font-bold shadow-brutal-sm ${message.kind === "ok" ? "bg-lime" : "bg-rose-100 text-red-900"}`}>
            {message.kind === "ok" ? "✓ " : "⚠️ "}{message.text}
          </div>
        )}
        {disabled && (
          <div className="border-3 border-pitch bg-amber-100 p-3 font-mono text-sm font-bold">You have view-only access. Ask a workspace owner or admin to make changes.</div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <fieldset disabled={disabled} className="min-w-0 space-y-4">
            <Section title="Theme">
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(THEMES) as ThemePreset[]).map((preset) => {
                  const t = THEMES[preset];
                  const active = draft.themePreset === preset;
                  return (
                    <button key={preset} type="button" aria-pressed={active}
                      onClick={() => setDraft((d) => ({ ...d, themePreset: preset, accentColor: t.accentDefault, borderRadius: t.radius }))}
                      className={`border-3 border-pitch p-2 text-left transition ${active ? "bg-lime shadow-brutal-sm" : "bg-white hover:-translate-y-0.5"}`}>
                      <span className="mb-2 flex h-10 items-end gap-1 border-2 border-pitch p-1" style={{ background: t.bg }}>
                        <span className="h-3 w-8" style={{ background: t.accentDefault, borderRadius: t.radius / 3 }} />
                        <span className="h-2 w-10" style={{ background: t.text, opacity: 0.8 }} />
                      </span>
                      <span className="block font-mono text-xs font-black uppercase">{t.name}</span>
                    </button>
                  );
                })}
              </div>
              <div>
                <label className={label} htmlFor="accent">Accent color</label>
                <div className="flex items-center gap-2">
                  <input id="accent" type="color" value={draft.accentColor} onChange={(e) => set("accentColor", e.target.value.toUpperCase())}
                    className="h-11 w-14 cursor-pointer border-2 border-pitch bg-white" />
                  <input aria-label="Accent hex" value={draft.accentColor} maxLength={7} onChange={(e) => set("accentColor", e.target.value)} className={field} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SWATCHES.map((color) => (
                    <button key={color} type="button" aria-label={`Use ${color}`} onClick={() => set("accentColor", color)}
                      className="h-7 w-7 border-2 border-pitch" style={{ background: color }} />
                  ))}
                </div>
              </div>
              <div>
                <label className={label} htmlFor="radius">Corner radius: {draft.borderRadius}px</label>
                <input id="radius" type="range" min={0} max={32} value={draft.borderRadius} onChange={(e) => set("borderRadius", Number(e.target.value))} className="w-full accent-black" />
              </div>
            </Section>

            <Section title="Copy">
              <div>
                <label className={label} htmlFor="headline">Headline</label>
                <input id="headline" maxLength={120} value={draft.headline} onChange={(e) => set("headline", e.target.value)} className={field} />
              </div>
              <div>
                <label className={label} htmlFor="body">Message</label>
                <textarea id="body" maxLength={400} rows={3} value={draft.body} onChange={(e) => set("body", e.target.value)} className={field} />
              </div>
              <div>
                <label className={label} htmlFor="escape">Cancel button label</label>
                <input id="escape" maxLength={80} value={draft.escapeHatchText} onChange={(e) => set("escapeHatchText", e.target.value)} className={field} />
                <p className={`mt-1 font-mono text-[11px] ${labelReset ? "font-bold text-red-800" : "text-zinc-600"}`}>
                  {labelReset
                    ? `Must clearly say "cancel" and can't shame the customer — customers will see "${normalized.escapeHatchText}".`
                    : "Always visible, one click, never hidden (FTC click-to-cancel)."}
                </p>
              </div>
              <div>
                <label className={label} htmlFor="success">Success message</label>
                <input id="success" maxLength={160} value={draft.successText} onChange={(e) => set("successText", e.target.value)} className={field} />
              </div>
            </Section>

            <Section title="Offers & survey">
              <div>
                <label className={label} htmlFor="mode">Offers to show</label>
                <select id="mode" value={draft.offerMode} onChange={(e) => set("offerMode", e.target.value as OfferMode)} className={field}>
                  {OFFER_MODES.map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}
                </select>
                <p className="mt-1 font-mono text-[11px] text-zinc-600">Discount size and pause length are set in the dashboard&apos;s Offer Tuner.</p>
              </div>
              <label className="flex items-center gap-2 font-mono text-sm font-bold">
                <input type="checkbox" checked={draft.surveyEnabled} onChange={(e) => set("surveyEnabled", e.target.checked)} className="h-5 w-5 accent-black" />
                Ask why they&apos;re leaving (exit survey)
              </label>
              {draft.surveyEnabled && (
                <div className="space-y-2">
                  {REASON_IDS.map((id) => {
                    const current = draft.surveyReasons.find((r) => r.id === id);
                    return (
                      <div key={id} className="flex items-center gap-2">
                        <input type="checkbox" aria-label={`Show reason ${REASON_LABELS[id]}`} checked={!!current} onChange={() => toggleReason(id)} className="h-5 w-5 shrink-0 accent-black" />
                        <input aria-label={`Label for ${id}`} disabled={!current} maxLength={60} value={current?.label ?? REASON_LABELS[id]}
                          onChange={(e) => set("surveyReasons", draft.surveyReasons.map((r) => r.id === id ? { ...r, label: e.target.value } : r))}
                          className={`${field} !p-1.5 disabled:opacity-50`} />
                      </div>
                    );
                  })}
                  <p className="font-mono text-[11px] text-zinc-600">Reasons map straight to Dodo Payments and Stripe cancellation feedback.</p>
                  <button type="button" className="font-mono text-xs font-bold underline" onClick={() => set("surveyReasons", DEFAULT_REASONS)}>Restore default reasons</button>
                </div>
              )}
            </Section>

            <Section title="Layout & brand">
              <div>
                <span className={label}>On phones, show as</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["sheet", "modal"] as const).map((layout) => (
                    <button key={layout} type="button" aria-pressed={draft.mobileLayout === layout} onClick={() => { set("mobileLayout", layout); setViewport("mobile"); }}
                      className={`border-3 border-pitch p-2 font-mono text-xs font-black uppercase ${draft.mobileLayout === layout ? "bg-lime" : "bg-white"}`}>
                      {layout === "sheet" ? "Bottom sheet" : "Center modal"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={label} htmlFor="logo">Logo URL (https, optional)</label>
                <input id="logo" placeholder="https://your-app.com/logo.svg" value={draft.logoUrl ?? ""} onChange={(e) => set("logoUrl", e.target.value || null)} className={field} />
                {draft.logoUrl && !normalized.logoUrl && <p className="mt-1 font-mono text-[11px] font-bold text-red-800">Use a full https:// image URL.</p>}
              </div>
              <label className="flex items-center gap-2 font-mono text-sm font-bold">
                <input type="checkbox" checked={draft.showBranding} onChange={(e) => set("showBranding", e.target.checked)} className="h-5 w-5 accent-black" />
                Show &quot;Powered by BoolBul&quot;
              </label>
            </Section>
          </fieldset>

          <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
            <div className="space-y-3 border-4-black bg-cream p-3 shadow-brutal sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex border-3 border-pitch" role="group" aria-label="Preview device">
                  {(["desktop", "mobile"] as const).map((v) => (
                    <button key={v} type="button" aria-pressed={viewport === v} onClick={() => setViewport(v)}
                      className={`px-3 py-1.5 font-mono text-xs font-black uppercase ${viewport === v ? "bg-pitch text-lime" : "bg-white"}`}>
                      {v === "desktop" ? "🖥 Desktop" : "📱 Mobile"}
                    </button>
                  ))}
                </div>
                <div className="flex border-3 border-pitch" role="group" aria-label="Preview step">
                  {(["survey", "offers", "success"] as const).map((s) => (
                    <button key={s} type="button" aria-pressed={step === s} onClick={() => setStep(s)}
                      className={`px-2.5 py-1.5 font-mono text-xs font-black uppercase ${step === s ? "bg-pitch text-lime" : "bg-white"}`}>{s}</button>
                  ))}
                </div>
              </div>

              <div className="grid place-items-center overflow-hidden border-3 border-pitch bg-[repeating-linear-gradient(45deg,#e7e2d3,#e7e2d3_10px,#efeadc_10px,#efeadc_20px)] p-3 sm:p-6">
                <div className={viewport === "mobile"
                  ? "relative h-[680px] w-[340px] max-w-full overflow-hidden rounded-[44px] border-[10px] border-pitch bg-white shadow-brutal"
                  : "relative h-[600px] w-full max-w-[860px] overflow-hidden border-3 border-pitch bg-white shadow-brutal"}>
                  {viewport === "desktop" && (
                    <div className="flex h-8 items-center gap-1.5 border-b-2 border-pitch bg-zinc-100 px-3">
                      <span className="h-3 w-3 rounded-full bg-rose-400" /><span className="h-3 w-3 rounded-full bg-amber-300" /><span className="h-3 w-3 rounded-full bg-emerald-400" />
                      <span className="ml-3 truncate font-mono text-[10px] text-zinc-500">your-app.com/settings/billing</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 top-8 p-5 font-mono text-xs text-zinc-400" aria-hidden="true" style={viewport === "mobile" ? { top: 0, paddingTop: 48 } : undefined}>
                    <div className="mb-3 h-4 w-32 rounded bg-zinc-200" />
                    <div className="mb-2 h-3 w-3/4 rounded bg-zinc-100" />
                    <div className="mb-6 h-3 w-1/2 rounded bg-zinc-100" />
                    <div className="h-24 rounded border border-zinc-200" />
                  </div>
                  <BoolBulPreview key={viewport} config={normalized} viewport={viewport} step={step}
                    style={{ position: "absolute", inset: viewport === "desktop" ? "32px 0 0 0" : 0 }} />
                </div>
              </div>

              <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 border-3 border-pitch p-2 font-mono text-xs font-bold ${report.ok ? "bg-lime" : "bg-rose-100 text-red-900"}`}>
                <span>{report.ok ? "✓ FTC + WCAG AA compliant" : "⚠️ Needs attention"}</span>
                <span>Cancel link contrast {report.escapeHatchContrast.toFixed(1)}:1</span>
                <span>Button contrast {report.accentContrast.toFixed(1)}:1</span>
                {report.issues.map((issue) => <span key={issue}>{issue}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
