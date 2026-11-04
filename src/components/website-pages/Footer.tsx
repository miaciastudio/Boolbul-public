import React from "react";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="mt-20 pt-8 border-t-4 border-pitch flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
      <div className="flex items-center gap-2">
        <Image src="/brand/logo.png" alt="BoolBul" width={24} height={24} />
        <span className="font-bold">BOOLBUL.COM</span>
        <span className="text-zinc-500">— Native Retention Interceptor for Dodo Payments</span>
      </div>

      <div className="flex items-center gap-4 text-zinc-600">
        <span className="bg-lime px-2 py-0.5 border border-pitch text-pitch font-bold">
          100% Zero-Trust
        </span>
        <span>© {new Date().getFullYear()} BoolBul. No rights reserved for churning users.</span>
      </div>
    </footer>
  );
}

