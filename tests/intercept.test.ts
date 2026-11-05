import { readFile } from "node:fs/promises";
import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as initialize, OPTIONS } from "../src/app/api/v1/intercept/init/route";
import { POST as claim } from "../src/app/api/v1/intercept/claim/route";
import { verifyOfferJwt } from "../src/lib/crypto/jwt";
import { hashSigningSecret } from "../src/lib/edge/tenant-secret";
import { consumeNonce, findActiveRules } from "../src/lib/edge/queries";
import { redeemOfferJwt } from "../src/lib/edge/redeem-offer";
import { InterceptError } from "../src/lib/edge/errors";

const state = vi.hoisted(() => ({ db: undefined as Client | undefined }));
vi.mock("../src/backend/turso-edge/client", () => ({
  createTursoClient: () => {
    if (!state.db) throw new Error("No test database");
    return { execute: state.db.execute.bind(state.db), close: () => undefined };
  },
}));
const secret = "tenant-secret-".repeat(4);
const identity = { publicKey: "bb_pub_test", customerId: "customer-1", subscriptionId: "subscription-1" };
const request = (body: unknown) => new Request("https://boolbul.com/api/v1/intercept/init", {
  method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
});

beforeEach(async () => {
  state.db = createClient({ url: ":memory:" });
  await state.db.executeMultiple(await readFile("turso/migrations/001_phase_one.sql", "utf8"));
  await state.db.execute({
    sql: "INSERT INTO edge_tenants(tenant_id, public_key, signing_secret_hash) VALUES(?, ?, ?)",
    args: ["tenant-1", identity.publicKey, await hashSigningSecret(secret)],
  });
  await state.db.execute({
    sql: `INSERT INTO edge_retention_rules(rule_id, tenant_id, trigger_condition, offer_type, discount_percentage, discount_duration_months)
          VALUES(?, ?, ?, 'discount', 5000, 2)`,
    args: ["discount-rule", "tenant-1", JSON.stringify({ min_billing_months: 0, plan_tier: "all" })],
  });
  vi.stubEnv("BOOLBUL_JWT_SECRET", "platform-secret-".repeat(4));
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-test-key");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json([{ signing_secret: secret }])));
});

