import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "./server";
import type { WorkspaceMembership, WorkspaceTenant } from "./database";
import { failureCode, loginPath, sessionErrorCode, type LoginError } from "./redirects";

export type DashboardContext = {
  user: User;
  membership: WorkspaceMembership;
  tenant: WorkspaceTenant;
};

type DashboardResult = { context: DashboardContext; error?: never } | { error: LoginError; context?: never };

async function loadDashboardContext(): Promise<DashboardResult> {
  try {
    const supabase = await createServerSupabaseClient("read-only");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: sessionErrorCode(authError) };

    // Both queries use the authenticated anon client and RLS, never the admin client.
    const { data: membership, error: membershipError } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .order("tenant_id", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (membershipError || !membership) return { error: "workspace_unavailable" };

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name, slug")
      .eq("id", membership.tenant_id)
      .maybeSingle();
    if (tenantError || !tenant) return { error: "workspace_unavailable" };
    return { context: { user, membership, tenant } };
  } catch (cause) {
    return { error: failureCode(cause) };
  }
}

// React cache is render/request-scoped: layout and page share the verified read.
export const requireDashboardContext = cache(async (): Promise<DashboardContext> => {
  const result = await loadDashboardContext();
  // Keep Next's redirect exception outside the error-handling block.
  if (result.error) redirect(loginPath(result.error, "/dashboard"));
  return result.context!;
});
