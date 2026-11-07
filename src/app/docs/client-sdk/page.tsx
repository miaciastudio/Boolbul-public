import { C, Callout, Code, DocHeader, DocStep, Table } from "@/components/docs/DocBlocks";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/docs/client-sdk",
  title: "Client SDK Reference — BoolBul.open(), React Hook & Fail-Open",
  description: "BoolBul.open() options and callbacks, exit reasons, the 1.5s fail-open guarantee, React useBoolBul hook and the network-free live preview.",
});

export default function ClientSdkPage() {
  return (
    <div className="space-y-6">
      <DocHeader badge="CLIENT SDK" title="Client SDK reference"
        intro={<>~9 kB gzipped, no dependencies, renders in a Shadow DOM so your CSS and ours never collide. Load it from <C>https://boolbul.com/v1/boolbul.js</C> or <C>npm install @boolbul/sdk</C>.</>} />

      <DocStep title="BoolBul.open(options)">
        <Code>{`import { open } from "@boolbul/sdk"; // or window.BoolBul.open

await open({
  publicKey: "bb_pub_…",
  customerId: "cus_123",
  subscriptionId: "sub_456",
  mrrCents: 4900,
  onOfferAccepted: async (offer) => { /* apply on your server; throw to show a retry */ },
  onCancel: ({ reasonId, comment, failedOpen }) => { /* run your normal cancellation */ },
  onDismiss: () => { /* customer closed it and keeps their plan */ },
});`}</Code>
        <Table head={["Option", "Type", "Notes"]} rows={[
          [<C key="a">publicKey</C>, "string", "From onboarding / Settings. Safe to ship in the browser."],
          [<C key="b">customerId</C>, "string", "Your gateway customer id."],
          [<C key="c">subscriptionId</C>, "string", "The Dodo or Stripe subscription being cancelled."],
          [<C key="d">mrrCents</C>, "number?", "Monthly value in cents. Shown as saved MRR in your dashboard."],
          [<C key="e">planPriceCents</C>, "number?", "Price used for “Pay $24.50 instead of $49”. Defaults to mrrCents."],
          [<C key="f">currency</C>, "string?", "ISO code for price formatting. Default USD."],
          [<C key="g">onOfferAccepted</C>, "(offer) => Promise", "Required. Resolve when applied; reject to let the customer retry or cancel."],
          [<C key="h">onCancel</C>, "(details) => void", "Required. Called on the cancel link and on fail-open."],
          [<C key="i">onDismiss</C>, "() => void", "Optional. Close button, Escape or backdrop."],
        ]} />
      </DocStep>

      <DocStep title="What you receive">
        <Table head={["Field", "Meaning"]} rows={[
          [<C key="1">offer.offerJwt</C>, "Signed HS256 token, valid 5 minutes, single-use. Verify it on your server."],
          [<C key="2">offer.offerType</C>, "\"discount\" or \"pause\"."],
          [<C key="3">offer.offerValue</C>, "Discount in basis points (5000 = 50%) or pause length in days."],
          [<C key="4">details.reasonId</C>, "too_expensive · unused · missing_features · switched_service · customer_service · low_quality · too_complex · other — the same values Dodo and Stripe accept as cancellation feedback."],
          [<C key="5">details.failedOpen</C>, "true when BoolBul was unreachable and stepped aside."],
        ]} />
      </DocStep>

      <DocStep title="Fail-open guarantee">
        <p>Config and session load in parallel with a hard 1500 ms deadline. Timeout, network error, invalid key or exhausted quota → the widget closes and <C>onCancel</C> runs immediately. Your customers can always cancel, even if BoolBul is down.</p>
      </DocStep>

      <DocStep title="React">
        <Code>{`import { useBoolBul, BoolBulPreview } from "@boolbul/sdk/react";

const openRetention = useBoolBul({ publicKey: "bb_pub_…" });

// Network-free preview (what the dashboard customizer uses):
<BoolBulPreview config={{ themePreset: "midnight_oled" }} viewport="mobile" style={{ height: 640 }} />`}</Code>
      </DocStep>

      <DocStep title="Accessibility & compliance">
        <ul className="list-disc space-y-1 pl-5">
          <li>Focus is trapped in the dialog and restored afterwards; Escape closes it.</li>
          <li>The cancel link is on every screen, one click, never disabled, WCAG AA contrast in every theme.</li>
          <li>Labels that hide or shame the cancellation are replaced with the plain default.</li>
          <li>Phones get a bottom sheet (or a centered modal, your choice) with safe-area padding; motion respects reduced-motion settings.</li>
        </ul>
        <Callout>Want to see it first? The <a href="/demo" className="font-bold underline">live demo</a> runs this exact SDK.</Callout>
      </DocStep>
    </div>
  );
}
