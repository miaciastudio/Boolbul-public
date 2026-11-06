# ⚡ Appwrite Cloud Function: Dodo Payments Retention & Exit Interceptor

This Appwrite Function connects your **Dodo Payments** webhooks directly with **[BoolBul](https://boolbul.com)**, the ultra-low-latency in-app cancellation interceptor and exit telemetry engine.

---

## 🎯 How It Works

1. A customer clicks **"Cancel Subscription"** on your billing page.
2. BoolBul's lightweight modal intercepts the exit and presents an automated rescue package (e.g., *50% off for 2 months* or *30-day pause*).
3. If the user accepts, BoolBul signs a cryptographically secure, tamper-proof `offerJwt`.
4. When Dodo Payments triggers an exit webhook, this Appwrite Function verifies the token with **BoolBul Edge** (`<10ms`).
5. If verified: the cancellation is deflected and the discount/pause is applied to your Appwrite database.
6. If the customer chooses the **FTC-compliant escape hatch**, cancellation proceeds cleanly without friction.

---

## 🚀 Quick Setup (Under 2 Minutes)

### 1. Install & Deploy with Appwrite CLI

```bash
# Login to Appwrite Cloud
appwrite login

# Deploy the function
appwrite functions createDeployment \
  --functionId="boolbul-dodo-retention" \
  --activate=true \
  --entrypoint="src/main.ts"
```

### 2. Configure Environment Variables in Appwrite Dashboard

Go to **Functions → Settings → Variables** and add:

| Variable | Description | Where to Find |
| :--- | :--- | :--- |
| `BOOLBUL_EDGE_URL` | Base URL of BoolBul | `https://boolbul.com` |
| `BOOLBUL_PUBLIC_KEY` | Your workspace public key | BoolBul Cockpit (`/dashboard`) |
| `BOOLBUL_SIGNING_SECRET` | HMAC signing secret | BoolBul Cockpit (`/dashboard`) |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Dodo Webhook signing key | Dodo Dashboard → Webhooks |

### 3. Add Webhook in Dodo Payments

In **Dodo Payments Dashboard → Developer Settings → Webhooks**:
- **URL**: `https://cloud.appwrite.io/v1/functions/boolbul-dodo-retention/executions`
- **Events**: `subscription.cancelled`, `subscription.paused`

---

## 🔒 Legal Compliance Note

This function conforms strictly to the **FTC "Click to Cancel" Rule (16 CFR Part 425)** and **California Automatic Renewal Law (ARL)**:
- Never blocks or delays direct consumer cancellation if no offer was chosen.
- High-contrast immediate escape hatch handling.

