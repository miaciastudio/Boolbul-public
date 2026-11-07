"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** "First 100 SaaS founders" banner with a live count of approved seats. */
export function BetaBanner() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/beta/seats").then((r) => r.json()).then((d: { left?: number }) => {
      if (typeof d.left === "number") setLeft(d.left);
    }).catch(() => undefined);
  }, []);
  return (
    <Link href="/login?mode=apply"
      className="mx-auto mb-6 flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 border-3 border-pitch bg-lime p-2.5 text-center text-xs font-black uppercase tracking-wider text-pitch shadow-brutal transition-transform hover:-translate-y-0.5 md:text-sm">
      <span className="border border-pitch bg-crimson px-2 py-0.5 text-[11px] text-white">Invite-only beta</span>
      <span>First 100 SaaS founders: 3 months free</span>
      <span className="font-mono text-[11px] normal-case">No credit card · Zero dark patterns</span>
      {left !== null && <span className="bg-pitch px-2 py-0.5 font-mono text-[11px] text-lime">{left} of 100 spots left</span>}
      <span aria-hidden="true">→</span>
    </Link>
  );
}
