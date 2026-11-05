import type { ReactNode } from "react";

export const metadata = { robots: { index: false, follow: false } };

export default function DashboardLayout({ children }: { children: ReactNode }) {
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
