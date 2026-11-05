import { afterEach, expect, it, vi } from "vitest";
import { createTursoClient } from "../src/backend/turso-edge/client";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("uses HTTPS transport with the request-wide AbortSignal", async () => {
  vi.stubEnv("TURSO_DATABASE_URL", "libsql://database.turso.io");
  vi.stubEnv("TURSO_AUTH_TOKEN", "test-only-token");
  const controller = new AbortController();
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    throw new Error("Test transport stopped");
  });
  vi.stubGlobal("fetch", fetchMock);
  const db = createTursoClient(controller.signal);
  try {
    await expect(db.execute("SELECT 1")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalled();
    const [input, init] = fetchMock.mock.calls[0];
    expect(input instanceof Request ? input.url : String(input)).toMatch(/^https:/);
    expect(init?.signal).toBe(controller.signal);
    expect(init?.cache).toBe("no-store");
  } finally { db.close(); }
});

it("rejects missing credentials and insecure transports", () => {
  vi.stubEnv("TURSO_AUTH_TOKEN", "");
  expect(() => createTursoClient(new AbortController().signal)).toThrow("configuration");
  vi.stubEnv("TURSO_AUTH_TOKEN", "test-token");
  vi.stubEnv("TURSO_DATABASE_URL", "http://database.turso.io");
  expect(() => createTursoClient(new AbortController().signal)).toThrow("secure");
});
