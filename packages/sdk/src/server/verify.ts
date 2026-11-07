// Zero-dependency HS256 verification (Web Crypto: Node 18+, Bun, Deno, Workers, Vercel Edge).

export const OFFER_ISSUER = "boolbul.com";
export const OFFER_TTL_SECONDS = 300;

export interface VerifiedOffer {
  tenantId: string;
  customerId: string;
  subscriptionId: string;
  /** Single-use id. Store it for 5 minutes to reject replays (see `seenNonce`). */
  nonce: string;
  offerType: "discount" | "pause";
  /** Discount: basis points (5000 = 50%). Pause: days. */
  offerValue: number;
  /** Discount only; 0 = ongoing. */
  discountDurationMonths?: number;
  exp: number;
}

export class OfferVerificationError extends Error {
  constructor(readonly code: "malformed" | "bad_signature" | "expired" | "invalid_claims" | "identity_mismatch" | "replayed", message: string) {
    super(message);
    this.name = "OfferVerificationError";
  }
}

export interface VerifyOptions {
  /** If given, the offer must belong to this customer/subscription (from YOUR session, never the request body). */
  expected?: { customerId?: string; subscriptionId?: string };
  /** Return true if this nonce was already used; record it otherwise. Strongly recommended. */
  seenNonce?: (nonce: string, expiresAt: Date) => boolean | Promise<boolean>;
  now?: Date;
}

function b64urlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) throw new OfferVerificationError("malformed", "Token is not base64url.");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function json(segment: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(b64urlToBytes(segment)));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof OfferVerificationError) throw error;
    throw new OfferVerificationError("malformed", "Token segment is not JSON.");
  }
}

const id = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 256 && value.trim() === value;

/**
 * Verifies an `offerJwt` from the BoolBul widget with your workspace signing secret.
 * Only after this succeeds should you change anything in Dodo Payments or Stripe.
 */
export async function verifyOffer(token: string, signingSecret: string, options: VerifyOptions = {}): Promise<VerifiedOffer> {
  if (typeof token !== "string" || token.length > 4096) throw new OfferVerificationError("malformed", "Missing offer token.");
  if (typeof signingSecret !== "string" || new TextEncoder().encode(signingSecret).length < 32) {
    throw new Error("BoolBul signing secret is missing or too short. Copy it from Dashboard → Settings.");
  }
  const parts = token.split(".");
  if (parts.length !== 3) throw new OfferVerificationError("malformed", "Offer token must have three parts.");
  const header = json(parts[0]);
  if (header.alg !== "HS256" || (header.typ !== undefined && header.typ !== "JWT")) {
    throw new OfferVerificationError("malformed", "Unsupported token algorithm.");
  }
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(signingSecret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("HMAC", key, b64urlToBytes(parts[2]) as BufferSource,
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`) as BufferSource);
  if (!valid) throw new OfferVerificationError("bad_signature", "Offer signature is invalid.");

  const claims = json(parts[1]);
  const now = Math.floor((options.now ?? new Date()).getTime() / 1000);
  const { iss, iat, exp, tenantId, customerId, subscriptionId, nonce, offerType, offerValue, discountDurationMonths } = claims;
  if (typeof exp !== "number" || exp <= now) throw new OfferVerificationError("expired", "Offer expired. Ask the customer to try again.");
  if (iss !== OFFER_ISSUER || typeof iat !== "number" || iat > now + 5 || exp - iat !== OFFER_TTL_SECONDS ||
      !id(tenantId) || !id(customerId) || !id(subscriptionId) || !id(nonce) ||
      (offerType !== "discount" && offerType !== "pause") || typeof offerValue !== "number" ||
      !Number.isSafeInteger(offerValue) || offerValue <= 0 || (offerType === "discount" && offerValue > 10000) ||
      (offerType === "discount" && (typeof discountDurationMonths !== "number" || !Number.isSafeInteger(discountDurationMonths) || discountDurationMonths < 0))) {
    throw new OfferVerificationError("invalid_claims", "Offer claims are invalid.");
  }
  if ((options.expected?.customerId && options.expected.customerId !== customerId) ||
      (options.expected?.subscriptionId && options.expected.subscriptionId !== subscriptionId)) {
    throw new OfferVerificationError("identity_mismatch", "Offer belongs to a different customer or subscription.");
  }
  if (options.seenNonce && await options.seenNonce(nonce, new Date(exp * 1000))) {
    throw new OfferVerificationError("replayed", "Offer was already applied.");
  }
  return {
    tenantId, customerId, subscriptionId, nonce, offerType, offerValue, exp,
    ...(offerType === "discount" ? { discountDurationMonths: discountDurationMonths as number } : {}),
  };
}
