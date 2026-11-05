import "server-only";
import type { WorkspaceSetup } from "./contract";

export function workspaceIntegration(setup: Pick<WorkspaceSetup, "tenantId" | "publicKey" | "appOrigin">) {
  const env = `BOOLBUL_PUBLIC_KEY=${JSON.stringify(setup.publicKey)}
BOOLBUL_TENANT_ID=${JSON.stringify(setup.tenantId)}
BOOLBUL_API_ORIGIN=${JSON.stringify(setup.appOrigin)}
# Server only: securely provision this tenant's actual signing secret separately.
# BOOLBUL_SIGNING_SECRET must match BoolBul; do not generate a replacement.
# Keep your existing gateway credentials on your own server, never in NEXT_PUBLIC_*.`;

  const snippet = `const BOOLBUL_ORIGIN = ${JSON.stringify(setup.appOrigin)};
const BOOLBUL_PUBLIC_KEY = ${JSON.stringify(setup.publicKey)};

// Each API call fails open within 1500ms, including response parsing.
async function boolbulRequest(path, body) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(BOOLBUL_ORIGIN + path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Offer unavailable");
        const result = await response.json();
        if (result.failOpen !== false) throw new Error("Continue cancellation");
        return result;
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("Continue cancellation"));
        }, 1500);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

async function initBoolBul(customerId, subscriptionId) {
  const result = await boolbulRequest("/api/v1/intercept/init", {
    publicKey: BOOLBUL_PUBLIC_KEY, customerId, subscriptionId,
  });
  if (!Array.isArray(result.rules) || result.rules.length === 0 || !result.initToken) {
    throw new Error("Continue cancellation");
  }
  return result; // Display these actual rules; keep initToken for the claim.
}

async function claimBoolBul(initToken, ruleId) {
  const result = await boolbulRequest("/api/v1/intercept/claim", {
    initToken, selection: ruleId,
  });
  if (typeof result.offerJwt !== "string") throw new Error("Continue cancellation");
  return result.offerJwt; // Send ONLY to your authenticated redemption backend.
}

// Wrap init/claim calls in try/catch; on failure call your existing cancel flow.
// Keep a visible native cancellation escape hatch, even during pending requests.
// Do not apply discounts in the browser or trust decoded JWTs without verification.`;

  const prompt = `Integrate BoolBul into this application's existing cancellation flow. Do not install an assumed BoolBul SDK or use a CDN/hosted rescue link; use the real HTTP endpoints below.

Workspace tenant ID: ${setup.tenantId}
Public key: ${setup.publicKey}
Canonical BoolBul API origin: ${setup.appOrigin}

SERVER ENVIRONMENT (never paste real secrets into this prompt):
${env}
Securely provision the actual tenant signing secret through the workspace operator's server-side process. This onboarding UI does not reveal it. Do not use the public key or the SHA-256 hash as the JWT verification secret. Keep all gateway credentials solely on the merchant's server; BoolBul does not collect them.

BROWSER FLOW:
${snippet}
Customer/subscription IDs passed to the public init endpoint are not proof of ownership. Show returned rule terms, including discountDurationMonths. Select using the returned ruleId, not a browser-supplied amount. A cancelled/failed request must not trap the customer or mutate their subscription. Offer claims must be redeemed by your own authenticated backend before showing success.

IMPLEMENT A SERVER-ONLY REDEMPTION ROUTE IN THIS CODEBASE:
1. Require the customer's verified session, exact canonical merchant Origin/CSRF checks, and POST { offerJwt } only. Resolve customerId and subscriptionId from your own ownership records, not client identity fields. Require tenantId === ${JSON.stringify(setup.tenantId)} and verify that the authenticated customer owns the subscription with your billing provider.
2. Verify the raw JWT using the tenant's actual BOOLBUL_SIGNING_SECRET with HS256 only, typ JWT, issuer boolbul.com, no clock tolerance, required iat/exp/tenantId/customerId/subscriptionId/nonce/offerType/offerValue, exactly exp - iat === 300 seconds, iat not in the future and exp not expired. Reject malformed/extra offer terms and identity mismatches. Do not merely decode the JWT.
3. Require a UUID v4 nonce. Discount offerValue is an integer in basis points (1..10000; 5000 = 50%), and discountDurationMonths MUST be a signed, safe, nonnegative integer (0 means ongoing). Never substitute an unsigned client duration. Pause offerValue is a signed positive integer number of days and must not carry discountDurationMonths. Enforce a server-approved allowlist of exact discount amount/duration or pause terms; reject unsupported terms.
4. Atomically consume the nonce in a durable server-side store scoped to this tenant BEFORE any gateway mutation. Keep the replay lock through token expiry; reject duplicate redemption with HTTP 409. BoolBul's claim nonce does not replace your redemption nonce. Use the nonce as the gateway idempotency key and persist the outcome; reconcile uncertain outcomes without reapplying the mutation.
5. Use your existing gateway integration on the server to apply only the verified terms. Map discounts to a server-approved code with exactly the signed percentage AND duration. Never create a permanent discount for a finite offer. Return success only after confirmed gateway success; reject invalid tokens with 403 and expired/replayed tokens with 409.
6. Keep the native cancel action visible and working. Fail open on timeout, network errors, non-2xx, failOpen responses or no eligible rules. Verify init/claim and parsing have a 1500ms deadline. Do not impose this cancellation-flow deadline on a gateway mutation that needs reconciliation.

Add local tests for signed duration tampering, wrong tenant/customer/subscription, expiry, replay, ownership, gateway failures and native cancellation fallback. Keep existing application styling and billing behavior outside this integration.`;
  return { env, snippet, prompt };
}
