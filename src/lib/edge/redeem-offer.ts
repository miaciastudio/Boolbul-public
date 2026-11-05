import { verifyOfferJwt, type OfferBinding, type OfferClaimPayload } from "../crypto/jwt";
import { consumeNonce, type EdgeDatabase } from "./queries";

export async function redeemOfferJwt(
  token: string,
  signingSecret: string,
  expected: OfferBinding,
  db: EdgeDatabase,
): Promise<OfferClaimPayload> {
  const offer = await verifyOfferJwt(token, signingSecret, expected);
  await consumeNonce(db, offer, "redeem");
  return offer;
}
