import type { NextRequest } from "next/server";
import { handleWorkspaceRequest } from "@/backend/workspace/api";
import { loadOverview } from "@/backend/workspace/overview";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return handleWorkspaceRequest(request, { write: false, managerOnly: false }, loadOverview);
}
