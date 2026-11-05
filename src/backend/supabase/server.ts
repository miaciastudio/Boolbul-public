import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "./client";
import { AuthCookieError } from "./redirects";

export async function createServerSupabaseClient(mode: "read-only" | "read-write" = "read-only") {
  const store = await cookies();
  return createSupabaseServerClient({
    getAll: () => store.getAll(),
    // Middleware owns refresh writes during Server Component rendering.
    ...(mode === "read-write" ? {
      setAll: (updates: { name: string; value: string; options: import("@supabase/ssr").CookieOptions }[]) => {
        try {
          updates.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch (cause) {
          throw new AuthCookieError(cause);
        }
      },
    } : {}),
  });
}
