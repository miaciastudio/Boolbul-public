import type { ReactNode } from "react";

export function CompareTable({ them, rows }: { them: string; rows: [string, ReactNode, ReactNode][] }) {
  return (
    <div className="overflow-x-auto border-3 border-pitch shadow-brutal-sm">
      <table className="w-full min-w-[640px] border-collapse bg-white text-left font-mono text-sm">
        <thead>
          <tr className="bg-pitch text-cream">
            <th scope="col" className="p-3 font-black uppercase">&nbsp;</th>
            <th scope="col" className="p-3 font-black uppercase text-lime">BoolBul</th>
            <th scope="col" className="p-3 font-black uppercase">{them}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, ours, theirs]) => (
            <tr key={label} className="border-t-2 border-pitch align-top">
              <th scope="row" className="w-1/4 bg-cream p-3 font-black text-pitch">{label}</th>
              <td className="p-3">{ours}</td>
              <td className="p-3 text-zinc-700">{theirs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
