"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";

const DOCS_NAV = [
  {
    category: "GETTING STARTED",
    items: [
      { href: "/docs", label: "Overview & Architecture" },
      { href: "/docs/quickstart", label: "5-Min Quickstart" },
    ],
  },
  {
    category: "INTEGRATION",
    items: [
      { href: "/docs/client-sdk", label: "Client SDK & Modal" },
      { href: "/docs/webhooks", label: "Billing Webhooks & Dodo" },
    ],
  },
  {
    category: "LEGAL & COMPLIANCE",
    items: [
      { href: "/docs/ftc-compliance", label: "FTC Click-to-Cancel" },
    ],
  },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNav = DOCS_NAV.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-cobalt paper-grain">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-cream border-b-4 border-pitch p-3 sm:p-4 shadow-brutal flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-lime border-2 border-pitch flex items-center justify-center shadow-brutal-sm group-hover:rotate-6 transition-transform">
              <Image src="/brand/logo.png" alt="BoolBul" width={28} height={28} />
            </div>
            <span className="font-black text-xl tracking-tight">
              BOOLBUL <span className="bg-lime px-1.5 py-0.2 border border-pitch text-xs font-mono">DOCS</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/demo">
            <BrutalButton variant="white" size="sm">
              🎬 Live Demo
            </BrutalButton>
          </Link>
          <Link href="/dashboard">
            <BrutalButton variant="lime" size="sm">
              Open Cockpit →
            </BrutalButton>
          </Link>
        </div>
      </header>

      {/* Docs Body Grid */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Nav */}
        <aside className="lg:col-span-3 bg-cream border-4-black shadow-brutal p-4 sm:p-5 space-y-5 sticky top-24">
          {/* Search Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-600">
              <span>SEARCH DOCS</span>
              <span className="text-[10px] bg-zinc-200 border border-pitch px-1">Ctrl + K</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guides, SDK, hooks..."
              className="w-full border-2 border-pitch p-2 font-mono text-xs bg-white focus:outline-none focus:ring-2 focus:ring-lime"
            />
          </div>

          {/* Navigation Links */}
          <nav className="space-y-4">
            {filteredNav.map((cat) => (
              <div key={cat.category} className="space-y-1.5">
                <span className="font-mono text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
                  {cat.category}
                </span>
                <ul className="space-y-1">
                  {cat.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`block px-3 py-1.5 font-mono text-xs font-bold transition-all border-2 ${
                            active
                              ? "bg-lime border-pitch shadow-brutal-sm text-pitch font-black"
                              : "border-transparent text-zinc-700 hover:border-pitch hover:bg-white"
                          }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="pt-3 border-t-2 border-pitch text-[11px] font-mono text-zinc-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-pitch">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
              <span>Edge API: 100% Operational</span>
            </div>
            <p>Turso LibSQL edge replicas deployed in 6 global regions.</p>
          </div>
        </aside>

        {/* Content Area */}
        <article className="lg:col-span-9 bg-cream border-4-black shadow-brutal p-6 sm:p-10 space-y-8">
          {children}
        </article>
      </div>
    </div>
  );
}

