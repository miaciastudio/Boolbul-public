import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { publicKey, customerId, subscriptionId } = body;

    if (!publicKey) {
      return NextResponse.json(
        { error: "Missing publicKey parameter" },
        { status: 400 }
      );
    }

    // Return sample active rules for this workspace
    return NextResponse.json({
      sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      rules: [
        {
          reasonTrigger: "TOO_EXPENSIVE",
          offerType: "DISCOUNT_PERCENT",
          headline: "WAIT! BEFORE YOU BOUNCE...",
          description: "Get 50% off for the next 2 months.",
          payload: { discount_pct: 50, duration_months: 2, dodo_code: "SAVE50" },
        },
        {
          reasonTrigger: "NOT_USING",
          offerType: "PAUSE_SUBSCRIPTION",
          headline: "FREEZE YOUR BILL, KEEP YOUR DATA",
          description: "Pause payments for 30 days.",
          payload: { pause_days: 30 },
        },
      ],
      compliance: {
        escapeHatchLabel: "No thanks, proceed to complete cancellation",
        ftcCompliant: true,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to initialize interception session", message: err.message },
      { status: 500 }
    );
  }
}

