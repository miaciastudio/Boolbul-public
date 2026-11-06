"use client";

import React from "react";
import { BrutalCard } from "@/components/ui-primitives/BrutalCard";

export function CustomizerSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-pulse">
      {/* Left Tuner Controls Skeleton */}
      <div className="lg:col-span-5 space-y-6">
        <BrutalCard variant="cream" className="p-6 border-4-black shadow-brutal space-y-6">
          <div className="space-y-2 border-b-2 border-pitch pb-4">
            <div className="h-6 w-48 bg-zinc-300 rounded-none border border-pitch" />
            <div className="h-4 w-72 bg-zinc-200 rounded-none" />
          </div>

          {/* Theme Preset Cards Skeleton */}
          <div className="space-y-3">
            <div className="h-4 w-32 bg-zinc-300" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-20 bg-zinc-200 border-2 border-pitch" />
              <div className="h-20 bg-zinc-200 border-2 border-pitch" />
              <div className="h-20 bg-zinc-200 border-2 border-pitch" />
            </div>
          </div>

          {/* Text input skeletons */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="h-4 w-28 bg-zinc-300" />
              <div className="h-10 w-full bg-white border-2 border-pitch" />
            </div>
            <div className="space-y-1.5">
              <div className="h-4 w-36 bg-zinc-300" />
              <div className="h-20 w-full bg-white border-2 border-pitch" />
            </div>
            <div className="space-y-1.5">
              <div className="h-4 w-44 bg-zinc-300" />
              <div className="h-10 w-full bg-white border-2 border-pitch" />
            </div>
          </div>

          {/* Offer toggles skeleton */}
          <div className="space-y-2 border-t-2 border-pitch pt-4">
            <div className="h-12 bg-zinc-100 border-2 border-pitch" />
            <div className="h-12 bg-zinc-100 border-2 border-pitch" />
          </div>

          <div className="h-12 w-full bg-zinc-300 border-3 border-pitch" />
        </BrutalCard>
      </div>

      {/* Right Live Preview Skeleton */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-36 bg-zinc-300 border border-pitch" />
          <div className="h-5 w-24 bg-zinc-200" />
        </div>
        <div className="min-h-[520px] bg-white border-4-black shadow-brutal p-8 flex items-center justify-center">
          <div className="w-full max-w-md space-y-4">
            <div className="h-8 w-3/4 bg-zinc-200 mx-auto" />
            <div className="h-14 w-full bg-zinc-100" />
            <div className="h-16 w-full bg-zinc-100 border border-zinc-200" />
            <div className="h-16 w-full bg-zinc-100 border border-zinc-200" />
            <div className="h-12 w-full bg-zinc-300" />
            <div className="h-10 w-full bg-zinc-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

