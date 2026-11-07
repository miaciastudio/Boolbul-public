import type { Metadata, Viewport } from "next";
import { HostedWidget } from "./HostedWidget";

export const metadata: Metadata = {
  title: "Manage subscription",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

/**
 * Hosted retention page for native apps (React Native, Flutter, Swift, Kotlin).
 * Open https://boolbul.com/w/<publicKey>?customerId=…&subscriptionId=…&mrrCents=…
 * in a WebView and listen for boolbul:* messages.
 */
export default async function HostedWidgetPage({ params }: { params: Promise<{ publicKey: string }> }) {
  const { publicKey } = await params;
  return (
    <main style={{ minHeight: "100dvh", background: "transparent" }}>
      <HostedWidget publicKey={decodeURIComponent(publicKey)} />
    </main>
  );
}
