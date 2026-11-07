import { readFileSync } from "node:fs";
import { edgeSchemaSql } from "./helpers/edge-schema";
import { PGlite } from "@electric-sql/pglite";
import { createClient, type Client } from "@libsql/client";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(), client: vi.fn(), server: vi.fn(), context: vi.fn(), turso: vi.fn(),
}));
vi.mock("@/backend/supabase/admin", () => ({ createSupabaseAdmin: mocks.admin }));
vi.mock("@/backend/supabase/client", () => ({ createSupabaseServerClient: mocks.client }));
vi.mock("@/backend/supabase/server", () => ({ createServerSupabaseClient: mocks.server }));
vi.mock("@/backend/supabase/session", () => ({ requireDashboardContext: mocks.context }));
vi.mock("@/backend/supabase/config", () => ({ getAppUrl: () => new URL("https://app.example.test") }));
vi.mock("@/backend/turso-edge/client", () => ({ createTursoClient: mocks.turso }));

import { ensureWorkspace } from "@/backend/workspace/provision";
import { getWorkspaceSetup } from "@/backend/workspace/setup";
import { parseSetupChoices } from "@/backend/workspace/contract";
import { workspaceIntegration } from "@/backend/workspace/integration";
import { hashSigningSecret } from "@/lib/edge/tenant-secret";
import { GET, POST } from "@/app/api/workspace/setup/route";

