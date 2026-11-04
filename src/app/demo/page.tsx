import { DemoWalkthrough } from "@/components/website-pages/DemoWalkthrough";

export const metadata = {
  title: "Live Walkthrough & Screenshots Demo | BoolBul",
  description: "Step-by-step screenshots and live subscriber cancellation simulation.",
};

export default function DemoPage() {
  return (
    <main className="bg-cobalt min-h-screen p-4 md:p-8 paper-grain selection:bg-lime selection:text-pitch">
      <DemoWalkthrough />
    </main>
  );
}

