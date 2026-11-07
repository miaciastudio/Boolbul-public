import { LiveDemo } from "@/components/website-pages/LiveDemo";

export const metadata = {
  title: "Live Demo — Try the Cancellation Flow | BoolBul",
  description: "Try BoolBul's in-app cancellation flow: exit survey, pause and discount offers, and an always-visible cancel link. Desktop and mobile.",
};

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-cobalt p-4 paper-grain selection:bg-lime selection:text-pitch md:p-8">
      <LiveDemo />
    </main>
  );
}
