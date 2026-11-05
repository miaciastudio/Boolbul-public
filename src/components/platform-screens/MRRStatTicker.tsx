import { BrutalCard } from "@/components/ui-primitives/BrutalCard";

interface MRRStatTickerProps {
  savedMRR: number;
  recoveredSubs: number;
  deflectionRate: number;
}

export function MRRStatTicker({ savedMRR, recoveredSubs, deflectionRate }: MRRStatTickerProps) {
  const metrics = [
    { label: "Recorded retained monthly value", value: `$${savedMRR.toLocaleString("en-US", { maximumFractionDigits: 2 })}` },
    { label: "Recorded rescue events", value: recoveredSubs.toLocaleString("en-US") },
    { label: "Rescue share of recent events", value: `${deflectionRate}%` },
  ];
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
      {metrics.map((metric) => (
        <BrutalCard key={metric.label} variant="cream" shadow="default" className="min-w-0 !p-4">
          <span className="font-mono text-xs font-bold text-zinc-600 uppercase block">{metric.label}</span>
          <span className="mt-2 block max-w-full break-words text-3xl xl:text-4xl font-black text-pitch">{metric.value}</span>
        </BrutalCard>
      ))}
    </div>
  );
}
