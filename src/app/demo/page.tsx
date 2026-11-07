import { LiveDemo } from "@/components/website-pages/LiveDemo";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/demo",
  title: "Live Demo — Try an In-App SaaS Cancellation Flow",
  description: "Click through BoolBul's real cancellation flow: exit survey, reason-matched pause and discount offers, and an always-visible cancel link, on desktop and mobile.",
});

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-cobalt p-4 paper-grain selection:bg-lime selection:text-pitch md:p-8">
      <LiveDemo />
    </main>
  );
}
