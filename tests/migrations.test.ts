import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { createClient, type Client } from "@libsql/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const postgresMigration = readFileSync(
  new URL("../supabase/migrations/202611050001_phase_one.sql", import.meta.url),
  "utf8",
);
const sqliteMigration = readFileSync(
  new URL("../turso/migrations/001_phase_one.sql", import.meta.url),
  "utf8",
);

const authSetup = `
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE ROLE supabase_auth_admin NOLOGIN;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (
    id UUID PRIMARY KEY,
    email TEXT,
    raw_user_meta_data JSONB
  );
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE
    SET search_path = '' AS $$
      SELECT NULLIF(pg_catalog.current_setting('request.jwt.claim.sub', true), '')::UUID;
    $$;
  REVOKE ALL ON FUNCTION auth.uid() FROM PUBLIC;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role, supabase_auth_admin;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
  GRANT INSERT, SELECT ON auth.users TO supabase_auth_admin;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  -- Simulate Supabase's broad defaults; the migration must revoke them.
  ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
`;

const users = {
  owner: "11111111-1111-4111-8111-111111111111",
  outsider: "11111111-1111-4111-8111-222222222222",
  admin: "22222222-2222-4222-8222-222222222222",
  developer: "33333333-3333-4333-8333-333333333333",
  viewer: "44444444-4444-4444-8444-444444444444",
} as const;
const safeTenantColumns = "id, name, slug, public_key, owner_user_id, plan_tier, created_at, updated_at";
const tables = ["tenants", "tenant_memberships", "widget_configs", "churn_events"] as const;
type ApiRole = "anon" | "authenticated" | "service_role" | "supabase_auth_admin";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  public_key: string;
  signing_secret: string;
  owner_user_id: string;
  plan_tier: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  dodo_customer_id: string | null;
  dodo_subscription_id: string | null;
  created_at: Date;
  updated_at: Date;
}

