import Link from "next/link";
import Image from "next/image";
import { MRRStatTicker } from "@/components/platform-screens/MRRStatTicker";
import { RuleMatrixTuner } from "@/components/platform-screens/RuleMatrixTuner";
import { SavedLedgerTable } from "@/components/platform-screens/SavedLedgerTable";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";
import { requireDashboardContext } from "@/backend/supabase/session";

export const metadata = {
  title: "Cockpit Dashboard | BoolBul",
  description: "Live retention feed, saved MRR ledger, and rule tuner.",
};

export default async function DashboardPage() {
  const { tenant } = await requireDashboardContext();
  return (
    <main className="bg-cobalt min-h-screen p-4 md:p-8 paper-grain">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Cockpit Top Bar */}
        <div className="bg-cream border-4-black shadow-brutal p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 bg-lime border-3 border-pitch flex items-center justify-center shadow-brutal-sm">
              <Image src="/brand/logo.png" alt="BoolBul" width={32} height={32} />
            </Link>
            <div>
              <span className="font-black text-xl tracking-tight block">
                BOOLBUL COCKPIT
              </span>
              <span className="font-mono text-xs text-zinc-600 block -mt-1">
                Workspace: <strong className="text-pitch">{tenant.name}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/onboarding">
              <BrutalButton variant="white" size="sm">
                ⚙️ Setup Wizard
              </BrutalButton>
            </Link>
            <Link href="/">
              <BrutalButton variant="lime" size="sm">
                Landing Page →
              </BrutalButton>
            </Link>
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

