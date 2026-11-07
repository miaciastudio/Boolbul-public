import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeWebsite, parseApplication } from "@/backend/beta/applications";
import { adminAlertEmail, sendEmail, welcomeEmail } from "@/backend/beta/email";
import { effectivePlan, quotaForPlan } from "@/backend/workspace/overview";
import { POST as webhook } from "@/app/api/beta/invite-webhook/route";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("beta application input", () => {
  it.each([
    ["acme.com", "https://acme.com"],
    ["https://app.acme.io/dashboard/", "https://app.acme.io/dashboard"],
    ["  http://acme.dev#top ", "http://acme.dev"],
  ])("normalises %j", (input, output) => expect(normalizeWebsite(input)).toBe(output));

  it.each(["", "localhost", "javascript:alert(1)", "https://user:pass@acme.com", "ftp://acme.com", "acme .com"])("rejects %j", (input) => {
    expect(() => normalizeWebsite(input)).toThrow();
  });

  it("requires a real name", () => {
    expect(parseApplication({ fullName: "  Ada   Lovelace ", websiteUrl: "ada.app" })).toEqual({ fullName: "Ada Lovelace", websiteUrl: "https://ada.app" });
    expect(() => parseApplication({ fullName: "A", websiteUrl: "ada.app" })).toThrow();
  });
});

describe("3-month free pass", () => {
  it("counts as Pro until it ends, then falls back to the billed plan", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(effectivePlan("free", future)).toBe("pro");
    expect(quotaForPlan(effectivePlan("free", future))).toBeGreaterThanOrEqual(1_000_000);
    expect(effectivePlan("free", past)).toBe("free");
    expect(effectivePlan("starter", null)).toBe("starter");
  });
});

describe("beta emails", () => {
  it("escapes applicant-controlled text in the admin alert", () => {
    const mail = adminAlertEmail({ fullName: "<script>x</script>", email: "a@b.co", websiteUrl: "https://acme.com", appliedAt: new Date().toISOString(), applicationId: "id-1" });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.subject).toContain("acme.com");
  });

  it("welcome email carries the public key and never a signing secret", () => {
    const mail = welcomeEmail({ firstName: "Ada", publicKey: "bb_pub_123", trialEndsAt: "2027-02-08T00:00:00Z" });
    expect(mail.html).toContain("bb_pub_123");
    expect(mail.html + mail.text).not.toMatch(/bb_sec_/);
    expect(mail.subject).toMatch(/You're in/);
  });

  it("sends through Resend with an idempotency key, and no-ops without a key", async () => {
    expect(await sendEmail({ to: "a@b.co", subject: "s", html: "h", text: "t" })).toBe(false);
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const fetchMock = vi.fn(async () => Response.json({ id: "e1" }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendEmail({ to: "a@b.co", subject: "s", html: "h", text: "t", idempotencyKey: "k1" })).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("k1");
    expect(JSON.parse(String(init.body))).toMatchObject({ from: "BoolBul <hello@boolbul.com>", to: ["a@b.co"] });
  });
});

describe("invite webhook", () => {
  const call = (secret: string | null, body: unknown) => webhook(new Request("https://boolbul.com/api/beta/invite-webhook", {
    method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json", ...(secret ? { "X-BoolBul-Webhook-Secret": secret } : {}) },
  }));

  it("rejects missing or wrong secrets and malformed ids", async () => {
    expect((await call("anything", { applicationId: crypto.randomUUID() })).status).toBe(401);
    vi.stubEnv("BOOLBUL_INVITE_WEBHOOK_SECRET", "s".repeat(40));
    expect((await call(null, { applicationId: crypto.randomUUID() })).status).toBe(401);
    expect((await call("t".repeat(40), { applicationId: crypto.randomUUID() })).status).toBe(401);
    expect((await call("s".repeat(40), { applicationId: "1; drop table" })).status).toBe(400);
  });
});
