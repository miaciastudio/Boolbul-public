import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { generateSigningSecret, parseWorkspaceSettings } = await import("../src/backend/workspace/manage");

describe("workspace settings parsing", () => {
  it("accepts supported gateways and normalises domains", () => {
    expect(parseWorkspaceSettings({ gateway: "stripe", primaryDomain: "https://App.Example.com/billing" }))
      .toEqual({ gateway: "stripe", primaryDomain: "app.example.com" });
    expect(parseWorkspaceSettings({ name: "  Acme  ", primaryDomain: "" })).toEqual({ name: "Acme", primaryDomain: null });
  });

  it.each([
    [{}], [{ gateway: "paddle" }], [{ gateway: "lemon_squeezy" }], [{ primaryDomain: "not a domain" }],
    [{ name: "" }], [{ name: "x".repeat(81) }], [{ signing_secret: "bb_sec_x" }], [[]], [null],
  ])("rejects %j", (input) => {
    expect(() => parseWorkspaceSettings(input)).toThrow();
  });

  it("generates 256-bit signing secrets in the existing bb_sec_ format", () => {
    const a = generateSigningSecret();
    expect(a).toMatch(/^bb_sec_[0-9a-f]{64}$/);
    expect(generateSigningSecret()).not.toBe(a);
  });
});
