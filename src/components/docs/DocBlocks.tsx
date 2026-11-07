import type { ReactNode } from "react";
import { DuctTapeBadge } from "@/components/ui-primitives/DuctTapeBadge";

export function DocHeader({ badge, title, intro }: { badge: string; title: string; intro: ReactNode }) {
  return (
    <div className="space-y-2 border-b-3 border-pitch pb-4">
      <DuctTapeBadge rotate="none">{badge}</DuctTapeBadge>
      <h1 className="text-3xl font-black uppercase tracking-tight text-pitch sm:text-4xl">{title}</h1>
      <div className="font-mono text-sm leading-relaxed text-zinc-700">{intro}</div>
    </div>
  );
}

export function DocStep({ n, title, children }: { n?: number; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t-2 border-pitch pt-5">
      <h2 className="flex items-center gap-2 text-lg font-black uppercase text-pitch">
        {n !== undefined && <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-black font-mono text-xs text-white">{n}</span>}
        {title}
      </h2>
      <div className="space-y-3 font-mono text-sm leading-relaxed text-zinc-800">{children}</div>
    </section>
  );
}

export function Code({ children, label }: { children: string; label?: string }) {
  return (
    <div className="overflow-hidden border-3 border-pitch shadow-brutal-sm">
      {label && <div className="border-b-2 border-pitch bg-lime px-3 py-1 font-mono text-[11px] font-black uppercase">{label}</div>}
      <pre className="max-w-full overflow-x-auto bg-pitch p-4 font-mono text-xs leading-relaxed text-lime"><code>{children}</code></pre>
    </div>
  );
}

export function Callout({ tone = "info", children }: { tone?: "info" | "warn"; children: ReactNode }) {
  return (
    <div className={`border-3 border-pitch p-3 font-mono text-xs leading-relaxed shadow-brutal-sm ${tone === "warn" ? "bg-amber-100" : "bg-cream"}`}>
      {children}
    </div>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto border-3 border-pitch">
      <table className="w-full min-w-[520px] border-collapse bg-white font-mono text-xs">
        <thead className="bg-lime"><tr>{head.map((h) => <th key={h} className="border-b-2 border-pitch p-2 text-left font-black uppercase">{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i} className="border-t border-zinc-300 align-top">{row.map((cell, j) => <td key={j} className="p-2">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export const C = ({ children }: { children: ReactNode }) => <code className="bg-zinc-200 px-1 font-bold text-pitch">{children}</code>;
