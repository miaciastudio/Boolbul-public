"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Catches render errors on any page so visitors never see a blank screen. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[boolbul] page error", { digest: error.digest }); }, [error]);
  return (
    <main className="grid min-h-screen place-items-center bg-cobalt p-4 paper-grain">
      <section role="alert" className="max-w-lg space-y-4 border-4-black bg-cream p-8 shadow-brutal">
        <h1 className="text-2xl font-black uppercase">Something broke on our side</h1>
        <p className="font-mono text-sm">Nothing was charged or cancelled. Try again, or head back home.{error.digest ? ` (ref ${error.digest})` : ""}</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="border-3 border-pitch bg-lime px-4 py-2 font-black uppercase shadow-brutal-sm">Try again</button>
          <Link href="/" className="border-3 border-pitch bg-white px-4 py-2 font-black uppercase shadow-brutal-sm">Home</Link>
        </div>
        <p className="font-mono text-xs text-zinc-600">Still stuck? <a className="underline" href="mailto:hello@boolbul.com">hello@boolbul.com</a></p>
      </section>
    </main>
  );
}
