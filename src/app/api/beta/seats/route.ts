import { NextResponse } from "next/server";
import { BETA_SEATS, seatsTaken } from "@/backend/beta/applications";

export const dynamic = "force-dynamic";

/** Public "spots left" counter for the First 100 beta (counts approved workspaces only). */
export async function GET() {
  let taken = 0;
  try { taken = await seatsTaken(); } catch { /* show full availability rather than fail */ }
  return NextResponse.json({ total: BETA_SEATS, taken, left: Math.max(0, BETA_SEATS - taken) },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
