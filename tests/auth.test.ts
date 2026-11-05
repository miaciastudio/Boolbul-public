import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CookieMethodsServer, CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  createAdminClient: vi.fn(),
  getUser: vi.fn(),
  getSession: vi.fn(),
  exchange: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
  getAll: vi.fn(),
  set: vi.fn(),
  redirect: vi.fn(),
  options: undefined as undefined | {
    cookies: CookieMethodsServer;
    cookieOptions: CookieOptions;
    auth: { flowType: string };
  },
}));

vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createAdminClient }));
vi.mock("next/headers", () => ({ cookies: () => ({ getAll: mocks.getAll, set: mocks.set }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  cache: <T,>(fn: T): T => fn,
}));

import { GET as callback } from "@/app/auth/callback/route";
import { POST as login } from "@/app/auth/login/route";
import { POST as signout } from "@/app/auth/signout/route";
import { config as middlewareConfig, middleware } from "@/middleware";
import { createSupabaseServerClient } from "@/backend/supabase/client";
import { createSupabaseAdmin } from "@/backend/supabase/admin";
import { AuthConfigurationError, authCookieOptions, getAppUrl } from "@/backend/supabase/config";
import { AuthCookieError, safeNextPath } from "@/backend/supabase/redirects";
import { createRequestCookieBridge } from "@/backend/supabase/request";
import { createServerSupabaseClient } from "@/backend/supabase/server";
import { requireDashboardContext } from "@/backend/supabase/session";

const APP = "https://boolbul.example";
const SUPABASE = "https://project.supabase.co";
const user = { id: "user-123", email: "founder@example.test" };
const membership = { tenant_id: "tenant-123", role: "owner" };
const tenant = { id: "tenant-123", name: "Founder's Workspace", slug: "founder-123" };

function query(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
}
let membershipQuery: ReturnType<typeof query>;
let tenantQuery: ReturnType<typeof query>;

function request(path: string, headers?: HeadersInit) {
  return new NextRequest(`${APP}${path}`, { headers });
}
function post(path: string, origin: string | null = APP, next = "/dashboard") {
  return new NextRequest(`${APP}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...(origin ? { Origin: origin } : {}) },
    body: new URLSearchParams({ next }),
  });
}
function location(response: NextResponse) {
  return response.headers.get("location")!;
}
async function writeCookies(updates: { name: string; value: string; options?: CookieOptions }[]) {
  await mocks.options!.cookies.setAll!(updates.map((cookie) => ({
    ...cookie,
    options: { ...mocks.options!.cookieOptions, ...cookie.options },
  })), { "Cache-Control": "private, no-cache, no-store", Pragma: "no-cache", Expires: "0" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.options = undefined;
  vi.stubEnv("NEXT_PUBLIC_APP_URL", APP);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key-not-a-real-credential");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key-not-a-real-credential");
  mocks.getAll.mockReturnValue([]);
  mocks.getUser.mockResolvedValue({ data: { user }, error: null });
  mocks.exchange.mockResolvedValue({ data: { session: {} }, error: null });
  mocks.signIn.mockResolvedValue({ data: { url: `${SUPABASE}/auth/v1/authorize?provider=google` }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  membershipQuery = query(membership);
  tenantQuery = query(tenant);
  mocks.from.mockImplementation((table: string) => table === "tenant_memberships" ? membershipQuery : tenantQuery);
  mocks.createServerClient.mockImplementation((_url, _key, options) => {
    mocks.options = options;
    return {
      auth: { getUser: mocks.getUser, getSession: mocks.getSession, exchangeCodeForSession: mocks.exchange, signInWithOAuth: mocks.signIn, signOut: mocks.signOut },
      from: mocks.from,
    };
  });
  mocks.redirect.mockImplementation((path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); });
});

afterEach(() => {
  expect(mocks.getSession).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("canonical configuration and lazy clients", () => {
  it("creates a request-scoped PKCE client with secure HTTPOnly cookies", () => {
    vi.stubEnv("NODE_ENV", "production");
    const cookies = { getAll: () => [] };
    createSupabaseServerClient(cookies);
    createSupabaseServerClient(cookies);
    expect(mocks.createServerClient).toHaveBeenCalledTimes(2);
    expect(mocks.createServerClient).toHaveBeenCalledWith(SUPABASE, "test-anon-key-not-a-real-credential", expect.objectContaining({
      auth: expect.objectContaining({ flowType: "pkce" }),
      cookieOptions: { path: "/", httpOnly: true, sameSite: "lax", secure: true },
    }));
  });

  it("allows HTTP loopback cookies for local development", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    expect(authCookieOptions()).toMatchObject({ secure: false, httpOnly: true, sameSite: "lax" });
  });

  it.each(["", "not-a-url", "http://boolbul.example", "https://user:password@boolbul.example", `${APP}/subpath`, `${APP}?next=x`, `${APP}#fragment`, "https://boolbul.example\\evil"])("rejects invalid canonical URL %s", (value) => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", value);
    expect(() => getAppUrl()).toThrow(AuthConfigurationError);
  });

  it.each(["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"])("fails explicitly when %s is absent", (key) => {
    vi.stubEnv(key, "");
    expect(() => createSupabaseServerClient({ getAll: () => [] })).toThrow(AuthConfigurationError);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("requires a real service config only when constructing the admin client", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => createSupabaseAdmin()).toThrow(AuthConfigurationError);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("disables admin persistence and refresh without using it for authentication", () => {
    createSupabaseAdmin();
    expect(mocks.createAdminClient).toHaveBeenCalledWith(SUPABASE, expect.any(String), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  });
});

describe("safe next destinations", () => {
  it.each(["/dashboard", "/dashboard/", "/dashboard/settings/keys", "/dashboard?tab=recent#events", "/onboarding", "/onboarding/integration?step=keys"])("allows %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    undefined, null, ["/onboarding"], "", "https://evil.example/dashboard", "//evil.example/dashboard",
    "\\evil.example", "/dashboard\\evil", "/dashboard/../auth/callback", "/dashboard/./settings",
    "/dashboard/%2e%2e/onboarding", "/dashboard/%252e%252e/onboarding", "/dashboard/%2f%2fevil.example",
    "/dashboard//evil.example", "/dashboardevil", "/auth/callback", "/login", "/onboarding/../../login",
    "/dashboard?x=%5cevil", "/dashboard?x=%0d%0aLocation:evil", "/dashboard\n", "/dashboard?x=%ZZ",
  ])("rejects untrusted destination %j", (path) => {
    expect(safeNextPath(path)).toBe("/dashboard");
  });
});

describe("OAuth callback", () => {
  it("exchanges PKCE, verifies getUser and preserves cookie chunks/deletions on a canonical redirect", async () => {
    mocks.exchange.mockImplementation(async () => {
      await writeCookies([
        { name: "sb-auth.0", value: "session-part-0" },
        { name: "sb-auth.1", value: "session-part-1" },
        { name: "sb-auth-code-verifier", value: "", options: { maxAge: 0 } },
      ]);
      return { error: null };
    });
    const req = new NextRequest("https://evil.example/auth/callback?code=valid-code&next=%2Fonboarding%3Fstep%3Dkeys", {
      headers: { host: "evil.example", "x-forwarded-host": "evil.example", cookie: "sb-auth-code-verifier=verifier" },
    });
    const response = await callback(req);
    expect(mocks.exchange).toHaveBeenCalledWith("valid-code");
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(location(response)).toBe(`${APP}/onboarding?step=keys`);
    expect(response.status).toBe(303);
    expect(response.cookies.get("sb-auth.0")).toMatchObject({ value: "session-part-0", httpOnly: true, secure: true, sameSite: "lax" });
    expect(response.cookies.get("sb-auth.1")?.value).toBe("session-part-1");
    expect(response.cookies.get("sb-auth-code-verifier")?.maxAge).toBe(0);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });

  it.each(["", "?code=", "?code=%20", "?code=one&code=two", "?error=access_denied&error_description=provider-secret&code=code"])("rejects bad callback %s without exchanging a code", async (suffix) => {
    const response = await callback(request(`/auth/callback${suffix}`));
    expect(location(response)).toContain(`${APP}/login?error=oauth_failed`);
    expect(location(response)).not.toContain("provider-secret");
    expect(mocks.exchange).not.toHaveBeenCalled();
  });

  it.each(["https://evil.example", "//evil.example", "/dashboard/../login", "/dashboard%5cevil"])("does not redirect to untrusted next %s", async (next) => {
    const response = await callback(request(`/auth/callback?code=good&next=${encodeURIComponent(next)}`));
    expect(location(response)).toBe(`${APP}/dashboard`);
  });

  it("keeps cookie deletions when the code is expired or already redeemed", async () => {
    mocks.exchange.mockImplementation(async () => {
      await writeCookies([{ name: "sb-auth-code-verifier", value: "", options: { maxAge: 0 } }]);
      return { error: { message: "provider-secret invalid code" } };
    });
    const response = await callback(request("/auth/callback?code=replayed"));
    expect(location(response)).toContain("error=oauth_failed");
    expect(location(response)).not.toContain("provider-secret");
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(response.cookies.get("sb-auth-code-verifier")?.maxAge).toBe(0);
  });

  it("requires verified user even when exchange reports a session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
    const response = await callback(request("/auth/callback?code=unverified"));
    expect(location(response)).toContain("/login?error=session_expired");
  });

  it("keeps writes from exchange and verification when verification fails", async () => {
    mocks.exchange.mockImplementation(async () => {
      await writeCookies([{ name: "sb-auth-code-verifier", value: "", options: { maxAge: 0 } }]);
      return { error: null };
    });
    mocks.getUser.mockImplementation(async () => {
      await writeCookies([{ name: "sb-auth", value: "", options: { maxAge: 0 } }]);
      return { data: { user: null }, error: { status: 401 } };
    });
    const response = await callback(request("/auth/callback?code=expired"));
    expect(response.cookies.getAll()).toHaveLength(2);
    expect(location(response)).toContain("error=session_expired");
  });

  it("uses a host-independent relative login error if APP URL is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const response = await callback(new NextRequest("https://evil.example/auth/callback?code=code"));
    expect(location(response)).toBe("/login?error=configuration&next=%2Fdashboard");
    expect(mocks.exchange).not.toHaveBeenCalled();
  });

  it("returns a safe login error on auth outage without leaking exception text", async () => {
    mocks.exchange.mockRejectedValue(new Error("secret-provider-stacktrace"));
    const response = await callback(request("/auth/callback?code=code"));
    expect(location(response)).toContain("error=unavailable");
    expect(location(response)).not.toContain("secret-provider-stacktrace");
  });
});

