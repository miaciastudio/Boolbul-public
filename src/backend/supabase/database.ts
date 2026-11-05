// Auth reads deliberately omit tenant signing secrets and billing credentials.
export type MembershipRole = "owner" | "admin" | "developer" | "viewer";
export type WorkspaceTenant = {
  id: string;
  name: string;
  slug: string;
  public_key: string;
  plan_tier: "free" | "starter" | "pro" | "scale";
  billing_status: "trialing" | "active" | "paused" | "cancelled";
  billing_mode: "test_mode" | "live_mode" | null;
  onboarding_completed_at: string | null;
};
export type WorkspaceMembership = { tenant_id: string; role: MembershipRole };

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type AuthDatabase = {
  public: {
    Tables: {
      tenants: Table<WorkspaceTenant>;
      churn_events: Table<{
        id: string;
        tenant_id: string;
        customer_id: string;
        subscription_id: string;
        mrr_cents: number;
        status: string;
        event_scope: "retention" | "platform_billing";
        exit_reason: string | null;
        created_at: string;
      }>;
      tenant_memberships: Table<WorkspaceMembership & {
        id: string;
        user_id: string;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
