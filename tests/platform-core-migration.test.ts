import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Applies every Supabase migration in order, exactly like a fresh `supabase db push`.
const migrationsDir = new URL("../supabase/migrations/", import.meta.url);
const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql") && !name.endsWith(".supabase.sql")).sort()
  .map((name) => readFileSync(new URL(name, migrationsDir), "utf8"));

const authSetup = `
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE ROLE supabase_auth_admin NOLOGIN;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB, email_confirmed_at TIMESTAMPTZ);
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE SET search_path = '' AS $$
    SELECT NULLIF(pg_catalog.current_setting('request.jwt.claim.sub', true), '')::UUID; $$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role, supabase_auth_admin;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
  GRANT INSERT, SELECT ON auth.users TO supabase_auth_admin;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
`;
const owner = "11111111-1111-4111-8111-111111111111";
const outsider = "22222222-2222-4222-8222-222222222222";

describe("platform core migration (all migrations, in-memory Postgres)", () => {
  let db: PGlite;
  let tenantId: string;

  async function asRole<T>(role: string, userId: string | null, run: () => Promise<T>): Promise<T> {
    await db.exec("SAVEPOINT api_call");
    try {
      await db.exec(`SET LOCAL ROLE ${role}`);
      await db.query("SELECT pg_catalog.set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
      return await run();
    } finally {
      await db.exec("ROLLBACK TO SAVEPOINT api_call; RELEASE SAVEPOINT api_call;");
    }
  }
  const record = (status: string, extra: Partial<Record<"mrr" | "offer" | "reason", unknown>> = {}) =>
    db.query<{ status: string }>(`SELECT public.record_retention_event($1, 'session-1', 'cus_1', 'sub_1', 'stripe',
      $2, $3, $4, $5, NULL) AS status`, [tenantId, extra.mrr ?? 4900, status, extra.offer ?? null, extra.reason ?? null]);

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(authSetup);
    for (const sql of migrations) await db.exec(sql);
    await db.exec("SET ROLE supabase_auth_admin");
    await db.query("INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, 'owner@example.test', '{}'), ($2, 'out@example.test', '{}')", [owner, outsider]);
    await db.exec("RESET ROLE");
    tenantId = (await db.query<{ id: string }>("SELECT id FROM public.tenants WHERE owner_user_id = $1", [owner])).rows[0].id;
  }, 30_000);

  beforeEach(async () => { await db.exec("BEGIN"); });
  afterEach(async () => { await db.exec("ROLLBACK; RESET ROLE;"); });
  afterAll(async () => { await db?.close(); });

  it("moves RLS helpers out of the exposed schema while policies keep working", async () => {
    const { rows } = await db.query<{ schema: string }>(`SELECT n.nspname AS schema FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace WHERE p.proname IN ('is_tenant_member', 'can_manage_tenant_widget')`);
    expect(rows.map((row) => row.schema)).toEqual(["private", "private"]);
    const visible = await asRole("authenticated", owner, () => db.query("SELECT id, gateway, primary_domain FROM public.tenants"));
    expect(visible.rows).toEqual([{ id: tenantId, gateway: "dodo_payments", primary_domain: null }]);
    const hidden = await asRole("authenticated", outsider, () => db.query("SELECT id FROM public.tenants WHERE id = $1", [tenantId]));
    expect(hidden.rows).toHaveLength(0);
    await expect(asRole("authenticated", owner, () => db.query("SELECT signing_secret FROM public.tenants"))).rejects.toThrow(/permission denied/);
  });

  it("ships widget design defaults and validates them", async () => {
    const { rows } = await db.query<{ survey_reasons: unknown[]; mobile_layout: string; show_branding: boolean }>(
      "SELECT survey_reasons, mobile_layout, show_branding FROM public.widget_configs WHERE tenant_id = $1", [tenantId]);
    expect(rows[0].survey_reasons).toHaveLength(5);
    expect(rows[0]).toMatchObject({ mobile_layout: "sheet", show_branding: true });
    await expect(asRole("service_role", null, () => db.query("UPDATE public.widget_configs SET logo_url = 'http://insecure.test/logo.png' WHERE tenant_id = $1", [tenantId])))
      .rejects.toThrow(/check/);
    await expect(asRole("service_role", null, () => db.query("UPDATE public.widget_configs SET headline_text = '' WHERE tenant_id = $1", [tenantId])))
      .rejects.toThrow(/check/);
    const updated = await asRole("authenticated", owner, () =>
      db.query("UPDATE public.widget_configs SET mobile_layout = 'modal', survey_enabled = false WHERE tenant_id = $1 RETURNING mobile_layout", [tenantId]));
    expect(updated.rows).toEqual([{ mobile_layout: "modal" }]);
  });

  it("keeps one ledger row per session and never downgrades a final outcome", async () => {
    await asRole("service_role", null, async () => {
      expect((await record("intercepted", { mrr: 0 })).rows[0].status).toBe("intercepted");
      expect((await record("rescued_discount", { offer: "discount", reason: "too_expensive" })).rows[0].status).toBe("rescued_discount");
      expect((await record("intercepted", { mrr: 100 })).rows[0].status).toBe("rescued_discount");
      const { rows } = await db.query("SELECT status, offer_type, exit_reason, mrr_cents FROM public.churn_events WHERE tenant_id = $1", [tenantId]);
      expect(rows).toEqual([{ status: "rescued_discount", offer_type: "discount", exit_reason: "too_expensive", mrr_cents: 4900 }]);
      await expect(record("paused")).rejects.toThrow(/Unsupported/);
    });
  });

  it("does not let browsers write the ledger or call service functions", async () => {
    await expect(asRole("authenticated", owner, () => record("rescued_pause"))).rejects.toThrow(/permission denied/);
    await expect(asRole("anon", null, () => record("rescued_pause"))).rejects.toThrow(/permission denied/);
  });
});

