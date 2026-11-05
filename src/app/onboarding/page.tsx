"use client";

import React from "react";
import { OnboardingWizard } from "@/components/platform-screens/OnboardingWizard";

export default function OnboardingPage() {
  return (
    <main className="bg-cobalt min-h-screen p-4 md:p-8 paper-grain">
      <OnboardingWizard />
    </main>
  );
}
