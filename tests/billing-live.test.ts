import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { billingConfigured, billingEnvironment, validateCheckoutUrl } from "@/backend/dodo-payments/config";
import { parseBillingEvent } from "@/backend/dodo-payments/webhooks";

afterEach(() => { vi.unstubAllEnvs(); });

describe("Dodo test/live switch", () => {
  it.each([["test_mode", "test_mode"], ["test", "test_mode"], ["live_mode", "live_mode"], ["LIVE", "live_mode"]])("DODO_PAYMENTS_ENVIRONMENT=%s -> %s", (value, mode) => {
    vi.stubEnv("DODO_PAYMENTS_ENVIRONMENT", value);
    expect(billingEnvironment()).toBe(mode);
  });

  it("rejects unknown environments and reports unconfigured billing", () => {
    vi.stubEnv("DODO_PAYMENTS_ENVIRONMENT", "production");
    expect(() => billingEnvironment()).toThrow();
    expect(billingConfigured()).toBe(false);
  });

  it("only accepts the checkout host of the active environment", () => {
    expect(validateCheckoutUrl("https://test.checkout.dodopayments.com/session/abc", "test_mode")).toContain("test.checkout");
    expect(() => validateCheckoutUrl("https://test.checkout.dodopayments.com/session/abc", "live_mode")).toThrow();
    expect(validateCheckoutUrl("https://checkout.dodopayments.com/session/abc", "live_mode")).toContain("checkout.dodopayments.com");
    expect(() => validateCheckoutUrl("https://evil.example/session", "live_mode")).toThrow();
  });

  it("accepts beta trial subscriptions in webhooks", () => {
    const config = { environment: "live_mode" as const, products: { starter: "pdt_s", pro: "pdt_p" } };
    const event = parseBillingEvent({
      type: "subscription.active", timestamp: "2026-11-08T10:00:00Z",
      data: { subscription_id: "sub_1", product_id: "pdt_p", customer: { customer_id: "cus_1" }, recurring_pre_tax_amount: 4900,
        currency: "USD", payment_frequency_count: 1, payment_frequency_interval: "Month", quantity: 1, trial_period_days: 89, tax_inclusive: false },
    }, config as never);
    expect(event).toMatchObject({ plan: "pro", amount: 4900, subscriptionId: "sub_1" });
  });
});

describe("billing SQL (all migrations)", () => {
  const dir = new URL("../supabase/migrations/", import.meta.url);
  const migrations = readdirSync(dir).filter((n) => n.endsWith(".sql") && !n.endsWith(".supabase.sql")).sort().map((n) => readFileSync(new URL(n, dir), "utf8"));
  let db: PGlite;
  const owner = "55555555-5555-4555-8555-555555555555";
  let tenantId: string;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; CREATE ROLE supabase_auth_admin NOLOGIN;
      CREATE SCHEMA auth; CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB);
      CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
      GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role, supabase_auth_admin; GRANT INSERT, SELECT ON auth.users TO supabase_auth_admin;
      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;`);
    for (const sql of migrations) await db.exec(sql);
    await db.query("INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, 'f@x.test', '{}')", [owner]);
    tenantId = (await db.query<{ id: string }>("SELECT id FROM public.tenants WHERE owner_user_id = $1", [owner])).rows[0].id;
  }, 30_000);
  afterAll(async () => { await db?.close(); });

  const begin = async (env: string) => (await db.query<{ r: { result: string; trial_ends_at?: string; auto_renew?: boolean } }>(
    "SELECT public.begin_dodo_checkout($1, $2, $3, 'pdt_p', 'pro') AS r", [tenantId, owner, env])).rows[0].r;

  it("refuses card checkout until the beta application is approved", async () => {
    expect((await begin("live_mode")).result).toBe("not_approved");
  });

  it("starts live or test checkout once approved and passes the pass end date for the trial", async () => {
    await db.query("UPDATE public.tenants SET access_status = 'active', trial_ends_at = now() + interval '80 days' WHERE id = $1", [tenantId]);
    const started = await begin("live_mode");
    expect(started.result).toBe("started");
    expect(started.trial_ends_at).toBeTruthy();
    expect(started.auto_renew).toBe(true);
    await expect(db.query("SELECT public.begin_dodo_checkout($1, $2, 'staging', 'pdt_p', 'pro')", [tenantId, owner])).rejects.toThrow(/Invalid billing configuration/);
  });
});
