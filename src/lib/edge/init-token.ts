import "server-only";
import { errors, jwtVerify, SignJWT } from "jose";
import { isIdentifier, OFFER_TTL_SECONDS, signingKey, TOKEN_ISSUER, validateBinding, validateLifetime, type OfferBinding } from "../crypto/jwt";

export interface InitContext extends OfferBinding {
  publicKey: string;
  nonce: string;
  ruleIds: string[];
}

function platformKey(): Uint8Array {
  const secret = process.env.BOOLBUL_JWT_SECRET;
  if (!secret) throw new Error("Platform signing configuration is missing");
  return signingKey(secret);
}

export async function createInitToken(context: InitContext): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...context })
    .setProtectedHeader({ alg: "HS256", typ: "boolbul-init+jwt" })
    .setIssuer(TOKEN_ISSUER)
    .setAudience("boolbul:claim")
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + OFFER_TTL_SECONDS)
    .sign(platformKey());
}

export async function verifyInitToken(token: string): Promise<InitContext & { exp: number }> {
  const { payload } = await jwtVerify(token, platformKey(), {
    issuer: TOKEN_ISSUER,
    audience: "boolbul:claim",
    algorithms: ["HS256"],
    typ: "boolbul-init+jwt",
    requiredClaims: ["exp", "iat", "tenantId", "customerId", "subscriptionId", "nonce", "publicKey", "ruleIds"],
    maxTokenAge: OFFER_TTL_SECONDS,
    clockTolerance: 0,
  });
  const binding = validateBinding(payload);
  const exp = validateLifetime(payload);
  if (!isIdentifier(payload.publicKey) || !Array.isArray(payload.ruleIds) ||
      payload.ruleIds.length > 100 || !payload.ruleIds.every(isIdentifier)) {
    throw new errors.JWTClaimValidationFailed("Invalid initialization context", payload);
  }
  return { ...binding, publicKey: payload.publicKey, ruleIds: payload.ruleIds, exp };
}
