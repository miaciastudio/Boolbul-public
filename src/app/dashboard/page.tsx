"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MRRStatTicker } from "@/components/platform-screens/MRRStatTicker";
import { RuleMatrixTuner } from "@/components/platform-screens/RuleMatrixTuner";
import { SavedLedgerTable } from "@/components/platform-screens/SavedLedgerTable";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";
import { createClient } from "@supabase/supabase-js";

interface TenantData {
  id: string;
  name: string;
  slug: string;
  publicKey: string;
  signingSecret: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);

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
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUserEmail(session.user.email || null);

          // Query tenant for this user
          const { data: memberships } = await supabase
            .from("tenant_memberships")
            .select("tenant_id, tenants(id, name, slug, public_key, signing_secret)")
            .eq("user_id", session.user.id)
            .limit(1);

          if (memberships && memberships.length > 0 && memberships[0].tenants) {
            const t = memberships[0].tenants as any;
            setTenant({
              id: t.id,
              name: t.name,
              slug: t.slug,
              publicKey: t.public_key,
              signingSecret: t.signing_secret,
            });
          } else {
            // Default workspace fallback
            const name = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Founder";
            setTenant({
              id: "t_demo_workspace",
              name: `${name}'s Workspace`,
              slug: "main-workspace",
              publicKey: "bb_pub_live_79a2f1c8e034",
              signingSecret: "bb_sec_live_99a8b1c4e782",
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
                {userEmail && <span className="ml-2 text-zinc-400">({userEmail})</span>}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Real-time MRR Counters */}
        <MRRStatTicker savedMRR={2840} recoveredSubs={47} deflectionRate={34.2} />

        {/* Live Offer Tuner */}
        <RuleMatrixTuner />

        {/* Saved Subscribers Feed */}
        <SavedLedgerTable />
      </div>
    </main>
  );
}
