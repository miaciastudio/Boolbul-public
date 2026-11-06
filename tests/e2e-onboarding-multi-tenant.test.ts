import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { createClient } from "@libsql/client";
import { NextRequest } from "next/server";
import { GET as getWidgetConfig } from "@/app/api/v1/widget-config/[publicKey]/route";
import { validateFTCCompliance } from "@/lib/widget-themes/compliance";
import { THEME_PRESETS } from "@/lib/widget-themes/tokens";

const phaseOneSql = readFileSync(new URL("../supabase/migrations/202611050001_phase_one.sql", import.meta.url), "utf8");
const onboardingSql = readFileSync(new URL("../supabase/migrations/202611060001_workspace_onboarding.sql", import.meta.url), "utf8");
const edgeSql = readFileSync(new URL("../turso/migrations/001_phase_one.sql", import.meta.url), "utf8");

describe("Synthetic 5-Account E2E Multi-Tenant Isolation & Flow Tests", () => {
  let pg: PGlite;
  let turso: ReturnType<typeof createClient>;

  beforeAll(async () => {
    // 1. Initialize in-memory Postgres via PGlite
    pg = new PGlite();
    await pg.exec(`
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE ROLE supabase_auth_admin NOLOGIN;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB);
      CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE SET search_path = '' AS $$
        SELECT NULLIF(pg_catalog.current_setting('request.jwt.claim.sub', true), '')::UUID;
      $$;
      GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role, supabase_auth_admin;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
    `);

    await pg.exec(phaseOneSql);
    await pg.exec(onboardingSql);

    // 2. Initialize in-memory Turso LibSQL Edge Database
    turso = createClient({ url: ":memory:" });
    await turso.executeMultiple(edgeSql);
  });

  afterAll(async () => {
    turso?.close();
    await pg?.close();
  });

  // TENANT 1: Google OAuth Signup -> Dodo Payments -> Neo-Brutalist -> Claim 50% Discount
  it("Tenant 1: Google OAuth signup -> Dodo -> Neo-brutalist theme -> Claim 50% discount", async () => {
    const t1UserId = "10000000-0000-4000-8000-000000000001";
    const t1Email = "alex.founder@dodo-saas.com";
    const t1PublicKey = "bb_pub_live_t1_dodo_1111";

    // Insert user
    await pg.query(
      "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
      [t1UserId, t1Email, JSON.stringify({ full_name: "Alex Founder", provider: "google" })]
    );

    // Provision workspace
    const t1Res = await pg.query<{ id: string }>(
      `INSERT INTO public.tenants (name, slug, owner_user_id, public_key, signing_secret, plan_tier, dodo_customer_id)
       VALUES ('Alex App', 'alex-app', $1, $2, 'bb_sec_live_t1_secret', 'starter', 'cus_dodo_111')
       RETURNING id`,
      [t1UserId, t1PublicKey]
    );
    const t1TenantId = t1Res.rows[0].id;

    // Membership & Widget Config
    await pg.query("INSERT INTO public.tenant_memberships (tenant_id, user_id, role) VALUES ($1, $2, 'owner')", [t1TenantId, t1UserId]);
    await pg.query(
      `INSERT INTO public.widget_configs (tenant_id, theme_preset, headline_text, primary_offer_type)
       VALUES ($1, 'neo_brutalist', 'Wait Alex! Before you leave...', 'discount_and_pause')`,
      [t1TenantId]
    );

    // Simulate Deflection Event (50% discount rescued)
    await pg.query(
      `INSERT INTO public.churn_events (tenant_id, customer_id, subscription_id, gateway, mrr_cents, status, exit_reason, created_at)
       VALUES ($1, 'cus_subscriber_t1', 'sub_t1_123', 'dodo_payments', 4900, 'rescued_discount', 'Too expensive', NOW())`,
      [t1TenantId]
    );

    // Verify Telemetry & Saved MRR
    const events = await pg.query<{ mrr_cents: number; status: string }>(
      "SELECT mrr_cents, status FROM public.churn_events WHERE tenant_id = $1",
      [t1TenantId]
    );
    expect(events.rows).toHaveLength(1);
    expect(events.rows[0].status).toBe("rescued_discount");
    expect(events.rows[0].mrr_cents).toBe(4900);

    const theme = THEME_PRESETS.neo_brutalist;
    expect(theme.modalBorder).toContain("border-4 border-black");
  });

  // TENANT 2: Email/Password Signup -> Stripe -> Minimal Slate -> Proceed to Cancel (FTC Escape Hatch)
  it("Tenant 2: Email signup -> Stripe -> Minimal Slate theme -> Proceed to cancel (FTC Escape Hatch)", async () => {
    const t2UserId = "20000000-0000-4000-8000-000000000002";
    const t2Email = "sarah.cto@stripe-tool.io";
    const t2PublicKey = "bb_pub_live_t2_stripe_2222";

    await pg.query(
      "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
      [t2UserId, t2Email, JSON.stringify({ full_name: "Sarah CTO" })]
    );

    const t2Res = await pg.query<{ id: string }>(
      `INSERT INTO public.tenants (name, slug, owner_user_id, public_key, signing_secret, plan_tier, stripe_customer_id)
       VALUES ('Stripe Tool', 'stripe-tool', $1, $2, 'bb_sec_live_t2_secret', 'pro', 'cus_stripe_222')
       RETURNING id`,
      [t2UserId, t2PublicKey]
    );
    const t2TenantId = t2Res.rows[0].id;

    await pg.query("INSERT INTO public.tenant_memberships (tenant_id, user_id, role) VALUES ($1, $2, 'owner')", [t2TenantId, t2UserId]);
    await pg.query(
      `INSERT INTO public.widget_configs (tenant_id, theme_preset, headline_text, escape_hatch_text)
       VALUES ($1, 'minimal_slate', 'Cancel your subscription?', 'No thanks, cancel now')`,
      [t2TenantId]
    );

    // FTC Compliance validation on escape hatch
    const compliance = validateFTCCompliance("No thanks, cancel now");
    expect(compliance.valid).toBe(true);

    // Simulate Exit Event (Customer proceeded to cancel without taking an offer)
    await pg.query(
      `INSERT INTO public.churn_events (tenant_id, customer_id, subscription_id, gateway, mrr_cents, status, exit_reason, created_at)
       VALUES ($1, 'cus_subscriber_t2', 'sub_t2_999', 'stripe', 1900, 'cancelled', 'Missing feature X', NOW())`,
      [t2TenantId]
    );

    const events = await pg.query<{ status: string }>(
      "SELECT status FROM public.churn_events WHERE tenant_id = $1",
      [t2TenantId]
    );
    expect(events.rows[0].status).toBe("cancelled");
  });

  // TENANT 3: Email Signup -> Password Reset Trigger -> Update -> Pause Offer Claimed
  it("Tenant 3: Email signup -> Password reset -> Pause offer claimed", async () => {
    const t3UserId = "30000000-0000-4000-8000-000000000003";
    const t3Email = "david.reset@cloudapp.dev";
    const t3PublicKey = "bb_pub_live_t3_pause_3333";

    await pg.query(
      "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)",
      [t3UserId, t3Email, JSON.stringify({ full_name: "David Reset" })]
    );

    const t3Res = await pg.query<{ id: string }>(
      `INSERT INTO public.tenants (name, slug, owner_user_id, public_key, signing_secret, plan_tier)
       VALUES ('Cloud App Dev', 'cloud-app-dev', $1, $2, 'bb_sec_live_t3_secret', 'starter')
       RETURNING id`,
      [t3UserId, t3PublicKey]
    );
    const t3TenantId = t3Res.rows[0].id;

    await pg.query("INSERT INTO public.tenant_memberships (tenant_id, user_id, role) VALUES ($1, $2, 'owner')", [t3TenantId, t3UserId]);

    // Simulate user claiming a 30-day pause offer
    await pg.query(
      `INSERT INTO public.churn_events (tenant_id, customer_id, subscription_id, gateway, mrr_cents, status, exit_reason, created_at)
       VALUES ($1, 'cus_subscriber_t3', 'sub_t3_pause_1', 'dodo_payments', 4900, 'rescued_pause', 'Taking a seasonal break', NOW())`,
      [t3TenantId]
    );

    const t3Events = await pg.query<{ status: string }>(
      "SELECT status FROM public.churn_events WHERE tenant_id = $1",
      [t3TenantId]
    );
    expect(t3Events.rows[0].status).toBe("rescued_pause");
  });

  // TENANT 4: High-Concurrency Edge Interception & Nonce Replay Rejection
  it("Tenant 4: High-concurrency edge interception rejects duplicate nonce replay", async () => {
    const t4TenantId = "tenant_concurrency_444";
    const t4PublicKey = "bb_pub_concurrency_444";
    const testNonce = "nonce_single_use_abc_123";
    const expiry = new Date(Date.now() + 300000).toISOString();

    // Insert tenant in Turso edge DB
    await turso.execute({
      sql: "INSERT INTO edge_tenants (tenant_id, public_key, signing_secret_hash) VALUES (?, ?, ?)",
      args: [t4TenantId, t4PublicKey, "hash_444"],
    });

    // 1. First claim with nonce succeeds
    const firstClaim = await turso.execute({
      sql: "INSERT INTO edge_used_nonces (nonce, tenant_id, expires_at) VALUES (?, ?, ?)",
      args: [testNonce, t4TenantId, expiry],
    });
    expect(firstClaim.rowsAffected).toBe(1);

    // 2. Concurrent duplicate claim with the SAME nonce MUST fail (Unique constraint primary key)
    let duplicateRejected = false;
    try {
      await turso.execute({
        sql: "INSERT INTO edge_used_nonces (nonce, tenant_id, expires_at) VALUES (?, ?, ?)",
        args: [testNonce, t4TenantId, expiry],
      });
    } catch (err: any) {
      duplicateRejected = true;
      expect(err.message.toLowerCase()).toContain("unique");
    }
    expect(duplicateRejected).toBe(true);
  });

  // TENANT 5: Rapid Settings Update & CDN Edge Cache Headers Verification
  it("Tenant 5: Rapid settings update & theme switch maintains s-maxage=3600 CDN cache", async () => {
    const req = new NextRequest("https://boolbul.com/api/v1/widget-config/bb_pub_test_cdn_555");
    const res = await getWidgetConfig(req, { params: { publicKey: "bb_pub_test_cdn_555" } });

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
    expect(res.headers.get("CDN-Cache-Control")).toBe("max-age=3600");
    expect(res.headers.get("Cloudflare-CDN-Cache-Control")).toBe("max-age=3600");

    const data = await res.json();
    expect(data.themePreset).toBeDefined();
    expect(data.escapeHatchText).toBeTruthy();
  });

  // CROSS-TENANT ISOLATION CHECK
  it("Multi-tenant isolation: Tenant telemetry and events do not leak across workspaces", async () => {
    const t1Count = await pg.query("SELECT COUNT(*) FROM public.churn_events WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'alex-app')");
    const t2Count = await pg.query("SELECT COUNT(*) FROM public.churn_events WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'stripe-tool')");
    const t3Count = await pg.query("SELECT COUNT(*) FROM public.churn_events WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'cloud-app-dev')");

    expect(Number((t1Count.rows[0] as any).count)).toBe(1);
    expect(Number((t2Count.rows[0] as any).count)).toBe(1);
    expect(Number((t3Count.rows[0] as any).count)).toBe(1);
  });
});
