import { NextResponse, type NextRequest } from "next/server";
import { handleWorkspaceRequest } from "@/backend/workspace/api";
import { ledgerCsv, loadLedger } from "@/backend/workspace/overview";

export const dynamic = "force-dynamic";

/** Full retention ledger (up to 5,000 rows) as JSON or CSV. */
export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format");
  let rows: Awaited<ReturnType<typeof loadLedger>> = [];
  const response = await handleWorkspaceRequest(request, { write: false, managerOnly: false }, async (caller) => {
    rows = await loadLedger(caller, 5000);
    return { rows };
  });
  if (format !== "csv" || response.status !== 200) return response;
  const csv = new NextResponse(ledgerCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="boolbul-ledger-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
  response.cookies.getAll().forEach((cookie) => csv.cookies.set(cookie));
  return csv;
}
