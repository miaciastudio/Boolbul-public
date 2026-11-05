import Link from "next/link";
import { BrutalButton } from "@/components/ui-primitives/BrutalButton";
import { getAuthConfig } from "@/backend/supabase/config";
import { LOGIN_ERRORS, safeNextPath, type LoginError } from "@/backend/supabase/redirects";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage({ searchParams }: {
  searchParams: { error?: string | string[]; next?: string | string[] };
}) {
  let configured = true;
  try {
    getAuthConfig();
  } catch {
    configured = false;
  }
  const suppliedError = typeof searchParams.error === "string" ? searchParams.error : undefined;
  const error: LoginError | undefined = !configured ? "configuration" : suppliedError
    ? (Object.prototype.hasOwnProperty.call(LOGIN_ERRORS, suppliedError) ? suppliedError as LoginError : "oauth_failed")
    : undefined;

  // Do not auto-redirect based on cookies: failures must stay recoverable here.
  return (
    <main className="min-h-screen bg-cobalt paper-grain flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-cream border-4-black shadow-brutal p-8 space-y-6">
        <Link href="/" className="font-black text-2xl">BOOLBUL</Link>
        <div>
          <h1 className="text-3xl font-black">Your retention cockpit.</h1>
          <p className="font-mono text-sm mt-3">Sign in or create your workspace securely with Google.</p>
        </div>
        {error && <p role="alert" className="border-2 border-pitch p-3 text-sm">{LOGIN_ERRORS[error]}</p>}
        <form action="/auth/login" method="post">
          <input type="hidden" name="next" value={safeNextPath(searchParams.next)} />
          <BrutalButton type="submit" size="lg" className="w-full disabled:opacity-50" disabled={!configured}>
            Continue with Google
          </BrutalButton>
        </form>
        <p className="text-xs font-mono text-zinc-600">New here? Your first sign-in creates your BoolBul workspace.</p>
        <Link href="/" className="inline-block text-sm underline">Back to home</Link>
      </section>
    </main>
  );
}
