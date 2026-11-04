import { OnboardingWizard } from "@/components/platform-screens/OnboardingWizard";

export const metadata = {
  title: "Setup Retention Flow | BoolBul",
  description: "Link your Dodo Payments key and configure your retention interceptor.",
};

export default function OnboardingPage() {
  return (
    <main className="bg-cobalt min-h-screen p-4 md:p-8 paper-grain">
      <OnboardingWizard />
    </main>
  );
}

