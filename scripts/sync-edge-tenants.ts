import { createClient } from "@libsql/client/web";

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (!supabaseUrl || !serviceKey || !tursoUrl || !tursoToken) throw new Error("Database configuration is missing");
  const db = createClient({
    url: tursoUrl.replace(/^libsql:/, "https:"), authToken: tursoToken,
    fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
  });
  let offset = 0;
  try {
    while (true) {
      const url = new URL("/rest/v1/tenants", supabaseUrl);
      url.searchParams.set("select", "id,public_key,signing_secret,gateway");
      url.searchParams.set("order", "id.asc");
      url.searchParams.set("limit", "500");
      url.searchParams.set("offset", String(offset));
      const response = await fetch(url, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Source tenant lookup failed");
      const tenants: unknown = await response.json();
      if (!Array.isArray(tenants)) throw new Error("Invalid source response");
      if (tenants.length === 0) break;
      const statements = await Promise.all(tenants.map(async (value: unknown) => {
        if (!value || typeof value !== "object" || !("id" in value) || typeof value.id !== "string" ||
            !("public_key" in value) || typeof value.public_key !== "string" ||
            !("signing_secret" in value) || typeof value.signing_secret !== "string" || value.signing_secret.length < 32) {
          throw new Error("Invalid source tenant");
        }
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.signing_secret));
        const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
        return {
          sql: `INSERT INTO edge_tenants (tenant_id, public_key, signing_secret_hash, gateway) VALUES (?, ?, ?, ?)
                ON CONFLICT(tenant_id) DO UPDATE SET public_key = excluded.public_key,
                signing_secret_hash = excluded.signing_secret_hash, gateway = excluded.gateway,
                updated_at = CURRENT_TIMESTAMP`,
          args: [value.id, value.public_key, hash, "gateway" in value && value.gateway === "stripe" ? "stripe" : "dodo_payments"],
        };
      }));
      await db.batch(statements, "write");
      offset += tenants.length;
    }
    console.info(`Synchronized ${offset} tenant bindings; existing statuses, quotas and rules were preserved.`);
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  console.error("Tenant synchronization failed", { errorType: error instanceof Error ? error.name : "UnknownError" });
  process.exitCode = 1;
});
