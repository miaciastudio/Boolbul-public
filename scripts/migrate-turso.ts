import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client/web";

async function main(): Promise<void> {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error("Turso configuration is missing");
  const db = createClient({
    url: url.replace(/^libsql:/, "https:"), authToken,
    fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: AbortSignal.timeout(30000) }),
  });
  try {
    const sql = await readFile(new URL("../turso/migrations/001_phase_one.sql", import.meta.url), "utf8");
    await db.executeMultiple(sql);
    console.info("Turso Phase 1 schema applied.");
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  console.error("Turso migration failed", { errorType: error instanceof Error ? error.name : "UnknownError" });
  process.exitCode = 1;
});