describe("Phase 1 Supabase migration (in-memory Postgres)", () => {
  let db: PGlite;
  let ownerTenant: string;
  let outsiderTenant: string;

  // Savepoints keep expected permission failures from poisoning the test transaction.
  async function asRole<T>(role: ApiRole, userId: string | null, run: () => Promise<T>): Promise<T> {
    await db.exec("SAVEPOINT api_call");
    try {
      await db.exec(`SET LOCAL ROLE ${role}`);
      await db.query("SELECT pg_catalog.set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
      return await run();
    } finally {
      await db.exec("ROLLBACK TO SAVEPOINT api_call; RELEASE SAVEPOINT api_call;");
    }
  }

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(authSetup);
    await db.exec(postgresMigration);
    // The restricted auth role can provision public records only through the trigger.
    await db.exec("SET ROLE supabase_auth_admin");
    try {
      for (const [name, id] of Object.entries(users)) {
        await db.query("INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)", [
          id,
          `${name}@example.test`,
          JSON.stringify({ full_name: name === "outsider" ? "owner" : name }),
        ]);
      }
    } finally {
      await db.exec("RESET ROLE");
    }
    const tenants = await db.query<Tenant>("SELECT * FROM public.tenants");
    ownerTenant = tenants.rows.find((tenant) => tenant.owner_user_id === users.owner)!.id;
    outsiderTenant = tenants.rows.find((tenant) => tenant.owner_user_id === users.outsider)!.id;
    for (const role of ["admin", "developer", "viewer"] as const) {
      await db.query("INSERT INTO public.tenant_memberships (tenant_id, user_id, role) VALUES ($1, $2, $3)", [
        ownerTenant, users[role], role,
      ]);
    }
    for (const tenantId of [ownerTenant, outsiderTenant]) {
      await db.query(`INSERT INTO public.churn_events
        (tenant_id, customer_id, subscription_id, gateway, status, mrr_cents)
        VALUES ($1, 'customer', 'subscription', 'stripe', 'rescued_pause', 2500)`, [tenantId]);
    }
  }, 30_000);

  beforeEach(async () => { await db.exec("BEGIN"); });
  afterEach(async () => { await db.exec("ROLLBACK; RESET ROLE;"); });
  afterAll(async () => { await db?.close(); });

  it("provisions distinct tenants, owner memberships, keys, and every widget default", async () => {
    const { rows } = await db.query<Tenant>("SELECT * FROM public.tenants ORDER BY owner_user_id");
    expect(rows).toHaveLength(5);
    expect(new Set(rows.map((row) => row.slug)).size).toBe(5);
    expect(new Set(rows.map((row) => row.public_key)).size).toBe(5);
    expect(new Set(rows.map((row) => row.signing_secret)).size).toBe(5);
    for (const tenant of rows) {
      expect(tenant.slug).toMatch(/^[a-z0-9]+-[0-9a-f-]{36}$/);
      expect(tenant.slug.endsWith(tenant.owner_user_id)).toBe(true);
      expect(tenant.public_key).toMatch(/^bb_pub_[0-9a-f]{32}$/);
      expect(tenant.signing_secret).toMatch(/^bb_sec_[0-9a-f]{64}$/);
      expect(tenant.signing_secret.slice(7, 39)).not.toBe(tenant.signing_secret.slice(39));
      expect(tenant).toMatchObject({
        plan_tier: "starter", stripe_customer_id: null, stripe_subscription_id: null,
        dodo_customer_id: null, dodo_subscription_id: null,
      });
      expect(tenant.created_at).toBeInstanceOf(Date);
      expect(tenant.updated_at).toBeInstanceOf(Date);
      const membership = await db.query("SELECT role FROM public.tenant_memberships WHERE tenant_id = $1 AND user_id = $2", [
        tenant.id, tenant.owner_user_id,
      ]);
      expect(membership.rows).toEqual([{ role: "owner" }]);
      const widget = await db.query("SELECT * FROM public.widget_configs WHERE tenant_id = $1", [tenant.id]);
      expect(widget.rows).toEqual([{
        tenant_id: tenant.id,
        theme_preset: "neo_brutalist",
        accent_color: "#CCFF00",
        background_color: "#FFFFFF",
        text_color: "#0A0A0A",
        border_radius_px: 0,
        font_family: "JetBrains Mono",
        headline_text: "WAIT! DON'T LEAVE JUST YET.",
        body_text: "We would love to keep you around. Pick a rescue package below:",
        escape_hatch_text: "No thanks, proceed to complete cancellation →",
        primary_offer_type: "discount_and_pause",
        updated_at: expect.any(Date),
      }]);
    }
    expect(rows.filter((tenant) => tenant.name === "owner's Workspace")).toHaveLength(2);
  });

  it.each([
    { metadata: null, email: "fallback@example.test", name: "fallback", stem: "fallback" },
    { metadata: {}, email: "fallback@example.test", name: "fallback", stem: "fallback" },
    { metadata: { full_name: "" }, email: "fallback@example.test", name: "fallback", stem: "fallback" },
    { metadata: { full_name: " \t\n " }, email: "fallback@example.test", name: "fallback", stem: "fallback" },
    { metadata: { full_name: { role: "owner" } }, email: "fallback@example.test", name: "fallback", stem: "fallback" },
    { metadata: { full_name: "  李雷  " }, email: null, name: "李雷", stem: "workspace" },
    { metadata: { full_name: "!!!" }, email: null, name: "!!!", stem: "workspace" },
    { metadata: {}, email: "李雷@example.test", name: "李雷", stem: "workspace" },
    { metadata: {}, email: null, name: "User", stem: "user" },
    { metadata: {}, email: "@example.test", name: "User", stem: "user" },
    { metadata: { full_name: "A".repeat(5000) }, email: null, name: "A".repeat(100), stem: "a".repeat(48) },
  ])("safely provisions metadata/email fallback $stem", async ({ metadata, email, name, stem }) => {
    const id = "99999999-9999-4999-8999-999999999999";
    await db.exec("SET LOCAL ROLE supabase_auth_admin");
    await db.query("INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)", [
      id, email, metadata === null ? null : JSON.stringify(metadata),
    ]);
    await db.exec("RESET ROLE");
    const result = await db.query<Tenant>("SELECT * FROM public.tenants WHERE owner_user_id = $1", [id]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ name: `${name}'s Workspace`, slug: `${stem}-${id}` });
    const provisioned = await db.query(`SELECT membership.role FROM public.tenant_memberships AS membership
      JOIN public.widget_configs AS widget USING (tenant_id) WHERE membership.user_id = $1`, [id]);
    expect(provisioned.rows).toEqual([{ role: "owner" }]);
  });

  it("rolls back the auth user and both earlier inserts if widget provisioning fails", async () => {
    await db.exec(`ALTER TABLE public.widget_configs ADD CONSTRAINT reject_new_default
      CHECK (headline_text <> 'WAIT! DON''T LEAVE JUST YET.') NOT VALID`);
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    await expect(asRole("supabase_auth_admin", null, () => db.query(
      "INSERT INTO auth.users (id, email) VALUES ($1, 'rollback@example.test')", [id],
    ))).rejects.toThrow(/reject_new_default/);
    expect((await db.query("SELECT id FROM auth.users WHERE id = $1", [id])).rows).toEqual([]);
    expect((await db.query("SELECT id FROM public.tenants WHERE owner_user_id = $1", [id])).rows).toEqual([]);
    expect((await db.query("SELECT id FROM public.tenant_memberships WHERE user_id = $1", [id])).rows).toEqual([]);
    expect((await db.query<{ count: number }>("SELECT count(*)::int AS count FROM public.widget_configs")).rows[0].count).toBe(5);
  });

  it("enables RLS, installs exact ledger indexes, and pins definer function paths", async () => {
    const security = await db.query<{ relname: string; relrowsecurity: boolean }>(`
      SELECT relname, relrowsecurity FROM pg_catalog.pg_class
      WHERE oid IN ('public.tenants'::regclass, 'public.tenant_memberships'::regclass,
                    'public.widget_configs'::regclass, 'public.churn_events'::regclass)`);
    expect(security.rows).toHaveLength(4);
    expect(security.rows.every((row) => row.relrowsecurity)).toBe(true);
    const indexes = await db.query<{ indexname: string; indexdef: string }>(
      "SELECT indexname, indexdef FROM pg_catalog.pg_indexes WHERE schemaname = 'public'",
    );
    expect(indexes.rows.find((row) => row.indexname === "idx_churn_events_tenant_time")?.indexdef)
      .toContain("(tenant_id, created_at DESC)");
    expect(indexes.rows.find((row) => row.indexname === "idx_churn_events_mrr")?.indexdef)
      .toContain("(tenant_id, status, mrr_cents)");
    const functions = await db.query<{ proname: string; prosecdef: boolean; proconfig: string[] }>(`
      SELECT proname, prosecdef, proconfig FROM pg_catalog.pg_proc
      WHERE oid IN ('public.handle_new_user_provisioning()'::regprocedure,
                    'public.is_tenant_member(uuid)'::regprocedure,
                    'public.can_manage_tenant_widget(uuid)'::regprocedure)`);
    expect(functions.rows).toHaveLength(3);
    for (const fn of functions.rows) {
      expect(fn.prosecdef).toBe(true);
      expect(fn.proconfig).toContain('search_path=""');
    }
    for (const role of ["anon", "authenticated", "service_role"] as const) {
      const privileges = await db.query(`SELECT
        pg_catalog.has_function_privilege($1, 'public.handle_new_user_provisioning()', 'EXECUTE') AS provision,
        pg_catalog.has_function_privilege($1, 'public.set_updated_at()', 'EXECUTE') AS timestamp`, [role]);
      expect(privileges.rows).toEqual([{ provision: false, timestamp: false }]);
    }
  });

  it.each(["owner", "admin", "developer", "viewer"] as const)("lets %s read workspace widgets, membership, safe tenant columns, and ledger only", async (member) => {
    await asRole("authenticated", users[member], async () => {
      expect((await db.query(`SELECT ${safeTenantColumns} FROM public.tenants WHERE id = $1`, [ownerTenant])).rows).toHaveLength(1);
      for (const table of ["tenant_memberships", "widget_configs", "churn_events"] as const) {
        expect((await db.query(`SELECT * FROM public.${table} WHERE tenant_id = $1`, [ownerTenant])).rows.length).toBeGreaterThan(0);
        expect((await db.query(`SELECT * FROM public.${table} WHERE tenant_id = $1`, [outsiderTenant])).rows).toEqual([]);
      }
      expect((await db.query(`SELECT ${safeTenantColumns} FROM public.tenants WHERE id = $1`, [outsiderTenant])).rows).toEqual([]);
    });
  });

  it("gives an outsider only their own tenant and hides everything without a JWT subject", async () => {
    await asRole("authenticated", users.outsider, async () => {
      expect((await db.query("SELECT id FROM public.tenants")).rows).toEqual([{ id: outsiderTenant }]);
      expect((await db.query("SELECT * FROM public.widget_configs WHERE tenant_id = $1", [ownerTenant])).rows).toEqual([]);
      expect((await db.query("SELECT * FROM public.churn_events WHERE tenant_id = $1", [ownerTenant])).rows).toEqual([]);
      expect((await db.query("SELECT * FROM public.tenant_memberships WHERE tenant_id = $1", [ownerTenant])).rows).toEqual([]);
    });
    await asRole("authenticated", null, async () => {
      expect((await db.query("SELECT id FROM public.tenants")).rows).toEqual([]);
      for (const table of ["tenant_memberships", "widget_configs", "churn_events"] as const) {
        expect((await db.query(`SELECT * FROM public.${table}`)).rows).toEqual([]);
      }
    });
  });

  it.each(["owner", "admin", "developer", "viewer", "outsider"] as const)("denies %s secret and billing reads, including whole-row serialization", async (member) => {
    for (const statement of [
      "SELECT signing_secret FROM public.tenants",
      "SELECT * FROM public.tenants",
      "SELECT pg_catalog.row_to_json(tenants) FROM public.tenants",
      "SELECT id FROM public.tenants WHERE signing_secret LIKE 'bb_sec_%'",
      "SELECT id FROM public.tenants ORDER BY signing_secret",
      "SELECT stripe_customer_id, stripe_subscription_id, dodo_customer_id, dodo_subscription_id FROM public.tenants",
    ]) {
      await expect(asRole("authenticated", users[member], () => db.query(statement))).rejects.toThrow(/permission denied/);
    }
  });

  it("grants exactly the eight safe tenant SELECT columns", async () => {
    const allowed = await db.query<{ column_name: string }>(`SELECT column_name
      FROM information_schema.column_privileges
      WHERE table_schema = 'public' AND table_name = 'tenants'
        AND grantee = 'authenticated' AND privilege_type = 'SELECT' ORDER BY column_name`);
    expect(allowed.rows.map((row) => row.column_name)).toEqual(safeTenantColumns.split(", ").sort());
    expect((await db.query(`SELECT pg_catalog.has_table_privilege('authenticated', 'public.tenants', 'SELECT') AS allowed`)).rows)
      .toEqual([{ allowed: false }]);
  });

  it.each(["owner", "admin"] as const)("lets %s edit widgets but not other tenants", async (member) => {
    await asRole("authenticated", users[member], async () => {
      const changed = await db.query<{ theme_preset: string; updated_at: Date }>(`UPDATE public.widget_configs
        SET theme_preset = 'midnight_oled', accent_color = '#123ABC', border_radius_px = 12
        WHERE tenant_id = $1 RETURNING theme_preset, updated_at`, [ownerTenant]);
      expect(changed.rows).toHaveLength(1);
      expect(changed.rows[0].theme_preset).toBe("midnight_oled");
      expect(changed.rows[0].updated_at).toBeInstanceOf(Date);
      expect((await db.query(`UPDATE public.widget_configs SET headline_text = 'Intrusion'
        WHERE tenant_id = $1 RETURNING tenant_id`, [outsiderTenant])).rows).toEqual([]);
    });
  });

  it.each(["developer", "viewer", "outsider"] as const)("prevents %s widget writes", async (member) => {
    await asRole("authenticated", users[member], async () => {
      expect((await db.query(`UPDATE public.widget_configs SET headline_text = 'Intrusion'
        WHERE tenant_id = $1 RETURNING tenant_id`, [ownerTenant])).rows).toEqual([]);
    });
  });

  it.each(["owner", "admin", "developer", "viewer"] as const)("prevents %s privilege escalation and ledger writes", async (member) => {
    const statements = [
      `UPDATE public.tenants SET owner_user_id = '${users.outsider}' WHERE id = '${ownerTenant}'`,
      `UPDATE public.tenants SET plan_tier = 'scale' WHERE id = '${ownerTenant}'`,
      `UPDATE public.tenants SET signing_secret = 'attacker' WHERE id = '${ownerTenant}'`,
      `UPDATE public.tenants SET public_key = 'attacker' WHERE id = '${ownerTenant}'`,
      `INSERT INTO public.tenants (name, slug, owner_user_id) VALUES ('rogue', 'rogue', '${users[member]}')`,
      `DELETE FROM public.tenants WHERE id = '${ownerTenant}'`,
      `INSERT INTO public.tenant_memberships (tenant_id, user_id, role) VALUES ('${outsiderTenant}', '${users[member]}', 'owner')`,
      `UPDATE public.tenant_memberships SET role = 'owner' WHERE user_id = '${users[member]}'`,
      `DELETE FROM public.tenant_memberships WHERE tenant_id = '${ownerTenant}'`,
      `UPDATE public.widget_configs SET tenant_id = '${outsiderTenant}' WHERE tenant_id = '${ownerTenant}'`,
      `UPDATE public.widget_configs SET updated_at = '2000-01-01' WHERE tenant_id = '${ownerTenant}'`,
      `INSERT INTO public.widget_configs (tenant_id) VALUES ('${ownerTenant}')`,
      `DELETE FROM public.widget_configs WHERE tenant_id = '${ownerTenant}'`,
      `INSERT INTO public.churn_events (tenant_id, customer_id, subscription_id, gateway, status)
        VALUES ('${ownerTenant}', 'fake', 'fake', 'stripe', 'rescued_discount')`,
      `UPDATE public.churn_events SET mrr_cents = 999999 WHERE tenant_id = '${ownerTenant}'`,
      `DELETE FROM public.churn_events WHERE tenant_id = '${ownerTenant}'`,
    ];
    for (const statement of statements) {
      await expect(asRole("authenticated", users[member], () => db.query(statement))).rejects.toThrow(/permission denied/);
    }
  });

  it("has no self-enrollment policy even if INSERT is accidentally granted later", async () => {
    await db.exec("GRANT INSERT ON public.tenant_memberships TO authenticated");
    await expect(asRole("authenticated", users.outsider, () => db.query(
      "INSERT INTO public.tenant_memberships (tenant_id, user_id, role) VALUES ($1, $2, 'owner')",
      [ownerTenant, users.outsider],
    ))).rejects.toThrow(/row-level security/);
  });

  it("denies anonymous table access and direct helper/provisioning execution", async () => {
    for (const table of tables) {
      const columns = table === "tenants" ? "id" : "*";
      await expect(asRole("anon", users.owner, () => db.query(`SELECT ${columns} FROM public.${table}`)))
        .rejects.toThrow(/permission denied/);
      await expect(asRole("anon", users.owner, () => db.query(`DELETE FROM public.${table}`)))
        .rejects.toThrow(/permission denied/);
    }
    for (const fn of ["is_tenant_member", "can_manage_tenant_widget"] as const) {
      await expect(asRole("anon", users.owner, () => db.query(`SELECT public.${fn}($1)`, [ownerTenant])))
        .rejects.toThrow(/permission denied/);
    }
    for (const role of ["anon", "authenticated", "service_role"] as const) {
      await expect(asRole(role, users.owner, () => db.query("SELECT public.handle_new_user_provisioning()")))
        .rejects.toThrow(/permission denied/);
    }
  });

  it("cannot shadow the membership table via the caller's search_path", async () => {
    await db.exec(`CREATE TEMP TABLE tenant_memberships (tenant_id UUID, user_id UUID, role TEXT);
      INSERT INTO tenant_memberships VALUES ('${ownerTenant}', '${users.outsider}', 'owner');
      GRANT SELECT ON tenant_memberships TO authenticated;
      SET LOCAL search_path = pg_temp, public;`);
    await asRole("authenticated", users.outsider, async () => {
      const result = await db.query(`SELECT public.is_tenant_member($1) AS member,
        public.can_manage_tenant_widget($1) AS manager`, [ownerTenant]);
      expect(result.rows).toEqual([{ member: false, manager: false }]);
    });
  });

  it("gives the service role full backend access, also without BYPASSRLS", async () => {
    await db.exec("ALTER ROLE service_role NOBYPASSRLS");
    await asRole("service_role", null, async () => {
      expect((await db.query("SELECT signing_secret FROM public.tenants")).rows).toHaveLength(5);
      for (const table of tables) {
        for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) {
          const privileges = await db.query(`SELECT pg_catalog.has_table_privilege(
            'service_role', $1, $2) AS allowed`, [`public.${table}`, privilege]);
          expect(privileges.rows).toEqual([{ allowed: true }]);
        }
      }
      const result = await db.query(`UPDATE public.tenants SET plan_tier = 'scale',
        signing_secret = 'server-rotated-secret', owner_user_id = $1
        WHERE id = $2 RETURNING plan_tier, signing_secret, owner_user_id`, [users.admin, ownerTenant]);
      expect(result.rows).toEqual([{ plan_tier: "scale", signing_secret: "server-rotated-secret", owner_user_id: users.admin }]);
      await db.query("INSERT INTO public.tenant_memberships (tenant_id, user_id, role) VALUES ($1, $2, 'viewer')", [ownerTenant, users.outsider]);
      const event = await db.query<{ id: string }>(`INSERT INTO public.churn_events
        (tenant_id, customer_id, subscription_id, gateway, status)
        VALUES ($1, 'server', 'server', 'dodo_payments', 'intercepted') RETURNING id`, [ownerTenant]);
      expect(event.rows).toHaveLength(1);
      expect((await db.query("DELETE FROM public.churn_events WHERE id = $1 RETURNING id", [event.rows[0].id])).rows).toHaveLength(1);
    });
  });

  it("maintains updated_at even when a backend caller supplies an old timestamp", async () => {
    await asRole("service_role", null, async () => {
      for (const [table, key] of [["tenants", "id"], ["widget_configs", "tenant_id"]] as const) {
        const result = await db.query<{ updated_at: Date }>(`UPDATE public.${table}
          SET updated_at = '2000-01-01T00:00:00Z' WHERE ${key} = $1 RETURNING updated_at`, [ownerTenant]);
        expect(result.rows[0].updated_at.getTime()).toBeGreaterThan(Date.parse("2020-01-01T00:00:00Z"));
      }
    });
  });

  it("enforces relational constraints and cascades auth-user deletion", async () => {
    await expect(asRole("service_role", null, () => db.query(`INSERT INTO public.tenant_memberships
      (tenant_id, user_id, role) VALUES ($1, $2, 'owner')`, [ownerTenant, users.owner])))
      .rejects.toThrow(/unique constraint/);
    for (const statement of [
      `UPDATE public.tenants SET plan_tier = 'unlimited' WHERE id = '${ownerTenant}'`,
      `UPDATE public.tenant_memberships SET role = 'superadmin' WHERE tenant_id = '${ownerTenant}'`,
      `UPDATE public.widget_configs SET theme_preset = 'unknown' WHERE tenant_id = '${ownerTenant}'`,
      `UPDATE public.widget_configs SET primary_offer_type = 'unknown' WHERE tenant_id = '${ownerTenant}'`,
      `UPDATE public.churn_events SET gateway = 'unknown' WHERE tenant_id = '${ownerTenant}'`,
      `UPDATE public.churn_events SET status = 'unknown' WHERE tenant_id = '${ownerTenant}'`,
      `UPDATE public.churn_events SET mrr_cents = -1 WHERE tenant_id = '${ownerTenant}'`,
    ]) {
      await expect(asRole("service_role", null, () => db.query(statement))).rejects.toThrow(/check constraint/);
    }
    await db.query("DELETE FROM auth.users WHERE id = $1", [users.owner]);
    expect((await db.query("SELECT id FROM public.tenants WHERE id = $1", [ownerTenant])).rows).toEqual([]);
    for (const table of ["tenant_memberships", "widget_configs", "churn_events"] as const) {
      expect((await db.query(`SELECT * FROM public.${table} WHERE tenant_id = $1`, [ownerTenant])).rows).toEqual([]);
    }
    expect((await db.query("SELECT id FROM public.tenants WHERE id = $1", [outsiderTenant])).rows).toHaveLength(1);
  });

  it("rolls back all migration DDL if a statement fails before COMMIT", async () => {
    const isolated = new PGlite();
    try {
      await isolated.exec(authSetup);
      await expect(isolated.exec(postgresMigration.replace("COMMIT;", "SELECT phase_one_missing_function();\nCOMMIT;")))
        .rejects.toThrow(/does not exist/);
      await isolated.exec("ROLLBACK");
      expect((await isolated.query(`SELECT pg_catalog.to_regclass('public.tenants') AS tenants,
        pg_catalog.to_regclass('public.churn_events') AS ledger,
        pg_catalog.to_regprocedure('public.handle_new_user_provisioning()') AS provision`)).rows)
        .toEqual([{ tenants: null, ledger: null, provision: null }]);
      await isolated.exec(postgresMigration);
      expect((await isolated.query("SELECT * FROM public.tenants")).rows).toEqual([]);
    } finally {
      await isolated.close();
    }
  }, 30_000);
});

