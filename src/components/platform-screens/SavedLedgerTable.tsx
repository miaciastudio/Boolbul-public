import { BrutalCard } from "@/components/ui-primitives/BrutalCard";

export interface LedgerRecord {
  id: string;
  customer_id: string;
  subscription_id: string;
  mrr_cents: number;
  status: string;
  exit_reason: string | null;
  created_at: string;
}

export function SavedLedgerTable({ records }: { records: LedgerRecord[] }) {
  return (
    <BrutalCard variant="cream" shadow="lg" className="space-y-4 min-w-0">
      <div className="border-b-2 border-pitch pb-4">
        <h2 className="text-2xl font-black uppercase text-pitch">Retention activity</h2>
        <p className="font-mono text-xs text-zinc-600">Latest 50 recorded events. Refresh to load new activity.</p>
      </div>
      {records.length === 0 ? (
        <p className="font-mono text-sm py-6">No retention events yet. Finish your integration to begin recording activity.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <caption className="sr-only">Your workspace retention events, newest first</caption>
            <thead><tr className="border-b-2 border-pitch bg-white">
              <th scope="col" className="p-3">Customer</th><th scope="col" className="p-3">Monthly value</th>
              <th scope="col" className="p-3">Outcome</th><th scope="col" className="p-3">Reason</th><th scope="col" className="p-3">Recorded (UTC)</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-300">
              {records.map((record) => <tr key={record.id}>
                <td className="p-3 break-all">{record.customer_id}</td>
                <td className="p-3">${(record.mrr_cents / 100).toFixed(2)}</td>
                <td className="p-3">{record.status.replaceAll("_", " ")}</td>
                <td className="p-3">{record.exit_reason ?? "Not provided"}</td>
                <td className="p-3 whitespace-nowrap">{new Date(record.created_at).toISOString().replace("T", " ").slice(0, 16)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
    </BrutalCard>
  );
}
