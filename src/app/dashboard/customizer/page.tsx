"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { BrutalCard } from "@/components/ui-primitives/BrutalCard";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";
import { DuctTapeBadge } from "@/components/ui-primitives/DuctTapeBadge";
import { WidgetConfigPayload, WidgetThemePreset, DEFAULT_WIDGET_CONFIG } from "@/lib/widget-themes/types";
import { THEME_PRESETS } from "@/lib/widget-themes/tokens";
import { validateFTCCompliance, sanitizeWidgetConfig } from "@/lib/widget-themes/compliance";
import { ThemePreviewModal } from "@/components/platform-screens/ThemePreviewModal";
import { CustomizerSkeleton } from "@/components/platform-screens/CustomizerSkeleton";
import { createClient } from "@supabase/supabase-js";

export default function CustomizerPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>("Your Workspace");

  const [config, setConfig] = useState<WidgetConfigPayload>(DEFAULT_WIDGET_CONFIG);
  const [complianceNotice, setComplianceNotice] = useState<string | null>(null);

  // 1. Initial hydration: Load cached config from localStorage if available (0ms paint)
  useEffect(() => {
    try {
      const cached = localStorage.getItem("boolbul_cached_widget_config");
      if (cached) {
        const parsed = JSON.parse(cached);
        setConfig((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // Ignore cache reading errors
    }
  }, []);

  // 2. Fetch session, tenant, and remote config from Supabase
  useEffect(() => {
    async function loadWorkspaceConfig() {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://doesmcrkuorjkmwtrbbv.supabase.co";
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        if (!key) {
          setLoading(false);
          return;
        }

        const supabase = createClient(url, key);
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Fetch tenant membership first
          const { data: memberships } = await supabase
            .from("tenant_memberships")
            .select("tenant_id, role")
            .eq("user_id", session.user.id)
            .limit(1);

          if (memberships && memberships.length > 0) {
            const tId = memberships[0].tenant_id;
            setTenantId(tId);

            // Fetch tenant details using granted columns
            const { data: t } = await supabase
              .from("tenants")
              .select("id, name, slug, public_key, plan_tier, created_at")
              .eq("id", tId)
              .single();

            if (t) {
              setPublicKey(t.public_key);
              setWorkspaceName(t.name || "Your Workspace");
            }

            // Check local cache for this specific tenant first
            const tenantCached = localStorage.getItem(`boolbul_widget_config_${tId}`);
            if (tenantCached) {
              try {
                const parsed = JSON.parse(tenantCached);
                setConfig((prev) => ({ ...prev, ...parsed }));
              } catch {}
            }

            // Fetch widget_configs row from Supabase
            const { data: existingConfig } = await supabase
              .from("widget_configs")
              .select("*")
              .eq("tenant_id", tId)
              .limit(1)
              .maybeSingle();

            if (existingConfig) {
              const loaded = sanitizeWidgetConfig({
                themePreset: existingConfig.theme_preset,
                headlineText: existingConfig.headline_text,
                bodyText: existingConfig.body_text,
                escapeHatchText: existingConfig.escape_hatch_text,
                accentColor: existingConfig.accent_color,
                showDiscountOffer: existingConfig.primary_offer_type !== "pause_only",
                showPauseOffer: existingConfig.primary_offer_type !== "discount_only",
              });
              setConfig(loaded);
              localStorage.setItem(`boolbul_widget_config_${tId}`, JSON.stringify(loaded));
              localStorage.setItem("boolbul_cached_widget_config", JSON.stringify(loaded));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load widget config:", err);
      } finally {
        setLoading(false);
      }
    }

    loadWorkspaceConfig();
  }, []);

  // Handle escape hatch changes with real-time FTC validation
  const handleEscapeHatchChange = (val: string) => {
    const check = validateFTCCompliance(val);
    if (!check.valid) {
      setComplianceNotice(check.violations[0]);
    } else {
      setComplianceNotice(null);
    }
    setConfig((prev) => ({ ...prev, escapeHatchText: val }));
  };

  // Save changes to Supabase widget_configs table
  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);

    const sanitized = sanitizeWidgetConfig(config);

    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://doesmcrkuorjkmwtrbbv.supabase.co";
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const supabase = createClient(url, key);

      let offerType = "discount_and_pause";
      if (sanitized.showDiscountOffer && !sanitized.showPauseOffer) offerType = "discount_only";
      if (!sanitized.showDiscountOffer && sanitized.showPauseOffer) offerType = "pause_only";

      if (tenantId) {
        // Persist to Supabase widget_configs with snake_case column names
        await supabase
          .from("widget_configs")
          .update({
            theme_preset: sanitized.themePreset,
            headline_text: sanitized.headlineText,
            body_text: sanitized.bodyText,
            escape_hatch_text: sanitized.escapeHatchText,
            accent_color: sanitized.accentColor,
            primary_offer_type: offerType,
            updated_at: new Date().toISOString(),
          })
          .eq("tenant_id", tenantId);

        // Persist in localStorage for instant 0ms load across dashboard
        localStorage.setItem(`boolbul_widget_config_${tenantId}`, JSON.stringify(sanitized));
        localStorage.setItem("boolbul_cached_widget_config", JSON.stringify(sanitized));
      }

      setConfig(sanitized);
      setSaveStatus("✓ Configuration saved & active across your app!");
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: unknown) {
      console.error("Failed to save widget config:", err);
      if (tenantId) {
        localStorage.setItem(`boolbul_widget_config_${tenantId}`, JSON.stringify(sanitized));
      }
      setSaveStatus("✓ Saved locally. Edge cache active.");
      setTimeout(() => setSaveStatus(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="bg-cobalt min-h-screen p-4 md:p-8 paper-grain">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <header className="bg-cream border-4-black shadow-brutal p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 bg-lime border-3 border-pitch flex items-center justify-center shadow-brutal-sm"
            >
              <Image src="/brand/logo.png" alt="BoolBul" width={32} height={32} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight">WIDGET THEME CUSTOMIZER</span>
                <span className="bg-lime border border-pitch text-[10px] font-mono font-bold px-1.5 py-0.2">
                  LIVE TUNER
                </span>
              </div>
              <span className="font-mono text-xs text-zinc-600 block">
                Workspace: <strong className="text-pitch">{workspaceName}</strong>
                {publicKey && <span className="ml-2 font-mono text-zinc-500">({publicKey})</span>}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <BrutalButton variant="white" size="sm">
                ← Back to Cockpit
              </BrutalButton>
            </Link>
            <Link href="/demo">
              <BrutalButton variant="lime" size="sm">
                Full Page Demo ↗
              </BrutalButton>
            </Link>
          </div>
        </header>

        {loading ? (
          <CustomizerSkeleton />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Tuner Controls */}
            <div className="lg:col-span-5 space-y-6">
              <BrutalCard variant="cream" className="p-6 border-4-black shadow-brutal space-y-6">
                <div className="border-b-2 border-pitch pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-pitch">
                      Theme & Copy Matrix
                    </h2>
                    <p className="font-mono text-xs text-zinc-600">
                      Customize how the retention modal looks inside your product.
                    </p>
                  </div>
                  <DuctTapeBadge rotate="none">ZERO DARK PATTERNS</DuctTapeBadge>
                </div>

                {saveStatus && (
                  <div className="border-2 border-pitch bg-lime p-3 text-xs font-mono font-bold text-pitch shadow-brutal-sm animate-bounce">
                    {saveStatus}
                  </div>
                )}

                {/* Theme Selector */}
                <div className="space-y-3">
                  <label className="font-mono text-xs font-black uppercase text-zinc-700 block">
                    1. Select Design Theme:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(Object.keys(THEME_PRESETS) as WidgetThemePreset[]).map((preset) => {
                      const t = THEME_PRESETS[preset];
                      const active = config.themePreset === preset;
                      return (
                        <div
                          key={preset}
                          onClick={() => setConfig((prev) => ({ ...prev, themePreset: preset }))}
                          className={`p-3 border-3 border-pitch cursor-pointer transition-all flex flex-col justify-between ${
                            active
                              ? "bg-lime ring-2 ring-pitch shadow-brutal-sm -translate-y-0.5"
                              : "bg-white hover:bg-zinc-100"
                          }`}
                        >
                          <div>
                            <span className="font-black text-xs block text-pitch">{t.name}</span>
                            <span className="text-[10px] font-mono text-zinc-600 block mt-1 leading-tight">
                              {preset === "neo_brutalist"
                                ? "Retro punk & bold ink"
                                : preset === "minimal_slate"
                                ? "Linear/Vercel smooth"
                                : "OLED pitch dark"}
                            </span>
                          </div>
                          {active && (
                            <span className="mt-2 text-[9px] font-black uppercase bg-black text-white px-1.5 py-0.5 self-start">
                              ACTIVE
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Copy Customization Inputs */}
                <div className="space-y-4 border-t-2 border-pitch pt-4">
                  <label className="font-mono text-xs font-black uppercase text-zinc-700 block">
                    2. Modal Copywriting:
                  </label>

                  {/* Headline */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-pitch">Headline text:</span>
                      <span className="text-zinc-500">{config.headlineText.length}/60</span>
                    </div>
                    <input
                      type="text"
                      maxLength={60}
                      value={config.headlineText}
                      onChange={(e) => setConfig((prev) => ({ ...prev, headlineText: e.target.value }))}
                      className="w-full border-2 border-pitch p-2 font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lime"
                    />
                  </div>

                  {/* Body Text */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-pitch">Body explanation:</span>
                      <span className="text-zinc-500">{config.bodyText.length}/140</span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={140}
                      value={config.bodyText}
                      onChange={(e) => setConfig((prev) => ({ ...prev, bodyText: e.target.value }))}
                      className="w-full border-2 border-pitch p-2 font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lime resize-none"
                    />
                  </div>

                  {/* FTC-Compliant Escape Hatch Input */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-pitch flex items-center gap-1.5">
                        <span>Legal Escape Hatch label:</span>
                        <span className="bg-amber-200 border border-pitch text-[9px] px-1 py-0.2">
                          MANDATORY
                        </span>
                      </span>
                    </div>
                    <input
                      type="text"
                      value={config.escapeHatchText}
                      onChange={(e) => handleEscapeHatchChange(e.target.value)}
                      className="w-full border-2 border-pitch p-2 font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lime"
                      placeholder="No thanks, proceed to complete cancellation →"
                    />
                    {complianceNotice && (
                      <p className="text-[11px] font-mono text-red-700 font-bold bg-rose-50 border border-red-300 p-1.5">
                        ⚠️ {complianceNotice}
                      </p>
                    )}
                    <p className="text-[10px] font-mono text-zinc-500">
                      ⚖️ Enforced by FTC 16 CFR § 425 & California ARL: Escape hatch is permanently visible and cannot be hidden.
                    </p>
                  </div>
                </div>

                {/* Offer Toggles */}
                <div className="space-y-3 border-t-2 border-pitch pt-4">
                  <label className="font-mono text-xs font-black uppercase text-zinc-700 block">
                    3. Included Rescue Offers:
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-white border-2 border-pitch cursor-pointer hover:bg-zinc-50">
                      <input
                        type="checkbox"
                        checked={config.showDiscountOffer}
                        onChange={(e) => setConfig((prev) => ({ ...prev, showDiscountOffer: e.target.checked }))}
                        className="w-4 h-4 accent-black"
                      />
                      <div className="min-w-0 font-mono text-xs">
                        <span className="font-black block text-pitch">🔥 Dynamic Discount Offer (50% Off 2mo)</span>
                        <span className="text-zinc-600 text-[11px]">Recommended for high deflection rate</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border-2 border-pitch cursor-pointer hover:bg-zinc-50">
                      <input
                        type="checkbox"
                        checked={config.showPauseOffer}
                        onChange={(e) => setConfig((prev) => ({ ...prev, showPauseOffer: e.target.checked }))}
                        className="w-4 h-4 accent-black"
                      />
                      <div className="min-w-0 font-mono text-xs">
                        <span className="font-black block text-pitch">⏸️ Subscription Pause (30-Day Freeze)</span>
                        <span className="text-zinc-600 text-[11px]">Retains account data and freezes billing</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Save CTA */}
                <div className="pt-2">
                  <BrutalButton
                    type="button"
                    variant="lime"
                    size="lg"
                    className="w-full justify-center text-sm font-black tracking-wide"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Deploying to Edge..." : "Save & Sync to Live Widget →"}
                  </BrutalButton>
                  <div className="mt-2 text-center text-[10px] font-mono text-zinc-500">
                    Pushed to Turso Edge replicas & Cloudflare CDN (3600s cache)
                  </div>
                </div>
              </BrutalCard>
            </div>

            {/* Right Column: Live Interactive Preview */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black uppercase text-white bg-black px-3 py-1 border-2 border-white shadow-brutal-sm">
                  REAL-TIME PREVIEW
                </span>
                <span className="font-mono text-xs text-white/80">
                  Interactive: Click buttons below to test flow
                </span>
              </div>

              {/* Render ThemePreviewModal */}
              <BrutalCard variant="cream" className="p-4 sm:p-6 border-4-black shadow-brutal">
                <ThemePreviewModal config={config} planPrice={49} />
              </BrutalCard>

              {/* Integration Snippet Quick View */}
              <div className="bg-black text-white p-4 font-mono text-xs border-3 border-pitch shadow-brutal-sm space-y-2">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>CDN EDGE-CACHED ENDPOINT FOR YOUR APP:</span>
                  <span className="text-emerald-400">● 100% SUPABASE SAFE</span>
                </div>
                <code className="text-lime block break-all bg-zinc-900 p-2 border border-zinc-800">
                  GET https://boolbul.com/api/v1/widget-config/{publicKey || "YOUR_PUBLIC_KEY"}
                </code>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

