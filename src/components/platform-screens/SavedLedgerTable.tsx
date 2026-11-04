import React from "react";
import Image from "next/image";
import { BrutalCard } from "@/components/ui-primitives/BrutalCard";

interface SavedRecord {
  id: string;
  customer: string;
  plan: string;
  mrr: number;
  reason: string;
  offer: string;
  date: string;
  status: "retained" | "active" | "saved";
}

export function SavedLedgerTable() {
  const records: SavedRecord[] = [
    {
      id: "sav_01",
      customer: "alex@vibe-stack.io",
      plan: "Pro Tier ($49/mo)",
      mrr: 49,
      reason: "Too expensive",
      offer: "50% Off (2 Months)",
      date: "12 mins ago",
      status: "saved",
    },
    {
      id: "sav_02",
      customer: "priya@indiedev.in",
      plan: "Starter ($19/mo)",
      mrr: 19,
      reason: "Not using right now",
      offer: "30-Day Pause",
      date: "1 hour ago",
      status: "retained",
    },
    {
      id: "sav_03",
      customer: "dev_marco@builder.co",
      plan: "Enterprise ($99/mo)",
      mrr: 99,
      reason: "Missing webhook feature",
      offer: "Beta Access + Roadmap",
      date: "3 hours ago",
      status: "saved",
    },
    {
      id: "sav_04",
      customer: "sarah@craftui.design",
      plan: "Pro Tier ($49/mo)",
      mrr: 49,
      reason: "Too expensive",
      offer: "30% Off (3 Months)",
      date: "Yesterday",
      status: "active",
    },
  ];

  return (
    <BrutalCard variant="cream" shadow="lg" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-3 border-pitch pb-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-pitch flex items-center gap-2">
            SAVED SUBSCRIBERS LEDGER
          </h2>
          <p className="font-mono text-xs text-zinc-600">
            Real-time feed of customers who hit &ldquo;Cancel&rdquo; but stayed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-crimson animate-ping"></span>
          <span className="font-mono text-xs font-black uppercase bg-lime px-2 py-0.5 border border-pitch">
            LIVE DODO WEBSOCKET
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b-2 border-pitch bg-white">
              <th className="p-3 font-black uppercase">Customer</th>
              <th className="p-3 font-black uppercase">Plan</th>
              <th className="p-3 font-black uppercase">Saved MRR</th>
              <th className="p-3 font-black uppercase">Exit Reason</th>
              <th className="p-3 font-black uppercase">Accepted Offer</th>
              <th className="p-3 font-black uppercase">Timing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-300">
            {records.map((r) => (
              <tr key={r.id} className="hover:bg-lime/10 transition-colors">
                <td className="p-3 font-bold text-pitch">{r.customer}</td>
                <td className="p-3 text-zinc-700">{r.plan}</td>
                <td className="p-3">
                  <span className="bg-lime px-1.5 py-0.5 border border-pitch font-black text-pitch">
                    +${r.mrr}
                  </span>
                </td>
                <td className="p-3 text-zinc-600 italic">&ldquo;{r.reason}&rdquo;</td>
                <td className="p-3 font-bold text-cobalt">{r.offer}</td>
                <td className="p-3 text-zinc-500">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BrutalCard>
  );
}

