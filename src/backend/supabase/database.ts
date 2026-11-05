// Auth reads deliberately omit tenant signing secrets and billing credentials.
export type MembershipRole = "owner" | "admin" | "developer" | "viewer";
export type WorkspaceTenant = { id: string; name: string; slug: string };
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
