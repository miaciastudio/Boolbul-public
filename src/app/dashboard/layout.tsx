import type { ReactNode } from "react";
import { requireDashboardContext } from "@/backend/supabase/session";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireDashboardContext();
  return (
    <>
      {children}
      <footer className="bg-cream border-t-4 border-pitch p-4 text-center">
        <form action="/auth/signout" method="post">
          <button type="submit" className="font-mono text-sm font-bold underline">Sign out</button>
        </form>
      </footer>
    </>
  );
}