describe("invite-only beta migration", () => {
  let db: PGlite;
  const applicant = "33333333-3333-4333-8333-333333333333";
  const other = "44444444-4444-4444-8444-444444444444";
  let tenantId: string;

  async function as<T>(role: string, userId: string | null, run: () => Promise<T>): Promise<T> {
    await db.exec("SAVEPOINT s");
    try {
      await db.exec(`SET LOCAL ROLE ${role}`);
      await db.query("SELECT pg_catalog.set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
      return await run();
    } finally {
      await db.exec("ROLLBACK TO SAVEPOINT s; RELEASE SAVEPOINT s;");
    }
  }

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(authSetup);
    for (const sql of migrations) await db.exec(sql);
    await db.exec("SET ROLE supabase_auth_admin");
    await db.query("INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, 'a@x.test', '{}'), ($2, 'b@x.test', '{}')", [applicant, other]);
    await db.exec("RESET ROLE");
    tenantId = (await db.query<{ id: string }>("SELECT id FROM public.tenants WHERE owner_user_id = $1", [applicant])).rows[0].id;
    await db.query(`INSERT INTO public.invite_applications (user_id, tenant_id, full_name, email, website_url)
      VALUES ($1, $2, 'Ada Founder', 'a@x.test', 'https://ada.app')`, [applicant, tenantId]);
  }, 30_000);
  beforeEach(async () => { await db.exec("BEGIN"); });
  afterEach(async () => { await db.exec("ROLLBACK; RESET ROLE;"); });
  afterAll(async () => { await db?.close(); });

  const tenant = async () => (await db.query<{ access_status: string; trial_ends_at: Date | null }>(
    "SELECT access_status, trial_ends_at FROM public.tenants WHERE id = $1", [tenantId])).rows[0];

  it("starts new workspaces as pending", async () => {
    expect((await tenant()).access_status).toBe("pending");
  });

  it("lets applicants read only their own application and never write it", async () => {
    const own = await as("authenticated", applicant, () => db.query("SELECT full_name, status FROM public.invite_applications"));
    expect(own.rows).toEqual([{ full_name: "Ada Founder", status: "pending" }]);
    const others = await as("authenticated", other, () => db.query("SELECT id FROM public.invite_applications"));
    expect(others.rows).toHaveLength(0);
    await expect(as("authenticated", applicant, () => db.query("UPDATE public.invite_applications SET status = 'confirmed'"))).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", applicant, () => db.query("SELECT notes FROM public.invite_applications"))).rejects.toThrow(/permission denied/);
    await expect(as("anon", null, () => db.query("SELECT id FROM public.invite_applications"))).rejects.toThrow(/permission denied/);
  });

  it("confirming activates the workspace with a 3-month pass; rejecting locks it", async () => {
    await db.query("UPDATE public.invite_applications SET status = 'confirmed' WHERE user_id = $1", [applicant]);
    const active = await tenant();
    expect(active.access_status).toBe("active");
    const days = (active.trial_ends_at!.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(85);
    expect(days).toBeLessThan(95);
    const app = (await db.query<{ confirmed_at: Date | null; edge_synced_at: Date | null }>(
      "SELECT confirmed_at, edge_synced_at FROM public.invite_applications WHERE user_id = $1", [applicant])).rows[0];
    expect(app.confirmed_at).toBeInstanceOf(Date);
    expect(app.edge_synced_at).toBeNull();
    await db.query("UPDATE public.invite_applications SET status = 'rejected' WHERE user_id = $1", [applicant]);
    expect((await tenant()).access_status).toBe("rejected");
  });

  it("rejects malformed applications", async () => {
    await expect(db.query(`INSERT INTO public.invite_applications (user_id, full_name, email, website_url)
      VALUES ($1, 'X', 'b@x.test', 'javascript:alert(1)')`, [other])).rejects.toThrow(/check/);
  });
});
