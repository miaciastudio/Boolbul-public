import type { NextRequest } from "next/server";
import { createApplication, notifyAdmin, parseApplication } from "@/backend/beta/applications";
import { handleWorkspaceRequest, readJsonBody, WorkspaceApiError } from "@/backend/workspace/api";
import { runInBackground } from "@/lib/edge/background";

export const dynamic = "force-dynamic";

/** For accounts created with Google: submit the beta application after signing in. */
export function POST(request: NextRequest) {
  return handleWorkspaceRequest(request, { write: true, managerOnly: false }, async ({ user }) => {
    if (!user.email) throw new WorkspaceApiError("missing_email", 400, "Your account has no email address.");
    let input;
    try {
      input = parseApplication((await readJsonBody(request)) as Record<string, unknown>);
    } catch (error) {
      if (error instanceof WorkspaceApiError) throw error;
      throw new WorkspaceApiError("invalid_application", 400, error instanceof Error ? error.message : "Check the form.");
    }
    const row = await createApplication(user.id, user.email, input);
    runInBackground(notifyAdmin(row));
    return { status: row.status, appliedAt: row.applied_at };
  });
}
