import { errors, jwtVerify, SignJWT, type JWTPayload } from "jose";

export const OFFER_TTL_SECONDS = 300;
export const TOKEN_ISSUER = "boolbul.com";

export interface OfferBinding {
  tenantId: string;
  customerId: string;
  subscriptionId: string;
}

export type OfferClaimInput = OfferBinding & { nonce: string } & (
  | { offerType: "discount"; offerValue: number; discountDurationMonths: number }
  | { offerType: "pause"; offerValue: number }
);

export type OfferClaimPayload = OfferClaimInput & { exp: number };

export function signingKey(secret: string): Uint8Array {
  const key = new TextEncoder().encode(secret);
  if (key.byteLength < 32 || !secret.trim()) {
    throw new Error("Signing secret must contain at least 32 bytes");
  }
  return key;
}

export function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 256 &&
    value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value);
}

export function validateBinding(payload: JWTPayload): OfferBinding & { nonce: string } {
  const { tenantId, customerId, subscriptionId, nonce } = payload;
  if (!isIdentifier(tenantId) || !isIdentifier(customerId) ||
      !isIdentifier(subscriptionId) || typeof nonce !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nonce)) {
    throw new errors.JWTClaimValidationFailed("Invalid offer identity", payload);
  }
  return { tenantId, customerId, subscriptionId, nonce };
}

export function validateLifetime(payload: JWTPayload): number {
  const { iat, exp } = payload;
  const now = Math.floor(Date.now() / 1000);
  if (typeof iat !== "number" || typeof exp !== "number" ||
      !Number.isSafeInteger(iat) || !Number.isSafeInteger(exp) ||
      iat > now || exp - iat !== OFFER_TTL_SECONDS) {
    throw new errors.JWTClaimValidationFailed("Invalid token lifetime", payload, "exp");
  }
  return exp;
}

function validateOffer(payload: JWTPayload): OfferClaimInput {
  const binding = validateBinding(payload);
  const { offerType, offerValue, discountDurationMonths } = payload;
  if ((offerType !== "discount" && offerType !== "pause") ||
      typeof offerValue !== "number" || !Number.isSafeInteger(offerValue) ||
      offerValue <= 0 || (offerType === "discount" && offerValue > 10000)) {
    throw new errors.JWTClaimValidationFailed("Invalid offer terms", payload);
  }
  if (offerType === "discount") {
    // Zero months denotes an ongoing discount, not a missing duration.
    if (typeof discountDurationMonths !== "number" || !Number.isSafeInteger(discountDurationMonths) || discountDurationMonths < 0) {
      throw new errors.JWTClaimValidationFailed("Invalid discount duration", payload, "discountDurationMonths");
    }
    return { ...binding, offerType, offerValue, discountDurationMonths };
  }
  if (discountDurationMonths !== undefined) {
    throw new errors.JWTClaimValidationFailed("Pause offers cannot include discount terms", payload, "discountDurationMonths");
  }
  return { ...binding, offerType, offerValue };
}

export async function createOfferJwt(
  payload: OfferClaimInput,
  signingSecret: string,
): Promise<string> {
  const offer = validateOffer({ ...payload });
  const issuedAt = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...offer })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(TOKEN_ISSUER)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + OFFER_TTL_SECONDS)
    .sign(signingKey(signingSecret));
}

export async function verifyOfferJwt(
  token: string,
  signingSecret: string,
  expected?: OfferBinding,
): Promise<OfferClaimPayload> {
  const { payload } = await jwtVerify(token, signingKey(signingSecret), {
    issuer: TOKEN_ISSUER,
    algorithms: ["HS256"],
    typ: "JWT",
    requiredClaims: ["iat", "exp", "tenantId", "customerId", "subscriptionId", "nonce", "offerType", "offerValue"],
    maxTokenAge: OFFER_TTL_SECONDS,
    clockTolerance: 0,
  });
  const offer = validateOffer(payload);
  const exp = validateLifetime(payload);
  if (expected && (offer.tenantId !== expected.tenantId ||
      offer.customerId !== expected.customerId || offer.subscriptionId !== expected.subscriptionId)) {
    throw new errors.JWTClaimValidationFailed("Offer identity mismatch", payload);
  }
  return { ...offer, exp };
}
