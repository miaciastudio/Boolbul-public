"use client";

import Link from "next/link";
import { useState } from "react";
import { THEMES, type Step, type ThemePreset } from "@boolbul/sdk";
import { BoolBulPreview } from "@boolbul/sdk/react";

/** The /demo page: the production widget in preview mode, across themes and devices. */
export function LiveDemo() {
  const [preset, setPreset] = useState<ThemePreset>("neo_brutalist");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [step, setStep] = useState<Step | undefined>(undefined);
  const [run, setRun] = useState(0);
  const restart = () => { setStep(undefined); setRun((n) => n + 1); };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="space-y-3 border-4-black bg-cream p-5 shadow-brutal sm:p-6">
        <Link href="/" className="font-mono text-xs font-bold underline">← BoolBul home</Link>
        <h1 className="text-3xl font-black uppercase leading-tight tracking-tight text-pitch sm:text-4xl">Try the real cancellation flow</h1>
        <p className="max-w-2xl font-mono text-sm leading-relaxed text-zinc-800">
          This is the exact widget your customers get — survey, reason-matched offers and a cancel link that&apos;s always one click away.
          It runs in demo mode here: nothing is charged, paused or cancelled.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-3 border-pitch bg-cream p-3 shadow-brutal-sm">
        <div className="flex flex-wrap border-3 border-pitch" role="group" aria-label="Theme">
          {(Object.keys(THEMES) as ThemePreset[]).map((id) => (
            <button key={id} type="button" aria-pressed={preset === id} onClick={() => { setPreset(id); restart(); }}
              className={`px-3 py-1.5 font-mono text-xs font-black uppercase ${preset === id ? "bg-pitch text-lime" : "bg-white"}`}>
              {THEMES[id].name}
            </button>
          ))}
        </div>
        <div className="flex border-3 border-pitch" role="group" aria-label="Device">
          {(["desktop", "mobile"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={viewport === v} onClick={() => { setViewport(v); restart(); }}
              className={`px-3 py-1.5 font-mono text-xs font-black uppercase ${viewport === v ? "bg-pitch text-lime" : "bg-white"}`}>
              {v === "desktop" ? "🖥 Desktop" : "📱 Mobile"}
            </button>
          ))}
        </div>
        <button type="button" onClick={restart} className="border-3 border-pitch bg-lime px-3 py-1.5 font-mono text-xs font-black uppercase shadow-brutal-sm">↺ Restart</button>
      </div>

      <div className="grid place-items-center border-4-black bg-[repeating-linear-gradient(45deg,#e7e2d3,#e7e2d3_10px,#efeadc_10px,#efeadc_20px)] p-3 shadow-brutal sm:p-8">
        <div className={viewport === "mobile"
          ? "relative h-[700px] w-[350px] max-w-full overflow-hidden rounded-[46px] border-[10px] border-pitch bg-white shadow-brutal"
          : "relative h-[640px] w-full max-w-[920px] overflow-hidden border-3 border-pitch bg-white shadow-brutal"}>
          <BoolBulPreview key={`${preset}-${viewport}-${run}`} viewport={viewport} step={step} planPriceCents={4900}
            config={{ themePreset: preset, mobileLayout: "sheet" }} style={{ position: "absolute", inset: 0 }} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["1. Ask why", "A one-tap exit survey. Reasons map straight to Dodo Payments and Stripe cancellation feedback."],
          ["2. Offer the right thing", "Too expensive? Discount first. Not using it? Pause first. Offers are signed at the edge."],
          ["3. Never trap anyone", "The cancel link is visible on every screen, high-contrast, one click. FTC click-to-cancel ready."],
        ].map(([title, text]) => (
          <div key={title} className="border-3 border-pitch bg-cream p-4 shadow-brutal-sm">
            <h2 className="font-black uppercase">{title}</h2>
            <p className="mt-1 font-mono text-sm text-zinc-800">{text}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-4-black bg-lime p-5 shadow-brutal">
        <p className="font-black uppercase text-pitch">Ready to add it to your app? Two lines of code.</p>
        <Link href="/login?mode=signup" className="border-3 border-pitch bg-pitch px-4 py-2 font-mono text-sm font-black uppercase text-lime shadow-brutal-sm">Start free →</Link>
      </div>
    </div>
  );
}
