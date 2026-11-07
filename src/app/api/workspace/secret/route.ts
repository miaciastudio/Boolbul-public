import type { NextRequest } from "next/server";
import { handleWorkspaceRequest } from "@/backend/workspace/api";
import { rotateSigningSecret } from "@/backend/workspace/manage";

export const dynamic = "force-dynamic";

/** Rotates the workspace signing secret. The response is the only time it is shown. */
export function POST(request: NextRequest) {
  return handleWorkspaceRequest(request, { write: true, managerOnly: true, requireActive: true }, ({ tenantId }) => rotateSigningSecret(tenantId));
}
