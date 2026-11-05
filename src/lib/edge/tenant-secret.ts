import "server-only";
import { signingKey } from "../crypto/jwt";
import type { EdgeTenant } from "./queries";

export async function hashSigningSecret(secret: string): Promise<string> {
  const bytes = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getTenantSigningSecret(tenant: EdgeTenant, signal: AbortSignal): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) throw new Error("Tenant signing configuration is missing");
  const url = new URL("/rest/v1/tenants", baseUrl);
  url.searchParams.set("id", `eq.${tenant.tenantId}`);
  url.searchParams.set("public_key", `eq.${tenant.publicKey}`);
  url.searchParams.set("select", "signing_secret");
  const response = await fetch(url, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Tenant signing key lookup failed");
  const rows: unknown = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1 || !rows[0] ||
      typeof rows[0] !== "object" || !("signing_secret" in rows[0]) || typeof rows[0].signing_secret !== "string") {
    throw new Error("Tenant signing key is unavailable");
  }
  const secret = rows[0].signing_secret;
  signingKey(secret);
  if (await hashSigningSecret(secret) !== tenant.signingSecretHash) throw new Error("Tenant signing key is out of sync");
  return secret;
}
