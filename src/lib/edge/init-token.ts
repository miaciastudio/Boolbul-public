import "server-only";
import { errors, jwtVerify, SignJWT } from "jose";
import { isIdentifier, signingKey, TOKEN_ISSUER, validateBinding, validateLifetime, type OfferBinding } from "../crypto/jwt";
import type { Gateway } from "./queries";

/** A cancellation session may stay open while the customer reads the offers. */
export const INIT_TTL_SECONDS = 1800;
/** Outcome beacons (e.g. "cancelled") are still accepted shortly after the session expires. */
const OUTCOME_GRACE_SECONDS = 3600;
export const MAX_MRR_CENTS = 100_000_000;

export interface InitContext extends OfferBinding {
  publicKey: string;
  nonce: string;
  ruleIds: string[];
  gateway: Gateway;
  mrrCents: number;
}

function platformKey(): Uint8Array {
  const secret = process.env.BOOLBUL_JWT_SECRET;
  if (!secret) throw new Error("Platform signing configuration is missing");
  return signingKey(secret);
}

export function isMrrCents(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= MAX_MRR_CENTS;
}

export async function createInitToken(context: InitContext): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...context })
    .setProtectedHeader({ alg: "HS256", typ: "boolbul-init+jwt" })
    .setIssuer(TOKEN_ISSUER)
    .setAudience("boolbul:claim")
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + INIT_TTL_SECONDS)
    .sign(platformKey());
}

async function verify(token: string, graceSeconds: number): Promise<InitContext & { exp: number }> {
  const { payload } = await jwtVerify(token, platformKey(), {
    issuer: TOKEN_ISSUER,
    audience: "boolbul:claim",
    algorithms: ["HS256"],
    typ: "boolbul-init+jwt",
    requiredClaims: ["exp", "iat", "tenantId", "customerId", "subscriptionId", "nonce", "publicKey", "ruleIds", "gateway", "mrrCents"],
    maxTokenAge: INIT_TTL_SECONDS + graceSeconds,
    clockTolerance: graceSeconds,
  });
  const binding = validateBinding(payload);
  const exp = validateLifetime(payload, INIT_TTL_SECONDS);
  if (!isIdentifier(payload.publicKey) || !Array.isArray(payload.ruleIds) ||
      payload.ruleIds.length > 100 || !payload.ruleIds.every(isIdentifier) ||
      (payload.gateway !== "dodo_payments" && payload.gateway !== "stripe") || !isMrrCents(payload.mrrCents)) {
    throw new errors.JWTClaimValidationFailed("Invalid initialization context", payload);
  }
  return { ...binding, publicKey: payload.publicKey, ruleIds: payload.ruleIds, gateway: payload.gateway, mrrCents: payload.mrrCents, exp };
}

/** Strict: offers can only be claimed while the session is live. */
export function verifyInitToken(token: string): Promise<InitContext & { exp: number }> {
  return verify(token, 0);
}

/** Lenient: analytics beacons may arrive after a slow customer decision. */
export function verifyInitTokenForOutcome(token: string): Promise<InitContext & { exp: number }> {
  return verify(token, OUTCOME_GRACE_SECONDS);
}
