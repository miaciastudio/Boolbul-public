# 🐦‍🔥 BoolBul

**In-app cancellation flow for indie SaaS.** When a customer clicks “Cancel”, BoolBul asks why, offers the right thing (a discount or a pause) and keeps a one-click cancel link on every screen. Works with **Dodo Payments** and **Stripe**.

[Live demo](https://boolbul.com/demo) · [Docs](https://boolbul.com/docs) · [Quickstart](https://boolbul.com/docs/quickstart) · Open core, AGPL-3.0

<a href="https://www.producthunt.com/products/boolbul?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-boolbul" target="_blank" rel="noopener noreferrer"><img alt="BoolBul - In-app edge cancellation flow to save churning SaaS MRR | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1308552&theme=light&t=1794125282847"></a>

### ▶️ See it in 30 seconds

[![BoolBul in 30 seconds — watch on YouTube](https://i.ytimg.com/vi/XsoXoD3kbAc/maxresdefault.jpg)](https://www.youtube.com/watch?v=XsoXoD3kbAc)

---

## Why

Sending churning users to a billing portal loses them. BoolBul keeps the conversation inside your app:

- **One-tap exit survey** whose answers map 1:1 to Dodo `cancellation_feedback` and Stripe `cancellation_details.feedback`.
- **Reason-matched offers.** “Too expensive” sees the discount first; “not using it” sees the pause first.
- **Never traps anyone.** The cancel link is visible on every screen, single-click, WCAG AA in every theme; shaming labels are rejected (FTC 16 CFR 425, California ARL).
- **Fails open.** If BoolBul doesn't answer in 1.5 s, your normal cancellation runs.
- **Zero-trust.** Offers are signed with *your* secret and applied by *your* server. BoolBul never sees gateway keys.

## Add it to your app

```html
<script src="https://boolbul.com/v1/boolbul.js" defer></script>
<script>
  cancelButton.onclick = () => BoolBul.open({
    publicKey: "bb_pub_…",
    customerId: user.customerId,
    subscriptionId: user.subscriptionId,
    mrrCents: 4900,
    onOfferAccepted: (offer) => fetch("/api/boolbul/apply", { method: "POST", body: JSON.stringify({ offerJwt: offer.offerJwt }) }),
    onCancel: (details) => fetch("/api/boolbul/cancel", { method: "POST", body: JSON.stringify(details) }),
  });
</script>
```

```ts
// your server — npm install @boolbul/sdk
import { redeemOffer, cancelSubscription } from "@boolbul/sdk/server";

await redeemOffer(offerJwt, {
  signingSecret: process.env.BOOLBUL_SIGNING_SECRET!,
  expected: { subscriptionId: session.subscriptionId },
  gateway: { gateway: "stripe", secretKey: process.env.STRIPE_SECRET_KEY! },
  // or { gateway: "dodo_payments", apiKey: process.env.DODO_PAYMENTS_API_KEY!, environment: "live_mode" }
});
```

React (`useBoolBul`, `BoolBulPreview`), mobile WebViews (React Native, Flutter, iOS, Android) and every option are in the [docs](https://boolbul.com/docs).

## What's inside

| Path | What |
|---|---|
| `packages/sdk` | `@boolbul/sdk` — the widget (Shadow DOM, ~9 kB gzip), React wrapper, WebView bridge and the zero-dependency server SDK with Dodo Payments + Stripe adapters |
| `src/app/api/v1/intercept/*` | Edge session (`init`), signed offer claim (`claim`), analytics beacon (`outcome`) |
| `src/app/api/v1/widget-config` | Public, CDN-cached widget design |
| `src/app/dashboard` | Cockpit (saved MRR, save rate, exit reasons, ledger), live customizer, settings |
| `src/app/w/[publicKey]` | Hosted page for mobile WebViews |
| `supabase/migrations`, `turso/migrations` | Postgres (tenants, RLS, ledger) and libSQL edge schema |

**Stack:** Next.js 15 on Cloudflare Workers (OpenNext) · Supabase Postgres + Auth · Turso libSQL at the edge · TypeScript strict.

## Self-hosting

```bash
git clone https://github.com/miaciastudio/Boolbul-public.git && cd Boolbul-public
npm install
cp .env.example .env.local        # fill in Supabase, Turso and BOOLBUL_JWT_SECRET
```

1. Apply `supabase/migrations/*.sql` in order to your Supabase project, then `npm run db:migrate:turso`.
2. Set `BOOLBUL_SELF_HOSTED=true` and `NEXT_PUBLIC_BOOLBUL_SELF_HOSTED=true` to remove plan limits.
3. `npm run dev` for local work, `npm run preview` to run the Worker locally, `npm run deploy` to ship to Cloudflare.
4. Add the same server secrets to your Worker (`npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`, etc.).

```bash
npm run typecheck && npm test
```

## Gateways

| Gateway | Status |
|---|---|
| Dodo Payments | ✅ Supported |
| Stripe | ✅ Supported |
| Paddle · Lemon Squeezy · Polar · Chargebee | 🔜 Coming soon |

## License

Open core under [AGPL-3.0](LICENSE). The hosted cloud at [boolbul.com](https://boolbul.com) adds managed billing on top.