afterEach(() => { state.db?.close(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("edge initialization and claim", () => {
  it("loads database rules, issues a bound token, and permits only one claim and redemption", async () => {
    const initResponse = await initialize(request(identity));
    expect(initResponse.status).toBe(200);
    const init = await initResponse.json();
    expect(init.rules).toEqual([{ ruleId: "discount-rule", offerType: "discount", offerValue: 5000, discountDurationMonths: 2 }]);
    expect(initResponse.headers.get("Cache-Control")).toContain("no-store");
    expect(JSON.stringify(init)).not.toContain(secret);
    const claimBody = { initToken: init.initToken, selection: "discount-rule", offerValue: 9000, discountDurationMonths: 99, customerId: "attacker" };
    const response = await claim(request(claimBody));
    expect(response.status).toBe(200);
    const { offerJwt } = await response.json();
    const binding = { tenantId: "tenant-1", customerId: identity.customerId, subscriptionId: identity.subscriptionId };
    expect(await verifyOfferJwt(offerJwt, secret, binding)).toMatchObject({ ...binding, nonce: init.nonce, offerValue: 5000, discountDurationMonths: 2 });
    expect((await claim(request(claimBody))).status).toBe(409);
    await expect(redeemOfferJwt(offerJwt, secret, binding, state.db!)).resolves.toMatchObject(binding);
    await expect(redeemOfferJwt(offerJwt, secret, binding, state.db!)).rejects.toMatchObject({ status: 409 });
  });

  it.each([null, [], {}, { publicKey: "bb_pub_test" }, { ...identity, customerId: 42 }])("rejects invalid input %j", async (body) => {
    expect((await initialize(request(body))).status).toBe(400);
  });

  it("rejects malformed or oversized JSON", async () => {
    const malformed = new Request("https://boolbul.com", { method: "POST", body: "{" });
    expect((await initialize(malformed)).status).toBe(400);
    expect((await initialize(request({ ...identity, junk: "a".repeat(20000) }))).status).toBe(400);
  });

  it("rejects unknown and SQL-injected keys, suspended tenants and exhausted quota", async () => {
    expect((await initialize(request({ ...identity, publicKey: "' OR 1=1 --" }))).status).toBe(403);
    await state.db!.execute("UPDATE edge_tenants SET status = 'suspended'");
    expect((await initialize(request(identity))).status).toBe(403);
    await state.db!.execute("UPDATE edge_tenants SET status = 'active', current_month_usage = monthly_intercept_quota");
    expect((await initialize(request(identity))).status).toBe(403);
  });

  it("does not trust browser eligibility or sign survey-only rules", async () => {
    await state.db!.execute(`UPDATE edge_retention_rules SET trigger_condition = '{"min_billing_months":2}'`);
    expect(await (await initialize(request({ ...identity, billingMonths: 100 }))).json()).toMatchObject({ failOpen: true, reason: "no_eligible_rules" });
    await state.db!.execute(`UPDATE edge_retention_rules SET trigger_condition = '{}', offer_type = 'survey_only'`);
    const init = await (await initialize(request(identity))).json();
    expect((await claim(request({ initToken: init.initToken, selection: "discount-rule" }))).status).toBe(403);
  });

  it("rejects forged context, non-offered selections, and revoked rules", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const init = await (await initialize(request(identity))).json();
    expect((await claim(request({ initToken: "not.a.jwt", selection: "discount-rule" }))).status).toBe(403);
    expect((await claim(request({ initToken: init.initToken, selection: "other-rule" }))).status).toBe(403);
    await state.db!.execute("UPDATE edge_retention_rules SET is_active = 0");
    expect((await claim(request({ initToken: init.initToken, selection: "discount-rule" }))).status).toBe(403);
    expect((await state.db!.execute("SELECT * FROM edge_used_nonces")).rows).toHaveLength(0);
  });

  it("fails open without consuming a nonce when signing keys or databases fail", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const init = await (await initialize(request(identity))).json();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json([{ signing_secret: "wrong-secret-".repeat(4) }])));
    const response = await claim(request({ initToken: init.initToken, selection: "discount-rule" }));
    expect(await response.json()).toMatchObject({ failOpen: true, reason: "upstream_error" });
    expect((await state.db!.execute("SELECT * FROM edge_used_nonces")).rows).toHaveLength(0);
    vi.spyOn(state.db!, "execute").mockRejectedValue(new Error("sensitive-db-string"));
    const failed = await initialize(request(identity));
    expect(await failed.text()).not.toContain("sensitive-db-string");
  });

  it("rejects malformed rule JSON rather than offering an unsafe default", async () => {
    await state.db!.execute(`UPDATE edge_retention_rules SET trigger_condition = '{"unknown":true}'`);
    await expect(findActiveRules(state.db!, "tenant-1")).rejects.toThrow("Unsupported");
  });

  it("answers public cross-origin preflight without allowing credentials", () => {
    const response = OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.has("Access-Control-Allow-Credentials")).toBe(false);
  });
});

describe("atomic nonce locks", () => {
  it("allows exactly one concurrent consumer", async () => {
    const nonce = { tenantId: "tenant-1", nonce: crypto.randomUUID(), exp: Math.floor(Date.now() / 1000) + 300 };
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => consumeNonce(state.db!, nonce, "claim")));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    for (const result of results) {
      if (result.status === "rejected") expect(result.reason).toBeInstanceOf(InterceptError);
    }
  });

  it("rejects expired nonce consumption without storing a row", async () => {
    await expect(consumeNonce(state.db!, { tenantId: "tenant-1", nonce: crypto.randomUUID(), exp: 1 }, "claim"))
      .rejects.toMatchObject({ code: "expired", status: 409 });
    expect((await state.db!.execute("SELECT * FROM edge_used_nonces")).rows).toHaveLength(0);
  });
});
