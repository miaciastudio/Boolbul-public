import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeJwt, errors, SignJWT } from "jose";
import { createOfferJwt, verifyOfferJwt, type OfferClaimInput } from "../src/lib/crypto/jwt";

const secret = "a".repeat(64);
const binding = { tenantId: "tenant-1", customerId: "customer-1", subscriptionId: "subscription-1" };
const offer: OfferClaimInput = {
  ...binding, offerType: "discount", offerValue: 5000, discountDurationMonths: 2,
  nonce: "ae1c52a2-ed93-4df4-b68d-458fd57b3027",
};
const now = () => Math.floor(Date.now() / 1000);

async function sign(payload: Record<string, unknown>, algorithm = "HS256", issuer = "boolbul.com") {
  return new SignJWT(payload).setProtectedHeader({ alg: algorithm, typ: "JWT" })
    .setIssuer(issuer).sign(new TextEncoder().encode(secret));
}

afterEach(() => vi.useRealTimers());

describe("offer JWT", () => {
  it.each(["discount", "pause"] as const)("signs a five-minute %s offer with exact identity claims", async (offerType) => {
    const input: OfferClaimInput = offerType === "pause"
      ? { ...binding, nonce: offer.nonce, offerType, offerValue: 30 }
      : { ...binding, nonce: offer.nonce, offerType, offerValue: 5000, discountDurationMonths: 2 };
    const token = await createOfferJwt(input, secret);
    const raw = decodeJwt(token);
    expect(Number(raw.exp) - Number(raw.iat)).toBe(300);
    expect(raw.iss).toBe("boolbul.com");
    expect(await verifyOfferJwt(token, secret, binding)).toEqual({ ...input, exp: raw.exp });
  });

  it.each([{ offerValue: 9000 }, { discountDurationMonths: 99 }])("rejects tampered terms %j with the original jose signature error", async (changes) => {
    const token = await createOfferJwt(offer, secret);
    const parts = token.split(".");
    parts[1] = Buffer.from(JSON.stringify({ ...decodeJwt(token), ...changes })).toString("base64url");
    await expect(verifyOfferJwt(parts.join("."), secret)).rejects.toBeInstanceOf(errors.JWSSignatureVerificationFailed);
    await expect(verifyOfferJwt(token, "b".repeat(64))).rejects.toBeInstanceOf(errors.JWSSignatureVerificationFailed);
  });

  it("signs an explicitly ongoing discount", async () => {
    const token = await createOfferJwt({ ...offer, offerType: "discount", discountDurationMonths: 0 }, secret);
    expect(await verifyOfferJwt(token, secret)).toMatchObject({ discountDurationMonths: 0 });
  });

  it("expires exactly at five minutes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T12:00:00Z"));
    const token = await createOfferJwt(offer, secret);
    vi.advanceTimersByTime(299000);
    await expect(verifyOfferJwt(token, secret)).resolves.toMatchObject(offer);
    vi.advanceTimersByTime(1000);
    await expect(verifyOfferJwt(token, secret)).rejects.toBeInstanceOf(errors.JWTExpired);
  });

  it.each(["tenantId", "customerId", "subscriptionId"] as const)("rejects a mismatched %s", async (field) => {
    const token = await createOfferJwt(offer, secret);
    await expect(verifyOfferJwt(token, secret, { ...binding, [field]: "other" })).rejects.toBeInstanceOf(errors.JWTClaimValidationFailed);
  });

  it.each([
    { customerId: "" }, { subscriptionId: 42 }, { nonce: "guessable" },
    { offerType: "admin" }, { offerValue: -1 }, { offerValue: 10001 },
    { offerValue: 0.5 }, { exp: undefined }, { iat: undefined },
    { discountDurationMonths: undefined }, { discountDurationMonths: -1 },
    { discountDurationMonths: 1.5 }, { discountDurationMonths: "2" },
    { discountDurationMonths: null }, { offerType: "pause", offerValue: 30 },
    { exp: now() + 900 }, { iat: now() + 30, exp: now() + 330 },
  ])("rejects invalid signed claims %j", async (changes) => {
    const token = await sign({ ...offer, iat: now(), exp: now() + 300, ...changes });
    await expect(verifyOfferJwt(token, secret)).rejects.toBeInstanceOf(errors.JOSEError);
  });

  it("rejects wrong issuer, algorithm and unsigned garbage", async () => {
    const claims = { ...offer, iat: now(), exp: now() + 300 };
    await expect(verifyOfferJwt(await sign(claims, "HS384"), secret)).rejects.toBeInstanceOf(errors.JOSEAlgNotAllowed);
    await expect(verifyOfferJwt(await sign(claims, "HS256", "other"), secret)).rejects.toBeInstanceOf(errors.JWTClaimValidationFailed);
    await expect(verifyOfferJwt("not.a.jwt", secret)).rejects.toBeInstanceOf(errors.JOSEError);
  });

  it("rejects missing or weak secrets and invalid signing input", async () => {
    await expect(createOfferJwt(offer, "")).rejects.toThrow("32 bytes");
    await expect(createOfferJwt({ ...offer, customerId: "" }, secret)).rejects.toThrow();
  });
});