describe("middleware protection and refresh", () => {
  it("protects dashboard and onboarding, but excludes login and callbacks", () => {
    expect(middlewareConfig.matcher).toEqual(["/dashboard/:path*", "/onboarding/:path*"]);
  });

  it("forwards refreshed cookies to the request and browser without dropping earlier batches", async () => {
    mocks.getUser.mockImplementation(async () => {
      await writeCookies([{ name: "sb-old", value: "", options: { maxAge: 0 } }]);
      await writeCookies([{ name: "sb-auth.0", value: "refreshed-token" }]);
      return { data: { user }, error: null };
    });
    const req = request("/dashboard", { cookie: "sb-old=expired; other=keep" });
    const response = await middleware(req);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-middleware-request-cookie")).toContain("sb-auth.0=refreshed-token");
    expect(response.headers.get("x-middleware-request-cookie")).toContain("other=keep");
    expect(req.cookies.get("sb-auth.0")?.value).toBe("refreshed-token");
    expect(response.cookies.getAll()).toHaveLength(2);
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it.each(["/dashboard", "/dashboard/settings/keys", "/onboarding?step=keys"])("redirects missing sessions at %s safely", async (path) => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await middleware(request(path));
    const target = new URL(location(response));
    expect(target.origin).toBe(APP);
    expect(target.pathname).toBe("/login");
    expect(target.searchParams.get("error")).toBe("session_expired");
    expect(target.searchParams.get("next")).toBe(path);
  });

  it("preserves expired-session clearing cookies on a login redirect", async () => {
    mocks.getUser.mockImplementation(async () => {
      await writeCookies([{ name: "sb-auth", value: "", options: { maxAge: 0 } }]);
      return { data: { user: null }, error: { status: 400, message: "refresh secret" } };
    });
    const response = await middleware(request("/dashboard"));
    expect(location(response)).toContain("error=session_expired");
    expect(response.cookies.get("sb-auth")?.maxAge).toBe(0);
    expect(location(response)).not.toContain("refresh secret");
  });

  it("does not accept a user when getUser also returns an error", async () => {
    mocks.getUser.mockResolvedValue({ data: { user }, error: { status: 503 } });
    expect(location(await middleware(request("/dashboard")))).toContain("error=unavailable");
  });

  it("fails closed on thrown auth outages", async () => {
    mocks.getUser.mockRejectedValue(new Error("network secret"));
    expect(location(await middleware(request("/onboarding")))).toContain("error=unavailable");
  });

  it.each(["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"])("fails closed with a login error for missing %s", async (key) => {
    vi.stubEnv(key, "");
    const response = await middleware(request("/dashboard"));
    expect(location(response)).toContain("/login?error=configuration");
    expect(response.headers.get("x-middleware-next")).toBeNull();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
});

describe("Google sign-in and CSRF-safe sign-out", () => {
  it("starts Google OAuth using canonical callback and persists the PKCE verifier", async () => {
    mocks.signIn.mockImplementation(async () => {
      await writeCookies([{ name: "sb-auth-code-verifier", value: "pkce-verifier" }]);
      return { data: { url: `${SUPABASE}/auth/v1/authorize?provider=google` }, error: null };
    });
    const response = await login(post("/auth/login", APP, "/onboarding"));
    expect(mocks.signIn).toHaveBeenCalledWith({ provider: "google", options: {
      redirectTo: `${APP}/auth/callback?next=%2Fonboarding`, skipBrowserRedirect: true,
    } });
    expect(location(response)).toBe(`${SUPABASE}/auth/v1/authorize?provider=google`);
    expect(response.cookies.get("sb-auth-code-verifier")).toMatchObject({ value: "pkce-verifier", httpOnly: true, sameSite: "lax", secure: true });
  });

  it("sanitizes the post-login destination before constructing the OAuth URL", async () => {
    await login(post("/auth/login", APP, "//evil.example"));
    expect(mocks.signIn).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ redirectTo: `${APP}/auth/callback?next=%2Fdashboard` }) }));
  });

  it.each([null, "null", "https://evil.example", "https://boolbul.example.evil"])("rejects sign-in and sign-out POST origin %s", async (origin) => {
    expect(location(await login(post("/auth/login", origin)))).toContain("error=invalid_request");
    expect(location(await signout(post("/auth/signout", origin)))).toContain("error=invalid_request");
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("clears session cookies on a same-origin POST and returns to login", async () => {
    mocks.signOut.mockImplementation(async () => {
      await writeCookies([{ name: "sb-auth", value: "", options: { maxAge: 0 } }]);
      return { error: null };
    });
    const response = await signout(post("/auth/signout"));
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(location(response)).toBe(`${APP}/login`);
    expect(response.status).toBe(303);
    expect(response.cookies.get("sb-auth")?.maxAge).toBe(0);
  });

  it("reports a safe sign-out error rather than pretending success", async () => {
    mocks.signOut.mockResolvedValue({ error: { message: "provider secret" } });
    const response = await signout(post("/auth/signout"));
    expect(location(response)).toBe(`${APP}/login?error=signout_failed`);
  });

  it("reports unavailable auth during OAuth initiation", async () => {
    mocks.signIn.mockRejectedValue(new Error("provider secret"));
    expect(location(await login(post("/auth/login")))).toContain("error=unavailable");
  });

  it("rejects a foreign authorization URL returned by the auth client", async () => {
    mocks.signIn.mockResolvedValue({ data: { url: "https://evil.example/authorize" }, error: null });
    expect(location(await login(post("/auth/login")))).toContain("error=oauth_failed");
  });

  it("returns safe login configuration errors from both POST routes", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(location(await login(post("/auth/login")))).toContain("/login?error=configuration");
    expect(location(await signout(post("/auth/signout")))).toBe("/login?error=configuration");
  });
});

