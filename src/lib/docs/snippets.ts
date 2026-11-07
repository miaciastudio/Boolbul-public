// Integration snippets shared by the docs and the onboarding wizard.
export const SCRIPT_SRC = "https://boolbul.com/v1/boolbul.js";

export function scriptSnippet(publicKey = "bb_pub_your_key") {
  return `<script src="${SCRIPT_SRC}" defer></script>
<script>
  document.getElementById("cancel-subscription").addEventListener("click", () => {
    BoolBul.open({
      publicKey: "${publicKey}",
      customerId: currentUser.customerId,         // your billing customer id
      subscriptionId: currentUser.subscriptionId, // sub_... from Dodo or Stripe
      mrrCents: 4900,                             // optional: powers "saved MRR"

      // Customer took an offer -> apply it on YOUR server
      onOfferAccepted: (offer) =>
        fetch("/api/boolbul/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offerJwt: offer.offerJwt }),
        }).then((res) => { if (!res.ok) throw new Error("apply failed"); }),

      // Customer chose to cancel (or BoolBul was unreachable for 1.5s)
      onCancel: ({ reasonId, comment }) =>
        fetch("/api/boolbul/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reasonId, comment }),
        }).then(() => location.reload()),
    });
  });
</script>`;
}

export function reactSnippet(publicKey = "bb_pub_your_key") {
  return `import { useBoolBul } from "@boolbul/sdk/react";

export function CancelButton({ user }) {
  const openRetention = useBoolBul({ publicKey: "${publicKey}" });
  return (
    <button
      onClick={() =>
        openRetention({
          customerId: user.customerId,
          subscriptionId: user.subscriptionId,
          mrrCents: user.planPriceCents,
          onOfferAccepted: (offer) => api.post("/api/boolbul/apply", { offerJwt: offer.offerJwt }),
          onCancel: (details) => api.post("/api/boolbul/cancel", details).then(() => router.refresh()),
        })
      }
    >
      Cancel subscription
    </button>
  );
}`;
}

export function serverSnippet(gateway: "dodo_payments" | "stripe" = "dodo_payments") {
  const config = gateway === "stripe"
    ? `{ gateway: "stripe", secretKey: process.env.STRIPE_SECRET_KEY! }`
    : `{ gateway: "dodo_payments", apiKey: process.env.DODO_PAYMENTS_API_KEY!, environment: "live_mode" }`;
  return `// app/api/boolbul/apply/route.ts  (Next.js; same idea in Express, Hono, Remix...)
import { redeemOffer } from "@boolbul/sdk/server";

const gateway = ${config} as const;

export async function POST(req: Request) {
  const user = await requireUser(req); // YOUR auth: never trust ids from the body
  const { offerJwt } = await req.json();

  await redeemOffer(offerJwt, {
    signingSecret: process.env.BOOLBUL_SIGNING_SECRET!, // Dashboard -> Settings
    expected: { subscriptionId: user.subscriptionId },
    // Optional replay guard: return true if this nonce was already used
    seenNonce: async (nonce) => !(await redis.set(\`boolbul:\${nonce}\`, 1, { nx: true, ex: 300 })),
    gateway,
  });
  return Response.json({ ok: true });
}

// app/api/boolbul/cancel/route.ts
import { cancelSubscription } from "@boolbul/sdk/server";

export async function POST(req: Request) {
  const user = await requireUser(req);
  const { reasonId, comment } = await req.json();
  // Cancels at period end and records the exit reason in your gateway's churn analytics
  await cancelSubscription(user.subscriptionId, gateway, { reasonId, comment });
  return Response.json({ ok: true });
}`;
}

export function webviewUrl(publicKey = "bb_pub_your_key") {
  return `https://boolbul.com/w/${publicKey}?customerId=CUSTOMER_ID&subscriptionId=SUBSCRIPTION_ID&mrrCents=4900`;
}

export function reactNativeSnippet(publicKey = "bb_pub_your_key") {
  return `import { WebView } from "react-native-webview";

<WebView
  source={{ uri: \`https://boolbul.com/w/${publicKey}?customerId=\${user.customerId}&subscriptionId=\${user.subscriptionId}&mrrCents=\${user.priceCents}\` }}
  style={{ backgroundColor: "transparent" }}
  onMessage={async (event) => {
    const message = JSON.parse(event.nativeEvent.data);
    if (message.type === "boolbul:offer_accepted") {
      await api.post("/boolbul/apply", { offerJwt: message.offer.offerJwt });
    } else if (message.type === "boolbul:cancel") {
      await api.post("/boolbul/cancel", message.details);
      closeSheet();
    } else if (message.type === "boolbul:dismiss") {
      closeSheet();
    }
  }}
/>`;
}

export function flutterSnippet(publicKey = "bb_pub_your_key") {
  return `final controller = WebViewController()
  ..setJavaScriptMode(JavaScriptMode.unrestricted)
  ..addJavaScriptChannel('BoolBulNative', onMessageReceived: (msg) async {
    final data = jsonDecode(msg.message);
    switch (data['type']) {
      case 'boolbul:offer_accepted':
        await api.post('/boolbul/apply', {'offerJwt': data['offer']['offerJwt']});
      case 'boolbul:cancel':
        await api.post('/boolbul/cancel', data['details']);
        Navigator.pop(context);
      case 'boolbul:dismiss':
        Navigator.pop(context);
    }
  })
  ..loadRequest(Uri.parse(
      'https://boolbul.com/w/${publicKey}?customerId=$customerId&subscriptionId=$subscriptionId'));`;
}

export function swiftSnippet(publicKey = "bb_pub_your_key") {
  return `let config = WKWebViewConfiguration()
config.userContentController.add(handler, name: "boolbul") // receives boolbul:* messages
let webView = WKWebView(frame: .zero, configuration: config)
webView.isOpaque = false
webView.load(URLRequest(url: URL(string:
  "https://boolbul.com/w/${publicKey}?customerId=\\(customerId)&subscriptionId=\\(subscriptionId)")!))`;
}
