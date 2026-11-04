import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, subscriptionId, offerType } = body;

    const signingSecret = process.env.BOOLBUL_JWT_SECRET || "default-secret-key-32-chars-minimum";
    const secretKey = new TextEncoder().encode(signingSecret);

    // Generate cryptographically signed offer JWT for Zero-Trust verification
    const token = await new SignJWT({
      sessionId,
      subscriptionId,
      action: offerType?.startsWith("DISCOUNT") ? "APPLY_DISCOUNT" : "PAUSE_SUBSCRIPTION",
      payload: {
        discountCode: "SAVE50",
        pauseDurationDays: 30,
      },
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(secretKey);

    return NextResponse.json({
      success: true,
      offerToken: token,
      message: "Signed offer token issued. Pass to your internal /api/boolbul/claim-offer endpoint.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Token signing failed", message: err.message },
      { status: 500 }
    );
  }
}