describe("server component and RLS defense-in-depth", () => {
  it("uses explicit read-only cookies in Server Components", async () => {
    await createServerSupabaseClient("read-only");
    expect(mocks.options!.cookies.setAll).toBeUndefined();
    expect(mocks.options!.cookies.getAll()).toEqual([]);
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("does not swallow cookie store errors in writable mode", async () => {
    await createServerSupabaseClient("read-write");
    mocks.set.mockImplementation(() => { throw new Error("cookie failure"); });
    await expect(writeCookies([{ name: "sb-auth", value: "token" }])).rejects.toThrow(AuthCookieError);
  });

  it("loads verified user and scoped membership/tenant without requesting secrets", async () => {
    expect(await requireDashboardContext()).toEqual({ user, membership, tenant });
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.from).toHaveBeenNthCalledWith(1, "tenant_memberships");
    expect(membershipQuery.select).toHaveBeenCalledWith("tenant_id, role");
    expect(membershipQuery.eq).toHaveBeenCalledWith("user_id", user.id);
    expect(membershipQuery.limit).toHaveBeenCalledWith(1);
    expect(mocks.from).toHaveBeenNthCalledWith(2, "tenants");
    expect(tenantQuery.select).toHaveBeenCalledWith("id, name, slug");
    expect(tenantQuery.eq).toHaveBeenCalledWith("id", membership.tenant_id);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("redirects missing sessions exactly once, without catching Next redirects", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(requireDashboardContext()).rejects.toThrow("NEXT_REDIRECT:/login?error=session_expired");
    expect(mocks.redirect).toHaveBeenCalledOnce();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each(["membership", "tenant"])("fails closed for a missing/RLS-inaccessible %s", async (table) => {
    (table === "membership" ? membershipQuery : tenantQuery).maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(requireDashboardContext()).rejects.toThrow("NEXT_REDIRECT:/login?error=workspace_unavailable");
    expect(mocks.redirect).toHaveBeenCalledOnce();
  });

  it("does not render a workspace on database errors", async () => {
    membershipQuery.maybeSingle.mockResolvedValue({ data: null, error: { message: "database secret" } });
    await expect(requireDashboardContext()).rejects.toThrow("NEXT_REDIRECT:/login?error=workspace_unavailable");
  });

  it("handles auth outages safely at the layout boundary", async () => {
    mocks.getUser.mockRejectedValue(new Error("network secret"));
    await expect(requireDashboardContext()).rejects.toThrow("NEXT_REDIRECT:/login?error=unavailable");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("handles missing configuration safely at the layout boundary", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    await expect(requireDashboardContext()).rejects.toThrow("NEXT_REDIRECT:/login?error=configuration");
  });
});

describe("cookie persistence errors are not swallowed", () => {
  it("surfaces callback request cookie adapter errors", async () => {
    const req = request("/auth/callback?code=good");
    vi.spyOn(req.cookies, "set").mockImplementation(() => { throw new Error("cookie failure"); });
    mocks.exchange.mockImplementation(async () => {
      await writeCookies([{ name: "sb-auth", value: "token" }]);
      return { error: null };
    });
    await expect(callback(req)).rejects.toThrow(AuthCookieError);
  });

  it("surfaces adapter errors even when the auth library catches them", async () => {
    const req = request("/dashboard");
    vi.spyOn(req.cookies, "set").mockImplementation(() => { throw new Error("cookie failure"); });
    mocks.getUser.mockImplementation(async () => {
      try { await writeCookies([{ name: "sb-auth", value: "token" }]); } catch { /* Simulate an SDK catching listener failures. */ }
      return { data: { user }, error: null };
    });
    await expect(middleware(req)).rejects.toThrow(AuthCookieError);
  });

  it("surfaces response cookie write errors", async () => {
    const bridge = createRequestCookieBridge(request("/dashboard"));
    await bridge.cookies.setAll!([{ name: "sb-auth", value: "token", options: {} }], {});
    const response = NextResponse.next();
    vi.spyOn(response.cookies, "set").mockImplementation(() => { throw new Error("response cookie failure"); });
    expect(() => bridge.applyTo(response)).toThrow("response cookie failure");
  });
});
