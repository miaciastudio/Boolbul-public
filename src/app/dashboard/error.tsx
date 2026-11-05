"use client";

import Link from "next/link";

export default function DashboardError({ reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section role="alert" className="bg-cream border-4-black shadow-brutal max-w-lg mx-auto my-12 p-8 space-y-4">
      <h1 className="font-black text-2xl">We couldn&apos;t load your dashboard.</h1>
      <p className="font-mono text-sm">Please try again. If the problem continues, sign in again or contact support.</p>
      <button type="button" onClick={reset} className="bg-lime border-2 border-pitch px-4 py-2 font-bold">Try again</button>
      <Link href="/login" className="block text-sm underline">Return to sign in</Link>
    </section>
  );
}
