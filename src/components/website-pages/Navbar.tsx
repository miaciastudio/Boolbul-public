import React from "react";
import Image from "next/image";
import Link from "next/link";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";

export function Navbar() {
  return (
    <header className="max-w-6xl mx-auto flex items-center justify-between border-b-4 border-pitch pb-6 mb-8">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="w-12 h-12 bg-lime border-3 border-pitch flex items-center justify-center shadow-brutal-sm group-hover:rotate-6 transition-transform">
          <Image
            src="/brand/logo.png"
            alt="BoolBul"
            width={40}
            height={40}
            className="object-contain"
          />
        </div>
        <div>
          <span className="text-3xl md:text-4xl font-black tracking-tight flex items-center">
            BOOLBUL<span className="text-crimson">.</span>
          </span>
          <span className="block text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-700 -mt-1">
            The Retention Interceptor
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link href="/docs">
          <BrutalButton variant="white" size="sm">
            📖 Docs
          </BrutalButton>
        </Link>
        <Link href="/demo">
          <BrutalButton variant="white" size="sm">
            🎬 Live Demo
          </BrutalButton>
        </Link>
        <Link href="/login?next=/dashboard">
          <BrutalButton variant="lime" size="sm">
            Launch Cockpit →
          </BrutalButton>
        </Link>
      </div>
    </header>
  );
}