const phaseOne = readFileSync(new URL("../supabase/migrations/202611050001_phase_one.sql", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/202611060001_workspace_onboarding.sql", import.meta.url), "utf8");
const edgeMigration = edgeSchemaSql();
const userId = "11111111-1111-4111-8111-111111111111";
const otherUser = "22222222-2222-4222-8222-222222222222";
const tenantId = "33333333-3333-4333-8333-333333333333";
const publicKey = "bb_pub_44444444444444444444444444444444";
const secret = `bb_sec_${"a".repeat(64)}`; // Local fixture, never a service credential.
const authSetup = `
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
`;

describe("Workspace migration on local PGlite", () => {
  let pg: PGlite;
  beforeAll(async () => {
    pg = new PGlite();
    await pg.exec(authSetup);
    await pg.exec(phaseOne);
    await pg.exec(migration);
  });
  beforeEach(() => pg.exec("BEGIN"));
  afterEach(() => pg.exec("ROLLBACK; RESET ROLE"));
  afterAll(() => pg.close());

  async function addUser(id = userId, metadata: unknown = { full_name: "  Test Owner  " }, email: string | null = "owner@example.test") {
    await pg.query("INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)", [id, email, JSON.stringify(metadata)]);
    return (await pg.query<{ id: string }>("SELECT id FROM public.tenants WHERE owner_user_id = $1", [id])).rows[0].id;
  }
  async function rpc(id = userId) {
    return (await pg.query<{ id: string }>("SELECT public.ensure_workspace_for_user($1) AS id", [id])).rows[0].id;
  }
  async function denied(role: string, sql: string) {
    await pg.exec("SAVEPOINT permission_check");
    try {
      await pg.exec(`SET LOCAL ROLE ${role}`);
      await expect(pg.query(sql)).rejects.toThrow(/permission denied/);
    } finally {
      await pg.exec("ROLLBACK TO SAVEPOINT permission_check; RELEASE SAVEPOINT permission_check");
    }
  }

  it("reuses signup provisioning and preserves keys, widgets and completion across repeated calls", async () => {
    const id = await addUser();
    await pg.query("UPDATE public.tenants SET onboarding_completed_at = '2026-11-06' WHERE id = $1", [id]);
    await pg.query("UPDATE public.widget_configs SET headline_text = 'Custom headline' WHERE tenant_id = $1", [id]);
    const before = (await pg.query("SELECT * FROM public.tenants")).rows;
    expect(await rpc()).toBe(id);
    expect(await rpc()).toBe(id);
    expect((await pg.query("SELECT * FROM public.tenants")).rows).toEqual(before);
    expect((await pg.query("SELECT role FROM public.tenant_memberships")).rows).toEqual([{ role: "owner" }]);
    expect((await pg.query("SELECT headline_text FROM public.widget_configs")).rows).toEqual([{ headline_text: "Custom headline" }]);
  });

  it("serializes competing invocations and includes a real auth.users FOR UPDATE lock", async () => {
    await addUser();
    await pg.query("DELETE FROM public.tenants WHERE owner_user_id = $1", [userId]);
    // PGlite queues queries on one session; this proves repeated/concurrent caller
    // idempotence, while the definition assertion checks the PostgreSQL row lock.
    const ids = await Promise.all(Array.from({ length: 8 }, () => rpc()));
    expect(new Set(ids).size).toBe(1);
    for (const table of ["tenants", "tenant_memberships", "widget_configs"]) {
      expect((await pg.query(`SELECT count(*)::int AS n FROM public.${table}`)).rows).toEqual([{ n: 1 }]);
    }
    const definition = (await pg.query<{ source: string }>("SELECT pg_catalog.pg_get_functiondef('public.ensure_workspace_for_user(uuid)'::regprocedure) AS source")).rows[0].source;
    expect(definition).toMatch(/FROM auth\.users WHERE id = p_user_id FOR UPDATE/);
    expect(definition.indexOf("FOR UPDATE")).toBeLessThan(definition.indexOf("FROM public.tenant_memberships"));
  });

  it("reuses earliest membership before owned tenants and never elevates invited viewers", async () => {
    const own = await addUser();
    const invited = await addUser(otherUser);
    await pg.query("UPDATE public.tenant_memberships SET created_at = '2026-11-06' WHERE user_id = $1", [userId]);
    await pg.query("INSERT INTO public.tenant_memberships (tenant_id,user_id,role,created_at) VALUES ($1,$2,'viewer','2020-01-01')", [invited, userId]);
    await pg.query("DELETE FROM public.widget_configs WHERE tenant_id = $1", [invited]);
    expect(await rpc()).toBe(invited);
    expect((await pg.query("SELECT role FROM public.tenant_memberships WHERE tenant_id = $1 AND user_id = $2", [invited, userId])).rows).toEqual([{ role: "viewer" }]);
    expect((await pg.query("SELECT tenant_id FROM public.widget_configs WHERE tenant_id = $1", [invited])).rows).toHaveLength(1);
    expect((await pg.query("SELECT id FROM public.tenants WHERE id = $1", [own])).rows).toHaveLength(1);
  });

  it("repairs earliest owned tenant, owner membership and widget without creating another tenant", async () => {
    const original = await addUser();
    await pg.query("UPDATE public.tenants SET created_at = '2020-01-01' WHERE id = $1", [original]);
    await pg.query("INSERT INTO public.tenants(name,slug,owner_user_id) VALUES ('Second','second',$1)", [userId]);
    await pg.query("DELETE FROM public.tenant_memberships WHERE user_id = $1", [userId]);
    await pg.query("DELETE FROM public.widget_configs WHERE tenant_id = $1", [original]);
    expect(await rpc()).toBe(original);
    expect((await pg.query("SELECT tenant_id,role FROM public.tenant_memberships WHERE user_id = $1", [userId])).rows).toEqual([{ tenant_id: original, role: "owner" }]);
    expect((await pg.query("SELECT id FROM public.tenants")).rows).toHaveLength(2);
  });

  it.each([
    [{ full_name: "A".repeat(5000) }, null, "A".repeat(100), "a".repeat(48)],
    [{ full_name: { bad: true } }, "fallback@example.test", "fallback", "fallback"],
    [{ full_name: "  李雷  " }, null, "李雷", "workspace"],
    [null, null, "User", "user"],
    [{ full_name: " \t\n " }, "fallback@example.test", "fallback", "fallback"],
  ])("backfills bounded metadata %j", async (metadata, email, name, stem) => {
    await addUser(userId, metadata, email as string | null);
    await pg.query("DELETE FROM public.tenants WHERE owner_user_id = $1", [userId]);
    const id = await rpc();
    expect((await pg.query("SELECT name,slug,onboarding_completed_at FROM public.tenants WHERE id = $1", [id])).rows)
      .toEqual([{ name: `${name}'s Workspace`, slug: `${stem}-${userId}`, onboarding_completed_at: null }]);
  });

  it("is service-only with a pinned SECURITY DEFINER path and no extra column privileges", async () => {
    const id = await addUser();
    const security = (await pg.query("SELECT prosecdef,proconfig FROM pg_catalog.pg_proc WHERE oid = 'public.ensure_workspace_for_user(uuid)'::regprocedure")).rows[0];
    expect(security).toMatchObject({ prosecdef: true, proconfig: ['search_path=""'] });
    for (const role of ["anon", "authenticated", "supabase_auth_admin"]) {
      await denied(role, `SELECT public.ensure_workspace_for_user('${userId}')`);
    }
    await pg.exec("SET LOCAL ROLE service_role");
    expect(await rpc()).toBe(id);
    await pg.exec("RESET ROLE; SET LOCAL ROLE authenticated");
    await pg.query("SELECT pg_catalog.set_config('request.jwt.claim.sub',$1,true)", [userId]);
    expect((await pg.query("SELECT onboarding_completed_at FROM public.tenants")).rows).toEqual([{ onboarding_completed_at: null }]);
    await pg.exec("RESET ROLE");
    for (const sql of ["SELECT signing_secret FROM public.tenants", "SELECT * FROM public.tenants", "UPDATE public.tenants SET onboarding_completed_at = now()"]) {
      await denied("authenticated", sql);
    }
    const grants = await pg.query<{ column_name: string }>(`SELECT column_name FROM information_schema.column_privileges
      WHERE table_name='tenants' AND grantee='authenticated' AND privilege_type='SELECT' ORDER BY column_name`);
    expect(grants.rows.map((row) => row.column_name)).toEqual([
      "created_at", "id", "name", "onboarding_completed_at", "owner_user_id", "plan_tier", "public_key", "slug", "updated_at",
    ]);
  });

  it("rolls back newly created records if widget repair fails", async () => {
    await addUser();
    await pg.query("DELETE FROM public.tenants WHERE owner_user_id = $1", [userId]);
    await pg.exec("ALTER TABLE public.widget_configs ADD CONSTRAINT no_defaults CHECK (font_family <> 'JetBrains Mono') NOT VALID; SAVEPOINT failed_rpc");
    await expect(rpc()).rejects.toThrow(/no_defaults/);
    await pg.exec("ROLLBACK TO SAVEPOINT failed_rpc");
    expect((await pg.query("SELECT id FROM public.tenants")).rows).toEqual([]);
    expect((await pg.query("SELECT id FROM public.tenant_memberships")).rows).toEqual([]);
  });

  it("rejects missing users instead of creating orphan workspaces", async () => {
    await expect(rpc()).rejects.toThrow(/does not exist/);
  });
});

describe("Workspace provisioning and setup with mocked Supabase + local libSQL", () => {
  let db: Client;
  let role: string;
  let authenticated: boolean;
  let membershipExists: boolean;
  let completedAt: string | null;
  let completionFails: boolean;
  let bindingFails: boolean;
  let edgeFails: boolean;
  let queries: string[];
  let completionWrites: number;
  let getUser: ReturnType<typeof vi.fn>;
  let rpc: ReturnType<typeof vi.fn>;
  let cookieAdapter: { setAll?: (cookies: unknown[], headers?: Record<string, string>) => void } | undefined;
  let edgeBatch: ReturnType<typeof vi.fn>;

  function client(admin: boolean) {
    return {
      auth: { getUser }, rpc,
      from(table: string) {
        let columns = "";
        let updating = false;
        let update: Record<string, unknown> = {};
        const builder = {
          select(value: string) { columns = value; queries.push(`${admin ? "admin" : "user"}:${table}:${value}`); return builder; },
          eq: vi.fn().mockImplementation(() => builder),
          order: vi.fn().mockImplementation(() => builder),
          limit: vi.fn().mockImplementation(() => builder),
          returns: vi.fn().mockImplementation(() => builder),
          update(value: Record<string, unknown>) { updating = true; update = value; return builder; },
          async maybeSingle() { return builder.single(); },
          async single(): Promise<{ data: Record<string, unknown> | null; error: unknown }> {
            if (table === "tenant_memberships") {
              return { data: membershipExists ? { tenant_id: tenantId, role } : null, error: null };
            }
            if (updating) {
              completionWrites++;
              if (!admin || completionFails) return { data: null, error: new Error(`private ${secret}`) };
              completedAt = update.onboarding_completed_at as string;
              return { data: { id: tenantId }, error: null };
            }
            if (bindingFails) return { data: null, error: new Error(`private ${secret}`) };
            const all: Record<string, unknown> = { id: tenantId, public_key: publicKey, signing_secret: secret, onboarding_completed_at: completedAt };
            if (!admin && columns.includes("signing_secret")) throw new Error("Secret accessed with authenticated client");
            return { data: Object.fromEntries(columns.split(",").map((name) => [name.trim(), all[name.trim()]])), error: null };
          },
        };
        return builder;
      },
    };
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    db = createClient({ url: ":memory:" });
    await db.executeMultiple(edgeMigration);
    role = "owner"; authenticated = true; membershipExists = true; completedAt = null;
    completionFails = false; bindingFails = false; edgeFails = false;
    queries = []; completionWrites = 0; cookieAdapter = undefined;
    getUser = vi.fn(async () => {
      cookieAdapter?.setAll?.([{ name: "session", value: "refreshed-local-session", options: { path: "/", httpOnly: true } }]);
      return { data: { user: authenticated ? { id: userId } : null }, error: null };
    });
    rpc = vi.fn(async () => ({ data: tenantId, error: null }));
    mocks.admin.mockImplementation(() => client(true));
    mocks.client.mockImplementation((cookies) => { cookieAdapter = cookies; return client(false); });
    mocks.server.mockImplementation(() => client(false));
    mocks.context.mockImplementation(async () => ({
      user: { id: userId }, membership: { tenant_id: tenantId, role }, tenant: { id: tenantId, name: "Workspace", slug: "workspace" },
    }));
    edgeBatch = vi.fn(async (...args: Parameters<Client["batch"]>) => {
      if (edgeFails) throw new Error(`private edge failure ${secret}`);
      return db.batch(...args);
    });
    mocks.turso.mockImplementation((signal: AbortSignal) => {
      expect(signal).toBeInstanceOf(AbortSignal);
      return { execute: db.execute.bind(db), batch: edgeBatch, close: vi.fn() };
    });
    // No test may accidentally contact an external service.
    vi.stubGlobal("fetch", vi.fn(() => { throw new Error("External network is forbidden in workspace tests"); }));
  });
  afterEach(() => { db.close(); vi.unstubAllGlobals(); });

  function request(body: unknown = { discountTier: "30_3mo", pauseTier: "60_day" }, origin: string | null = "https://app.example.test") {
    return new NextRequest("https://app.example.test/api/workspace/setup", {
      method: "POST", headers: { "Content-Type": "application/json", ...(origin === null ? {} : { Origin: origin }) },
      body: JSON.stringify(body),
    });
  }
  async function ruleRows() {
    return (await db.execute("SELECT * FROM edge_retention_rules ORDER BY rule_id")).rows;
  }

  it("concurrently provisions one binding and deterministic unconditional defaults", async () => {
    const outcomes = await Promise.all(Array.from({ length: 5 }, () => ensureWorkspace(userId)));
    expect(outcomes).toEqual(Array(5).fill({ tenantId, onboardingCompleted: false, accessStatus: "active" }));
    expect(rpc).toHaveBeenCalledWith("ensure_workspace_for_user", { p_user_id: userId });
    const tenants = await db.execute("SELECT * FROM edge_tenants");
    expect(tenants.rows).toHaveLength(1);
    expect(tenants.rows[0]).toMatchObject({ tenant_id: tenantId, public_key: publicKey, signing_secret_hash: await hashSigningSecret(secret) });
    expect(tenants.rows[0].signing_secret_hash).not.toBe(secret);
    const rules = await ruleRows();
    expect(rules).toHaveLength(2);
    expect(rules[0]).toMatchObject({ rule_id: `${tenantId}:discount`, trigger_condition: "{}", offer_type: "discount", discount_percentage: 5000, discount_duration_months: 2 });
    expect(rules[1]).toMatchObject({ rule_id: `${tenantId}:pause`, trigger_condition: "{}", pause_duration_days: 30 });
    expect(edgeBatch.mock.calls.every((call) => call[1] === "write")).toBe(true);
    expect(JSON.stringify(outcomes)).not.toContain(secret);
  });

  it("fails closed on sync errors then retries without resetting status, quota, usage or edited rules", async () => {
    await ensureWorkspace(userId);
    await db.execute("UPDATE edge_tenants SET status='suspended', monthly_intercept_quota=27, current_month_usage=26");
    await db.execute("UPDATE edge_retention_rules SET discount_percentage=1234, discount_duration_months=7, is_active=0, priority=9, trigger_condition='{\"plan_tier\":\"pro\"}'");
    const before = await ruleRows();
    edgeFails = true;
    await expect(ensureWorkspace(userId)).rejects.toThrow(/sync failed/);
    edgeFails = false;
    completedAt = "2026-11-06T00:00:00.000Z";
    expect(await ensureWorkspace(userId)).toEqual({ tenantId, onboardingCompleted: true, accessStatus: "active" });
    expect(await ruleRows()).toEqual(before);
    expect((await db.execute("SELECT status,monthly_intercept_quota,current_month_usage FROM edge_tenants")).rows[0])
      .toEqual({ status: "suspended", monthly_intercept_quota: 27, current_month_usage: 26 });
  });

  it("atomically rolls back binding and both default inserts on a rule failure", async () => {
    await db.execute("CREATE TRIGGER reject_pause BEFORE INSERT ON edge_retention_rules WHEN NEW.offer_type='pause' BEGIN SELECT RAISE(ABORT, 'test pause failure'); END");
    await expect(ensureWorkspace(userId)).rejects.toThrow(/sync failed/);
    expect((await db.execute("SELECT * FROM edge_tenants")).rows).toHaveLength(0);
    expect(await ruleRows()).toHaveLength(0);
    await db.execute("DROP TRIGGER reject_pause");
    await expect(ensureWorkspace(userId)).resolves.toMatchObject({ tenantId });
  });

  it("uses a 15-second edge deadline and never reports success after it expires", async () => {
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    edgeBatch.mockImplementationOnce(async (...args: Parameters<Client["batch"]>) => {
      const result = await db.batch(...args);
      controller.abort();
      return result;
    });
    try {
      await expect(ensureWorkspace(userId)).rejects.toThrow(/sync failed/);
      expect(timeout).toHaveBeenCalledWith(15_000);
      // The database may have committed despite a timed-out acknowledgement.
      // A retry is safe and no caller was told the workspace was ready.
      expect(await ruleRows()).toHaveLength(2);
    } finally {
      timeout.mockRestore();
    }
    await expect(ensureWorkspace(userId)).resolves.toEqual({ tenantId, onboardingCompleted: false, accessStatus: "active" });
  });

  it("does not continue to edge on invalid user, RPC failure or secret lookup failure", async () => {
    await expect(ensureWorkspace("not-a-user")).rejects.toThrow(/invalid/);
    expect(mocks.admin).not.toHaveBeenCalled();
    rpc.mockResolvedValueOnce({ data: null, error: { message: secret } });
    await expect(ensureWorkspace(userId)).rejects.toThrow("Workspace provisioning failed");
    bindingFails = true;
    await expect(ensureWorkspace(userId)).rejects.toThrow("Workspace binding is unavailable");
    expect(mocks.turso).not.toHaveBeenCalled();
  });

  it("GET reads actual public key/rules through verified context and preserves refreshed cookies", async () => {
    await ensureWorkspace(userId);
    mocks.admin.mockClear(); queries = [];
    await db.execute("UPDATE edge_retention_rules SET discount_percentage=1234 WHERE offer_type='discount'");
    const response = await GET(new NextRequest("https://app.example.test/api/workspace/setup"));
    expect(response.status).toBe(200);
    const setup = await response.json();
    expect(setup).toMatchObject({ tenantId, publicKey, appOrigin: "https://app.example.test", canManage: true, configuration: { discountTier: null, pauseTier: "30_day" } });
    expect(setup.configuration.rules[0].discountBasisPoints).toBe(1234);
    expect(mocks.context).toHaveBeenCalled();
    expect(getUser).toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(queries).toEqual(["user:tenants:id, public_key, onboarding_completed_at"]);
    expect(JSON.stringify(setup)).not.toMatch(/signing_secret|signingSecret|bb_sec_/);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("set-cookie")).toContain("session=refreshed-local-session");
  });

  it.each(["owner", "admin"])("lets %s transactionally save bounded real terms then complete onboarding", async (memberRole) => {
    await ensureWorkspace(userId);
    role = memberRole;
    await db.execute("UPDATE edge_retention_rules SET is_active=0,priority=9 WHERE offer_type='discount'");
    await db.execute({ sql: "INSERT INTO edge_retention_rules(rule_id,tenant_id,trigger_condition,offer_type) VALUES ('custom',?,'{}','survey_only')", args: [tenantId] });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(completedAt).not.toBeNull();
    expect(completionWrites).toBe(1);
    const result = await response.json();
    expect(result).toMatchObject({ onboardingCompleted: true, configuration: { discountTier: "30_3mo", pauseTier: "60_day" } });
    expect(result.configuration.rules.find((rule: { ruleId: string }) => rule.ruleId === `${tenantId}:discount`))
      .toMatchObject({ discountBasisPoints: 3000, discountDurationMonths: 3, isActive: false, priority: 9 });
    expect(result.configuration.rules.find((rule: { ruleId: string }) => rule.ruleId === `${tenantId}:pause`)).toMatchObject({ pauseDurationDays: 60 });
    expect(result.configuration.rules.some((rule: { ruleId: string }) => rule.ruleId === "custom")).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/signing_secret|signingSecret|bb_sec_/);
    expect(edgeBatch.mock.calls.filter((call) => call[1] === "write")).toHaveLength(2);
  });

  it.each(["developer", "viewer", "unknown"])("denies setup mutation by %s without touching edge or admin", async (memberRole) => {
    role = memberRole;
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(mocks.turso).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toContain("session=refreshed-local-session");
  });

  it("rejects unauthenticated requests and absent membership", async () => {
    authenticated = false;
    expect((await POST(request())).status).toBe(401);
    expect((await GET(new NextRequest("https://app.example.test/api/workspace/setup"))).status).toBe(401);
    authenticated = true; membershipExists = false;
    expect((await POST(request())).status).toBe(403);
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it.each([null, "null", "https://evil.test", "https://app.example.test/", "http://app.example.test", "https://app.example.test.evil.test", "https://APP.example.test"])("requires the exact canonical Origin: %s", async (origin) => {
    const response = await POST(request(undefined, origin));
    expect(response.status).toBe(403);
    expect(getUser).not.toHaveBeenCalled();
    expect(mocks.turso).not.toHaveBeenCalled();
  });

  it.each([
    null, [], {}, { discountTier: "50_2mo" }, { discountTier: "100_99mo", pauseTier: "30_day" },
    { discountTier: "50_2mo", pauseTier: "free_tier" }, { discountTier: 5000, pauseTier: 30 },
    { discountTier: "50_2mo", pauseTier: "30_day", tenantId: "attacker" },
    { discountTier: "50_2mo", pauseTier: "30_day", amount: 1 },
    { discountTier: "50_2mo", pauseTier: "30_day", signingSecret: "attacker" },
    { discountTier: "__proto__", pauseTier: "constructor" },
  ])("rejects unbounded or extra setup fields %j", async (body) => {
    expect(parseSetupChoices(body)).toBeNull();
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(mocks.turso).not.toHaveBeenCalled();
  });

  it("accepts the maximum offered discount and rejects malformed/oversized/non-JSON bodies", async () => {
    await ensureWorkspace(userId);
    expect((await POST(request({ discountTier: "1mo_free", pauseTier: "30_day" }))).status).toBe(200);
    expect((await db.execute("SELECT discount_percentage,discount_duration_months FROM edge_retention_rules WHERE offer_type='discount'")).rows[0])
      .toEqual({ discount_percentage: 10000, discount_duration_months: 1 });
    for (const [body, contentType, status] of [["{", "application/json", 400], ["x".repeat(1025), "application/json", 413], ["{}", "text/plain", 415]] as const) {
      const response = await POST(new NextRequest("https://app.example.test/api/workspace/setup", { method: "POST", headers: { Origin: "https://app.example.test", "Content-Type": contentType }, body }));
      expect(response.status).toBe(status);
    }
  });

  it("does not complete or partially edit offers when the second edge write fails", async () => {
    await ensureWorkspace(userId);
    const before = await ruleRows();
    await db.execute("CREATE TRIGGER reject_pause_update BEFORE UPDATE ON edge_retention_rules WHEN NEW.offer_type='pause' BEGIN SELECT RAISE(ABORT, 'test pause failure'); END");
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "edge_write_failed" });
    expect(completionWrites).toBe(0);
    expect(completedAt).toBeNull();
    expect(await ruleRows()).toEqual(before);
  });

  it("safely retries after completion failure without exposing upstream errors", async () => {
    await ensureWorkspace(userId);
    completionFails = true;
    const failed = await POST(request());
    expect(failed.status).toBe(503);
    const body = await failed.text();
    expect(body).toContain("completion_failed");
    expect(body).not.toContain(secret);
    expect(completedAt).toBeNull();
    const saved = await ruleRows();
    completionFails = false;
    expect((await POST(request())).status).toBe(200);
    expect(await ruleRows()).toEqual(saved);
  });

  it("does not claim setup readiness for an absent or mismatched edge binding", async () => {
    expect((await GET(new NextRequest("https://app.example.test/api/workspace/setup"))).status).toBe(503);
    expect((await POST(request())).status).toBe(503);
    expect(completionWrites).toBe(0);
    await ensureWorkspace(userId);
    await db.execute("UPDATE edge_tenants SET public_key='different-public-key'");
    await expect(getWorkspaceSetup(await mocks.context())).rejects.toThrow(/unavailable/);
  });

  it("generates real canonical endpoint snippets and a secret-free, signed-duration integration prompt", async () => {
    const integration = workspaceIntegration({ tenantId, publicKey, appOrigin: "https://app.example.test" });
    expect(integration.snippet).toContain("https://app.example.test");
    expect(integration.snippet).toContain(publicKey);
    expect(integration.snippet).toContain("/api/v1/intercept/init");
    expect(integration.snippet).toContain("/api/v1/intercept/claim");
    for (const text of [tenantId, "discountDurationMonths", "HS256", "exp - iat === 300", "ownership", "Atomically consume the nonce"]) {
      expect(integration.prompt).toContain(text);
    }
    expect(JSON.stringify(integration)).not.toContain(secret);
    expect(integration.snippet).not.toMatch(/cdn\.boolbul|npm i|\/rescue\//);
  });
});
