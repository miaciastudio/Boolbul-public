import React from "react";
import Image from "next/image";
import Link from "next/link";
import { BrutalCard } from "@/components/ui-primitives/BrutalCard";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";

export function State404Lost() {
  return (
    <div className="min-h-screen bg-cobalt flex items-center justify-center p-4 paper-grain">
      <BrutalCard variant="cream" shadow="xl" className="max-w-md w-full text-center space-y-4">
        <div className="w-24 h-24 mx-auto bg-crimson border-3 border-pitch shadow-brutal flex items-center justify-center">
          <Image
            src="/stickers/cancel-denied.png"
            alt="Denied"
            width={88}
            height={88}
            className="object-contain"
          />
        </div>

        <div className="space-y-1">
          <span className="bg-lime text-pitch px-2 py-0.5 border border-pitch font-mono text-xs font-black uppercase">
            ERROR 404
          </span>
          <h1 className="text-5xl font-black uppercase tracking-tight text-pitch">
            LOST? 💧
          </h1>
        </div>

        <p className="font-mono text-xs text-zinc-800 leading-relaxed bg-white border-2 border-pitch p-3">
          This page got cancelled. Head back to cockpit before we call the Bulbul squad.
        </p>

        <Link href="/">
          <BrutalButton variant="lime" size="md" className="w-full">
            Back to Cockpit →
          </BrutalButton>
        </Link>
      </BrutalCard>
    </div>
  );
}