describe("Phase 1 Turso migration (in-memory libSQL)", () => {
  let db: Client;

  beforeEach(async () => {
    db = createClient({ url: ":memory:" });
    await db.executeMultiple(sqliteMigration);
    await db.execute(`INSERT INTO edge_tenants (tenant_id, public_key, signing_secret_hash)
      VALUES ('tenant-a', 'bb_pub_a', 'hash-a')`);
    await db.execute(`INSERT INTO edge_retention_rules (rule_id, tenant_id, trigger_condition, offer_type)
      VALUES ('rule-a', 'tenant-a', '{"min_billing_months":2,"plan_tier":"all"}', 'discount')`);
  });
  afterEach(() => { db?.close(); });

  it("creates exact lookup indexes, non-null columns, defaults, and foreign keys", async () => {
    for (const [index, columns] of [
      ["idx_edge_tenants_public_key", ["public_key"]],
      ["idx_edge_rules_lookup", ["tenant_id", "is_active", "priority"]],
      ["idx_nonces_expiry", ["expires_at"]],
    ] as const) {
      const result = await db.execute(`PRAGMA index_info('${index}')`);
      expect(result.rows.map((row) => row.name)).toEqual(columns);
    }
    for (const table of ["edge_tenants", "edge_retention_rules", "edge_used_nonces"] as const) {
      const info = await db.execute(`PRAGMA table_info('${table}')`);
      expect(info.rows.every((column) => column.notnull === 1)).toBe(true);
    }
    const tenant = await db.execute("SELECT * FROM edge_tenants");
    expect(tenant.rows[0]).toMatchObject({
      tenant_id: "tenant-a", status: "active", monthly_intercept_quota: 1000, current_month_usage: 0,
      created_at: expect.any(String), updated_at: expect.any(String),
    });
    const rule = await db.execute("SELECT * FROM edge_retention_rules");
    expect(rule.rows[0]).toMatchObject({
      priority: 1, discount_percentage: 0, discount_duration_months: 0, pause_duration_days: 30, is_active: 1,
    });
    expect((await db.execute("PRAGMA foreign_keys")).rows[0].foreign_keys).toBe(1);
  });

  it.each([
    ["tenant_id", null], ["tenant_id", ""], ["public_key", null], ["public_key", " "],
    ["signing_secret_hash", null], ["signing_secret_hash", ""],
    ["status", null], ["status", "unknown"],
    ["monthly_intercept_quota", null], ["monthly_intercept_quota", -1],
    ["monthly_intercept_quota", 1.5], ["monthly_intercept_quota", "unlimited"],
    ["current_month_usage", null], ["current_month_usage", -1], ["current_month_usage", 0.5],
    ["created_at", null], ["created_at", "invalid"], ["updated_at", null], ["updated_at", "invalid"],
  ] as const)("rejects invalid tenant %s = %s", async (column, value) => {
    await expect(db.execute({ sql: `UPDATE edge_tenants SET ${column} = ? WHERE tenant_id = 'tenant-a'`, args: [value] }))
      .rejects.toThrow();
  });

  it.each([
    ["rule_id", null], ["rule_id", ""], ["tenant_id", null], ["tenant_id", "missing"],
    ["priority", null], ["priority", -1], ["priority", 0.5],
    ["trigger_condition", null], ["trigger_condition", "invalid"], ["trigger_condition", "[]"],
    ["trigger_condition", "null"], ["offer_type", null], ["offer_type", "free_forever"],
    ["discount_percentage", null], ["discount_percentage", -1], ["discount_percentage", 10001],
    ["discount_percentage", 0.5], ["discount_duration_months", null], ["discount_duration_months", -1],
    ["discount_duration_months", 1.5], ["pause_duration_days", null], ["pause_duration_days", -1],
    ["pause_duration_days", 1.5], ["is_active", null], ["is_active", 2], ["is_active", "true"],
    ["created_at", null], ["created_at", "invalid"],
  ] as const)("rejects invalid retention rule %s = %s", async (column, value) => {
    await expect(db.execute({ sql: `UPDATE edge_retention_rules SET ${column} = ? WHERE rule_id = 'rule-a'`, args: [value] }))
      .rejects.toThrow();
  });

  it("enforces unique keys, supports valid boundary values, and cascades rules", async () => {
    await expect(db.execute(`INSERT INTO edge_tenants (tenant_id, public_key, signing_secret_hash)
      VALUES ('tenant-b', 'bb_pub_a', 'hash-b')`)).rejects.toThrow(/UNIQUE/);
    await expect(db.execute(`INSERT INTO edge_tenants (tenant_id, public_key, signing_secret_hash)
      VALUES ('tenant-a', 'bb_pub_b', 'hash-b')`)).rejects.toThrow(/UNIQUE/);
    await expect(db.execute(`INSERT INTO edge_retention_rules (rule_id, tenant_id, trigger_condition, offer_type)
      VALUES ('rule-a', 'tenant-a', '{}', 'pause')`)).rejects.toThrow(/UNIQUE/);
    for (const status of ["active", "suspended", "trial"]) {
      await db.execute({ sql: "UPDATE edge_tenants SET status = ?, monthly_intercept_quota = 0, current_month_usage = 0", args: [status] });
    }
    for (const offer of ["discount", "pause", "survey_only"]) {
      await db.execute({ sql: `UPDATE edge_retention_rules SET offer_type = ?, discount_percentage = 10000,
        discount_duration_months = 0, pause_duration_days = 0, is_active = 0`, args: [offer] });
    }
    await db.execute("DELETE FROM edge_tenants WHERE tenant_id = 'tenant-a'");
    expect((await db.execute("SELECT * FROM edge_retention_rules")).rows).toEqual([]);
  });

  it("accepts exactly one atomic nonce claim, including competing cross-tenant attempts", async () => {
    const claim = (tenant: string) => db.execute({
      sql: `INSERT INTO edge_used_nonces (nonce, tenant_id, expires_at) VALUES (?, ?, ?)
        ON CONFLICT(nonce) DO NOTHING`,
      args: ["single-use", tenant, "2099-01-01T00:00:00.000Z"],
    });
    const results = await Promise.all([claim("tenant-a"), claim("tenant-b"), claim("tenant-a")]);
    expect(results.map((result) => result.rowsAffected).sort()).toEqual([0, 0, 1]);
    expect((await db.execute("SELECT * FROM edge_used_nonces")).rows).toHaveLength(1);
    await expect(db.execute(`INSERT INTO edge_used_nonces (nonce, tenant_id, expires_at)
      VALUES ('single-use', 'tenant-a', '2099-01-01T00:00:00Z')`)).rejects.toThrow(/UNIQUE/);
  });

  it.each([
    ["nonce", null], ["nonce", ""], ["tenant_id", null], ["tenant_id", " "],
    ["expires_at", null], ["expires_at", "invalid"], ["expires_at", "2026-11-05"],
    ["expires_at", "2026-11-05 12:00:00"], ["expires_at", "2026-99-99T00:00:00Z"],
    ["expires_at", 1700000000], ["created_at", null], ["created_at", "invalid"],
  ] as const)("rejects invalid nonce %s = %s", async (column, value) => {
    await db.execute(`INSERT INTO edge_used_nonces (nonce, tenant_id, expires_at)
      VALUES ('nonce-a', 'tenant-a', '2099-01-01T00:00:00Z')`);
    await expect(db.execute({ sql: `UPDATE edge_used_nonces SET ${column} = ? WHERE nonce = 'nonce-a'`, args: [value] }))
      .rejects.toThrow();
  });

  it("prunes ISO expiries using julianday, including offsets and the exact expiry boundary", async () => {
    const now = "2026-11-05T00:30:00.000Z";
    for (const [nonce, expiry] of [
      ["expired", "2026-11-04T23:00:00.000Z"],
      ["boundary", now],
      ["expired-offset", "2026-11-05T01:00:00+01:00"],
      ["future-offset", "2026-11-04T23:45:00-01:00"],
      ["future", "2026-11-05T01:30:00.000Z"],
    ]) {
      await db.execute({ sql: "INSERT INTO edge_used_nonces (nonce, tenant_id, expires_at) VALUES (?, 'tenant-a', ?)", args: [nonce, expiry] });
    }
    const removed = await db.execute({ sql: "DELETE FROM edge_used_nonces WHERE julianday(expires_at) <= julianday(?)", args: [now] });
    expect(removed.rowsAffected).toBe(3);
    expect((await db.execute("SELECT nonce FROM edge_used_nonces ORDER BY nonce")).rows.map((row) => row.nonce))
      .toEqual(["future", "future-offset"]);
    // Cleanup must preserve replay locks for tokens that have not expired.
    const replay = await db.execute(`INSERT INTO edge_used_nonces (nonce, tenant_id, expires_at)
      VALUES ('future', 'tenant-a', '2026-11-05T01:30:00.000Z') ON CONFLICT(nonce) DO NOTHING`);
    expect(replay.rowsAffected).toBe(0);
  });

  it("can roll back the entire migration on a DDL failure", async () => {
    const isolated = createClient({ url: ":memory:" });
    try {
      await expect(isolated.executeMultiple(sqliteMigration.replace("COMMIT;", "SELECT phase_one_missing_function();\nCOMMIT;")))
        .rejects.toThrow();
      // executeMultiple automatically rolls back its open transaction on error.
      const remaining = await isolated.execute("SELECT name FROM sqlite_master WHERE name LIKE 'edge_%' OR name LIKE 'idx_%'");
      expect(remaining.rows).toEqual([]);
      await isolated.executeMultiple(sqliteMigration);
      expect((await isolated.execute("SELECT * FROM edge_tenants")).rows).toEqual([]);
    } finally {
      isolated.close();
    }
  });
});
