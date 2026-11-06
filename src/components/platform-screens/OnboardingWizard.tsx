"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrutalCard } from "@/components/ui-primitives/BrutalCard";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";
import { DuctTapeBadge } from "@/components/ui-primitives/DuctTapeBadge";
import {
  DISCOUNT_CHOICES, PAUSE_CHOICES, type DiscountChoice, type PauseChoice, type WorkspaceSetup,
} from "@/backend/workspace/contract";

const DEFAULT_SETUP: WorkspaceSetup = {
  tenantId: "t_demo_workspace",
  publicKey: "bb_pub_live_79a2f1c8e034",
  appOrigin: "https://boolbul.com",
  onboardingCompleted: false,
  canManage: true,
  configuration: {
    discountTier: "50_2mo",
    pauseTier: "30_day",
    rules: [
      {
        ruleId: "rule_def_discount",
        offerType: "discount",
        priority: 1,
        triggerCondition: { min_mrr: 0 },
        discountBasisPoints: 5000,
        discountDurationMonths: 2,
        pauseDurationDays: 0,
        isActive: true,
      },
      {
        ruleId: "rule_def_pause",
        offerType: "pause",
        priority: 2,
        triggerCondition: { min_mrr: 0 },
        discountBasisPoints: 0,
        discountDurationMonths: 0,
        pauseDurationDays: 30,
        isActive: true,
      },
    ],
  },
};

const DEFAULT_INTEGRATION = {
  env: `NEXT_PUBLIC_BOOLBUL_KEY="bb_pub_live_79a2f1c8e034"\nBOOLBUL_SIGNING_SECRET="bb_sec_live_99a8b1c4e782"`,
  snippet: `import { openRetentionModal } from "@/components/interceptor-widget/RetentionModal";\n\n// Trigger in your cancel button click handler\nopenRetentionModal({\n  customerId: "cus_123",\n  subscriptionId: "sub_123",\n  mrr: 49,\n  onCancelConfirmed: () => handleCancel(),\n  onOfferAccepted: (offer) => handleOffer(offer)\n});`,
  prompt: `Implement BoolBul cancellation interception modal in our subscription management page using Dodo Payments.`,
};

type Props = {
  initialSetup?: WorkspaceSetup;
  integration?: { env: string; snippet: string; prompt: string };
};

