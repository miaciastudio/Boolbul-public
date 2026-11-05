"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MRRStatTicker } from "@/components/platform-screens/MRRStatTicker";
import { RuleMatrixTuner } from "@/components/platform-screens/RuleMatrixTuner";
import { SavedLedgerTable, type LedgerRecord } from "@/components/platform-screens/SavedLedgerTable";
import { BillingPanel } from "@/components/platform-screens/BillingPanel";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";
import { createClient } from "@supabase/supabase-js";

interface TenantData {
  id: string;
  name: string;
  slug: string;
  publicKey: string;
  planTier: string;
  billingStatus: string;
  billingMode: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [records, setRecords] = useState<LedgerRecord[]>([]);

  useEffect(() => {
    async function loadSession() {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://doesmcrkuorjkmwtrbbv.supabase.co";
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        if (!key) {
          setLoading(false);
          return;
        }

        const supabase = createClient(url, key);

        // Supabase client auto-parses implicit hash tokens (#access_token=...)
        const { data: { session } } = await supabase.auth.getSession();

        // If URL has tokens in the hash fragment, remove them from the address bar for security
        if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
          window.history.replaceState(null, "", window.location.pathname);
        }

        if (session?.user) {
          setUserEmail(session.user.email || null);

          // Query tenant for this user
          const { data: memberships } = await supabase
            .from("tenant_memberships")
            .select("tenant_id, tenants(id, name, slug, public_key, plan_tier, billing_status, billing_mode)")
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
              billingMode: t.billing_mode || "test_mode",
            });

            // Fetch retention records
            const { data: churnRecords } = await supabase
              .from("churn_events")
              .select("id, customer_id, subscription_id, mrr_cents, status, exit_reason, created_at")
              .eq("tenant_id", t.id)
              .order("created_at", { ascending: false })
              .limit(50);

            if (churnRecords) {
              setRecords(churnRecords as LedgerRecord[]);
            }
          } else {
            // Default workspace fallback
            const name = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Founder";
            setTenant({
              id: "t_demo_workspace",
              name: `${name}'s Workspace`,
              slug: "main-workspace",
              publicKey: "bb_pub_live_79a2f1c8e034",
              planTier: "free",
              billingStatus: "trialing",
              billingMode: "test_mode",
            });
          }
        }
      } catch (err) {
        console.error("Failed to load dashboard session:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, []);

  const handleSignOut = async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://doesmcrkuorjkmwtrbbv.supabase.co";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (key) {
      const supabase = createClient(url, key);
      await supabase.auth.signOut();
    }
    window.location.href = "/login";
  };

  const saved = records.filter((r) => r.status === "rescued_discount" || r.status === "rescued_pause");
  const savedMRR = saved.reduce((sum, r) => sum + r.mrr_cents, 0) / 100;
  const deflectionRate = records.length ? Math.round((saved.length / records.length) * 1000) / 10 : 0;

  return (
    <main className="bg-cobalt min-h-screen p-4 md:p-8 paper-grain">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Cockpit Top Bar */}
        <div className="bg-cream border-4-black shadow-brutal p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 bg-lime border-3 border-pitch flex items-center justify-center shadow-brutal-sm"
            >
              <Image src="/brand/logo.png" alt="BoolBul" width={32} height={32} />
            </Link>
            <div>
              <span className="font-black text-xl tracking-tight block">
                BOOLBUL COCKPIT
              </span>
              <span className="font-mono text-xs text-zinc-600 block -mt-1">
                Workspace: <strong className="text-pitch">{tenant?.name || "Production Cockpit"}</strong>
                {userEmail && <span className="ml-2 text-zinc-500 font-bold">({userEmail})</span>}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/onboarding">
              <BrutalButton variant="white" size="sm">
                ⚙️ Setup Wizard
              </BrutalButton>
            </Link>
            {userEmail ? (
              <BrutalButton variant="cream" size="sm" onClick={handleSignOut}>
                Sign Out
              </BrutalButton>
            ) : (
              <Link href="/login">
                <BrutalButton variant="lime" size="sm">
                  Sign In →
                </BrutalButton>
              </Link>
            )}
          </div>
        </div>

        {/* Commercial Billing Panel */}
        <BillingPanel
          plan={tenant?.planTier || "free"}
          status={tenant?.billingStatus || "trialing"}
          mode={tenant?.billingMode || "test_mode"}
          canManage={true}
        />

        {/* Real Retention Metric Ticker */}
        <MRRStatTicker
          savedMRR={savedMRR}
          recoveredSubs={saved.length}
          deflectionRate={deflectionRate}
        />

        {/* Live Rule Matrix Tuner */}
        <RuleMatrixTuner />

        {/* Retention Events Activity Feed */}
        <SavedLedgerTable records={records} />
      </div>
    </main>
  );
}
