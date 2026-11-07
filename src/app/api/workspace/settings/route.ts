import type { NextRequest } from "next/server";
import { handleWorkspaceRequest, readJsonBody } from "@/backend/workspace/api";
import { parseWorkspaceSettings, updateWorkspaceSettings } from "@/backend/workspace/manage";

export const dynamic = "force-dynamic";

export function PATCH(request: NextRequest) {
  return handleWorkspaceRequest(request, { write: true, managerOnly: true, requireActive: true }, async ({ tenantId }) =>
    updateWorkspaceSettings(tenantId, parseWorkspaceSettings(await readJsonBody(request))));
}