export function OnboardingWizard({ initialSetup = DEFAULT_SETUP, integration = DEFAULT_INTEGRATION }: Props) {
  const router = useRouter();
  const [setup, setSetup] = useState(initialSetup);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [discountTier, setDiscountTier] = useState<DiscountChoice | "">(setup.configuration.discountTier ?? "");
  const [pauseTier, setPauseTier] = useState<PauseChoice | "">(setup.configuration.pauseTier ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  async function copy(text: string, label: string) {
    setFeedback("");
    try {
      await navigator.clipboard.writeText(text);
      setFeedback(`${label} copied.`);
    } catch {
      setFeedback("Clipboard unavailable. Select the visible text and copy it manually.");
    }
  }

  async function saveOffers() {
    if (saving || !discountTier || !pauseTier) return;
    setSaving(true);
    setError("");
    setFeedback("");
    try {
      const response = await fetch("/api/workspace/setup", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountTier, pauseTier }),
        signal: AbortSignal.timeout(40_000),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(typeof result.message === "string" ? result.message : "Setup could not be saved. Please retry.");
      }
      if (result.tenantId !== setup.tenantId || result.publicKey !== setup.publicKey ||
        result.onboardingCompleted !== true || !result.configuration) {
        throw new Error("Could not confirm the saved configuration. Reload before continuing.");
      }
      setSetup(result as WorkspaceSetup);
      setStep(3);
      setFeedback("Offers saved. Workspace setup is complete; integration still needs to be installed in your app.");
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "TimeoutError"
        ? cause.message : "The save timed out. Retry with the same choices to confirm setup.");
    } finally {
      setSaving(false);
    }
  }

  const buttonClass = "p-3 border-2 border-pitch text-left font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed";
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <BrutalCard variant="cream" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
        <div>
          <Link href="/" className="font-mono text-xs font-bold text-zinc-600">BACK TO HOME</Link>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mt-1">Retention cockpit setup</h1>
        </div>
        <ol aria-label="Setup progress" className="flex flex-wrap gap-2 font-mono text-xs">
          {["Workspace", "Offers", "Integrate"].map((label, index) => (
            <li key={label} aria-current={step === index + 1 ? "step" : undefined}
              className={`px-3 py-2 border-2 border-pitch font-bold ${step === index + 1 ? "bg-lime" : "bg-white text-zinc-600"}`}>
              0{index + 1}. {label}
            </li>
          ))}
        </ol>
      </BrutalCard>

      <div role="status" aria-live="polite" className={feedback ? "bg-lime border-2 border-pitch p-3 font-mono text-sm" : "sr-only"}>{feedback}</div>
      {error && <div role="alert" className="bg-white border-3 border-crimson p-4 font-mono text-sm text-crimson">
        {error} <Link href="/login?next=%2Fonboarding" className="underline font-bold">Sign in again</Link>
      </div>}

      {step === 1 && <BrutalCard variant="cream" shadow="lg" className="space-y-6">
        <div>
          <DuctTapeBadge rotate="left">STEP 1: YOUR WORKSPACE</DuctTapeBadge>
          <h2 className="text-3xl font-black uppercase mt-3">Public key. Private server.</h2>
          <p className="font-mono text-sm text-zinc-700 mt-2">Your workspace has a real public key. BoolBul proposes signed offers; your own server verifies and applies them.</p>
        </div>
        <div className="bg-white border-3 border-pitch p-4 space-y-3">
          <p className="font-mono text-xs font-black uppercase">Workspace public key — safe for your frontend</p>
          <code className="block break-all select-all font-mono text-sm">{setup.publicKey}</code>
          <BrutalButton variant="white" size="sm" onClick={() => copy(setup.publicKey, "Public key")}>Copy public key</BrutalButton>
          <p className="font-mono text-xs break-all">Tenant: {setup.tenantId}</p>
        </div>
        <div className="space-y-3">
          <h3 className="font-black uppercase">On your application server</h3>
          <pre className="bg-pitch text-lime p-4 font-mono text-xs whitespace-pre-wrap break-all select-text overflow-auto">{integration.env}</pre>
          <BrutalButton variant="white" size="sm" onClick={() => copy(integration.env, "Environment instructions")}>Copy environment instructions</BrutalButton>
          <p className="font-mono text-sm text-zinc-700">Ask your workspace operator to securely provision this tenant&apos;s actual signing secret directly to your server environment. It is never shown here. A replacement secret will not verify BoolBul tokens.</p>
          <p className="font-mono text-sm font-bold">Do not paste signing secrets or gateway API keys into this page, your frontend, or AI prompts. Your billing credentials stay on your server.</p>
        </div>
        {!setup.canManage && <p className="font-mono text-sm border-2 border-pitch bg-blush p-3">You have read-only setup access. An owner or admin must save the first offers.</p>}
        <div className="flex justify-end"><BrutalButton onClick={() => { setStep(2); setFeedback(""); }}>Choose first offers</BrutalButton></div>
      </BrutalCard>}

      {step === 2 && <BrutalCard variant="cream" shadow="lg" className="space-y-6">
        <div>
          <DuctTapeBadge rotate="left">STEP 2: FIRST OFFERS</DuctTapeBadge>
          <h2 className="text-3xl font-black uppercase mt-3">Give them a reason to stay.</h2>
          <p className="font-mono text-sm text-zinc-700 mt-2">These are unconditional offers, not cancellation-reason targeting. Saving writes the actual edge rules. Your backend must support the exact chosen terms.</p>
        </div>
        {(!setup.configuration.discountTier || !setup.configuration.pauseTier) &&
          <p className="bg-blush border-2 border-pitch p-3 font-mono text-sm">Some stored rules are custom or missing. Choose both offers explicitly. Saving replaces the terms and conditions of the two onboarding rules only.</p>}
        <fieldset disabled={saving || !setup.canManage} className="space-y-3">
          <legend className="font-mono text-sm font-black mb-3">Discount offer</legend>
          <div className="grid sm:grid-cols-3 gap-3">
            {(Object.keys(DISCOUNT_CHOICES) as DiscountChoice[]).map((choice) => (
              <button type="button" key={choice} aria-pressed={discountTier === choice} onClick={() => setDiscountTier(choice)}
                className={`${buttonClass} ${discountTier === choice ? "bg-lime shadow-brutal-sm" : "bg-white"}`}>{DISCOUNT_CHOICES[choice].label}</button>
            ))}
          </div>
        </fieldset>
        <fieldset disabled={saving || !setup.canManage} className="space-y-3">
          <legend className="font-mono text-sm font-black mb-3">Pause offer</legend>
          <div className="grid sm:grid-cols-2 gap-3">
            {(Object.keys(PAUSE_CHOICES) as PauseChoice[]).map((choice) => (
              <button type="button" key={choice} aria-pressed={pauseTier === choice} onClick={() => setPauseTier(choice)}
                className={`${buttonClass} ${pauseTier === choice ? "bg-lime shadow-brutal-sm" : "bg-white"}`}>{PAUSE_CHOICES[choice].label}</button>
            ))}
          </div>
        </fieldset>
        <p className="font-mono text-xs text-zinc-600">Existing activation states, priority, quotas, and unrelated custom rules are preserved. Disabled rules stay disabled.</p>
        <details className="bg-white border-2 border-pitch p-3">
          <summary className="cursor-pointer font-mono text-xs font-bold">View current saved rules ({setup.configuration.rules.length})</summary>
          <pre className="mt-3 text-xs overflow-auto max-h-64">{JSON.stringify(setup.configuration.rules, null, 2)}</pre>
        </details>
        <div className="flex flex-wrap justify-between gap-3 pt-2">
          <BrutalButton variant="white" disabled={saving} onClick={() => setStep(1)}>Back</BrutalButton>
          {setup.canManage
            ? <BrutalButton disabled={saving || !discountTier || !pauseTier} className="disabled:opacity-50" onClick={saveOffers}>{saving ? "Saving offers…" : "Save offers & continue"}</BrutalButton>
            : <BrutalButton variant="white" onClick={() => setStep(3)}>View integration instructions</BrutalButton>}
        </div>
      </BrutalCard>}

      {step === 3 && <BrutalCard variant="cream" shadow="lg" className="space-y-6">
        <div>
          <DuctTapeBadge rotate="right">STEP 3: INTEGRATE</DuctTapeBadge>
          <h2 className="text-3xl font-black uppercase mt-3">Connect your cancel flow.</h2>
          <p className="font-mono text-sm text-zinc-700 mt-2">No imaginary SDK or hosted redirect. Use these real init and claim endpoints, then redeem signed offers on your own authenticated server.</p>
        </div>
        <section className="space-y-3">
          <h3 className="font-black uppercase">Integration prompt</h3>
          <p className="font-mono text-sm text-zinc-700">Includes your public key and tenant ID, exact signed duration validation, subscription ownership checks, and durable single-use nonce protection. No secrets included.</p>
          <BrutalButton onClick={() => copy(integration.prompt, "Integration prompt")}>Copy integration prompt</BrutalButton>
          <details><summary className="font-mono text-sm underline cursor-pointer">Read or manually copy the full prompt</summary>
            <pre className="mt-3 p-4 bg-white border-2 border-pitch text-xs whitespace-pre-wrap break-words max-h-96 overflow-auto">{integration.prompt}</pre>
          </details>
        </section>
        <section className="space-y-3">
          <h3 className="font-black uppercase">Real API starter snippet</h3>
          <pre className="bg-pitch text-lime p-4 text-xs max-h-96 overflow-auto">{integration.snippet}</pre>
          <BrutalButton variant="white" size="sm" onClick={() => copy(integration.snippet, "API snippet")}>Copy API snippet</BrutalButton>
        </section>
        <p className="font-mono text-sm font-bold">Setup saves your offers; it does not install or verify the integration. Test ownership, signed durations, expiry, replay, and the native cancellation escape hatch before going live.</p>
        <div className="flex flex-wrap justify-between gap-3 border-t-2 border-pitch pt-5">
          <BrutalButton variant="white" onClick={() => { setStep(2); setFeedback(""); }}>Back to offers</BrutalButton>
          {setup.onboardingCompleted
            ? <BrutalButton onClick={() => { router.replace("/dashboard"); router.refresh(); }}>Go to dashboard</BrutalButton>
            : <p className="font-mono text-sm">An owner or admin must finish setup before continuing.</p>}
        </div>
      </BrutalCard>}
    </div>
  );
}
