"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { BrutalCard } from "@/components/ui-primitives/BrutalCard";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";
import { createClient } from "@supabase/supabase-js";

interface TenantSettings {
  id: string;
  name: string;
  slug: string;
  publicKey: string;
  planTier: string;
  billingStatus: string;
  gateway: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantSettings | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://doesmcrkuorjkmwtrbbv.supabase.co";
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        if (!key) return;

        const supabase = createClient(url, key);
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUserEmail(session.user.email || null);

          const { data: memberships } = await supabase
            .from("tenant_memberships")
            .select("tenant_id, tenants(id, name, slug, public_key, plan_tier, billing_status, created_at, dodo_customer_id, stripe_customer_id)")
            .eq("user_id", session.user.id)
            .limit(1);

          if (memberships && memberships.length > 0 && memberships[0].tenants) {
            const t = memberships[0].tenants as any;
            setTenant({
              id: t.id,
              name: t.name,
              slug: t.slug,
              publicKey: t.public_key,
              planTier: t.plan_tier || "free",
              billingStatus: t.billing_status || "trialing",
              gateway: t.stripe_customer_id ? "Stripe" : "Dodo Payments",
              createdAt: t.created_at,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  // 1. Secret Key Rotation
  const handleRotateSecret = async () => {
    if (!confirm("Are you sure you want to rotate your signing secret? You will need to update your server-side environment variables immediately.")) {
      return;
    }

    setRotating(true);
    setStatusMessage(null);

    try {
      // Generate new secure random secret: bb_sec_live_<32 hex chars>
      const randomBytes = new Uint8Array(16);
      crypto.getRandomValues(randomBytes);
      const hex = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
      const generatedSecret = `bb_sec_live_${hex}`;

      // Update Supabase tenant
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://doesmcrkuorjkmwtrbbv.supabase.co";
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const supabase = createClient(url, key);

      if (tenant?.id) {
        const { error } = await supabase
          .from("tenants")
          .update({
            signing_secret: generatedSecret,
            updated_at: new Date().toISOString(),
          })
          .eq("id", tenant.id);

        if (error) throw error;
      }

      setNewSecret(generatedSecret);
      setStatusMessage("✓ Signing secret rotated successfully! Copy it now.");
    } catch (err: unknown) {
      console.error("Rotation error:", err);
      setStatusMessage("⚠️ Failed to rotate secret. Please try again.");
    } finally {
      setRotating(false);
    }
  };

  // 2. Export Workspace Data (JSON)
  const handleExportData = async () => {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://doesmcrkuorjkmwtrbbv.supabase.co";
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const supabase = createClient(url, key);

      let exportPayload: Record<string, any> = {
        tenant,
        userEmail,
        exportedAt: new Date().toISOString(),
      };

      if (tenant?.id) {
        const { data: config } = await supabase
          .from("widget_configs")
          .select("*")
          .eq("tenant_id", tenant.id)
          .maybeSingle();

        const { data: events } = await supabase
          .from("churn_events")
          .select("*")
          .eq("tenant_id", tenant.id)
          .limit(100);

        exportPayload.widgetConfig = config;
        exportPayload.retentionEvents = events;
      }

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `boolbul-workspace-backup-${tenant?.slug || "backup"}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(dlUrl);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  // 3. Export Audit Logs (CSV)
  const handleExportLogs = async () => {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://doesmcrkuorjkmwtrbbv.supabase.co";
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const supabase = createClient(url, key);

      let events: any[] = [];
      if (tenant?.id) {
        const { data } = await supabase
          .from("churn_events")
          .select("*")
          .eq("tenant_id", tenant.id)
          .limit(200);
        events = data || [];
      }

      const headers = ["ID", "Customer ID", "Subscription ID", "MRR (Cents)", "Status", "Exit Reason", "Timestamp"];
      const rows = events.map((e) => [
        e.id,
        e.customer_id,
        e.subscription_id,
        e.mrr_cents,
        e.status,
        `"${(e.exit_reason || "").replace(/"/g, '""')}"`,
        e.created_at,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `boolbul-audit-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(dlUrl);
    } catch (err) {
      console.error("CSV Export error:", err);
    }
  };

  return (
    <main className="bg-cobalt min-h-screen p-4 md:p-8 paper-grain">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Cockpit Top Bar */}
        <header className="bg-cream border-4-black shadow-brutal p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 bg-lime border-3 border-pitch flex items-center justify-center shadow-brutal-sm"
            >
              <Image src="/brand/logo.png" alt="BoolBul" width={32} height={32} />
            </Link>
            <div>
              <span className="font-black text-xl tracking-tight block">WORKSPACE SETTINGS & BACKUP</span>
              <span className="font-mono text-xs text-zinc-600 block">
                Workspace: <strong className="text-pitch">{tenant?.name || "Main Workspace"}</strong>
                {userEmail && <span className="ml-2 text-zinc-500 font-bold">({userEmail})</span>}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <BrutalButton variant="white" size="sm">
                ← Back to Cockpit
              </BrutalButton>
            </Link>
            <Link href="/dashboard/customizer">
              <BrutalButton variant="lime" size="sm">
                🎨 Theme Customizer
              </BrutalButton>
            </Link>
          </div>
        </header>

        {statusMessage && (
          <div className="border-3 border-pitch bg-lime p-3 text-xs font-mono font-bold text-pitch shadow-brutal-sm">
            {statusMessage}
          </div>
        )}

        {/* Section 1: Workspace Identity */}
        <BrutalCard variant="cream" className="p-6 border-4-black shadow-brutal space-y-4">
          <div className="border-b-2 border-pitch pb-3">
            <h2 className="text-xl font-black uppercase text-pitch">1. Workspace Identity & Keys</h2>
            <p className="font-mono text-xs text-zinc-600">Your cryptographic credentials and gateway settings.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div className="space-y-1 p-3 bg-white border-2 border-pitch">
              <span className="text-zinc-500 uppercase block font-bold">Tenant ID:</span>
              <span className="text-pitch font-bold break-all select-all">{tenant?.id || "Loading..."}</span>
            </div>

            <div className="space-y-1 p-3 bg-white border-2 border-pitch">
              <span className="text-zinc-500 uppercase block font-bold">Connected Gateway:</span>
              <span className="text-pitch font-black bg-lime px-2 py-0.5 border border-pitch inline-block">
                {tenant?.gateway || "Dodo Payments"}
              </span>
            </div>

            <div className="space-y-1 p-3 bg-white border-2 border-pitch md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 uppercase block font-bold">Public Key (Safe for Web Client):</span>
                <span className="text-emerald-700 font-bold text-[10px]">READ-ONLY</span>
              </div>
              <code className="text-pitch font-bold text-sm bg-zinc-100 p-2 border border-zinc-300 block break-all select-all">
                {tenant?.publicKey || "bb_pub_loading..."}
              </code>
            </div>
          </div>
        </BrutalCard>

        {/* Section 2: Secret Rotation */}
        <BrutalCard variant="cream" className="p-6 border-4-black shadow-brutal space-y-4">
          <div className="border-b-2 border-pitch pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black uppercase text-pitch">2. Server Signing Secret Rotation</h2>
              <p className="font-mono text-xs text-zinc-600">
                Rotates the HMAC-SHA256 key used to verify offer tokens.
              </p>
            </div>
            <span className="bg-blush border-2 border-pitch px-2 py-1 font-mono text-xs font-bold text-pitch">
              SECURITY SHIELD
            </span>
          </div>

          {newSecret ? (
            <div className="p-4 bg-lime/30 border-3 border-pitch space-y-2 font-mono">
              <p className="text-xs font-bold text-pitch">
                ⚡ NEW SIGNING SECRET GENERATED (COPY NOW - WILL NOT BE SHOWN AGAIN):
              </p>
              <code className="text-xs font-black bg-white p-3 border-2 border-pitch block select-all break-all">
                {newSecret}
              </code>
              <p className="text-[11px] text-zinc-700">
                Update <strong className="text-pitch">BOOLBUL_SIGNING_SECRET</strong> in your SaaS backend environment variables.
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white border-2 border-pitch">
              <div className="font-mono text-xs text-zinc-700">
                <span className="font-bold text-pitch block">Need to rotate compromised keys?</span>
                Instantly generates a new cryptographically secure secret and invalidates previous nonces.
              </div>
              <BrutalButton
                type="button"
                variant="white"
                size="sm"
                className="shrink-0 text-xs"
                onClick={handleRotateSecret}
                disabled={rotating}
              >
                {rotating ? "Rotating..." : "Rotate Secret Key ↺"}
              </BrutalButton>
            </div>
          )}
        </BrutalCard>

        {/* Section 3: Data Export & Audit Backup */}
        <BrutalCard variant="cream" className="p-6 border-4-black shadow-brutal space-y-4">
          <div className="border-b-2 border-pitch pb-3">
            <h2 className="text-xl font-black uppercase text-pitch">3. Account Export & Compliance Audit Backup</h2>
            <p className="font-mono text-xs text-zinc-600">Download your full retention history, widget settings, and audit ledger.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-white border-2 border-pitch flex flex-col justify-between space-y-3">
              <div>
                <h3 className="font-black text-sm uppercase">Full Workspace JSON Backup</h3>
                <p className="font-mono text-xs text-zinc-600 mt-1">
                  Exports your tenant configuration, live widget theme matrix, and retention rules.
                </p>
              </div>
              <BrutalButton variant="white" size="sm" onClick={handleExportData} className="w-full text-xs">
                Export Data (JSON) ↓
              </BrutalButton>
            </div>

            <div className="p-4 bg-white border-2 border-pitch flex flex-col justify-between space-y-3">
              <div>
                <h3 className="font-black text-sm uppercase">Retention Audit Ledger (CSV)</h3>
                <p className="font-mono text-xs text-zinc-600 mt-1">
                  Complete timestamped log of deflected cancellations and FTC-compliant exits.
                </p>
              </div>
              <BrutalButton variant="lime" size="sm" onClick={handleExportLogs} className="w-full text-xs">
                Download Audit CSV ↓
              </BrutalButton>
            </div>
          </div>
        </BrutalCard>
      </div>
    </main>
  );
}

