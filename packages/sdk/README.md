# @boolbul/sdk

In-app cancellation flow for SaaS: a one-tap exit survey, reason-matched **pause** and **discount** offers, and a cancel link that is always one click away. Works with **Dodo Payments** and **Stripe**.

- ~9 kB gzipped, zero dependencies, Shadow DOM (no CSS clashes)
- Fails open: if BoolBul doesn't answer within 1.5 s, your normal cancellation runs
- FTC click-to-cancel / California ARL friendly, WCAG AA themes, mobile bottom sheet
- Your gateway keys stay on your server; offers are signed with your secret

## Browser

```js
import { open } from "@boolbul/sdk";

cancelButton.onclick = () => open({
  publicKey: "bb_pub_…",
  customerId: user.customerId,
  subscriptionId: user.subscriptionId,
  mrrCents: 4900,
  onOfferAccepted: (offer) => fetch("/api/boolbul/apply", { method: "POST", body: JSON.stringify({ offerJwt: offer.offerJwt }) }),
  onCancel: (details) => fetch("/api/boolbul/cancel", { method: "POST", body: JSON.stringify(details) }),
});
```

No bundler? `<script src="https://boolbul.com/v1/boolbul.js"></script>` exposes `window.BoolBul`.

React: `import { useBoolBul, BoolBulPreview } from "@boolbul/sdk/react"`.

## Server

```ts
import { redeemOffer, cancelSubscription } from "@boolbul/sdk/server";

await redeemOffer(offerJwt, {
  signingSecret: process.env.BOOLBUL_SIGNING_SECRET!,
  expected: { subscriptionId: session.subscriptionId },
  gateway: { gateway: "dodo_payments", apiKey: process.env.DODO_PAYMENTS_API_KEY!, environment: "live_mode" },
  // or { gateway: "stripe", secretKey: process.env.STRIPE_SECRET_KEY! }
});
```

Docs: https://boolbul.com/docs · Demo: https://boolbul.com/demo · License: AGPL-3.0
