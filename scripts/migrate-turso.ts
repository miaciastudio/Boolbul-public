import { readdir, readFile } from "node:fs/promises";
import { createClient } from "@libsql/client/web";

// Applies turso/migrations/*.sql in order, once each, tracked in _boolbul_migrations.
async function main(): Promise<void> {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error("Turso configuration is missing");
  const db = createClient({
    url: url.replace(/^libsql:/, "https:"), authToken,
    fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: AbortSignal.timeout(30000) }),
  });
  try {
    await db.execute(`CREATE TABLE IF NOT EXISTS _boolbul_migrations (
      name TEXT PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    // Phase 1 predates tracking: record it when its tables already exist.
    const existing = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'edge_tenants'");
    if (existing.rows.length) await db.execute("INSERT OR IGNORE INTO _boolbul_migrations (name) VALUES ('001_phase_one.sql')");
    const applied = new Set((await db.execute("SELECT name FROM _boolbul_migrations")).rows.map((row) => String(row.name)));
    const dir = new URL("../turso/migrations/", import.meta.url);
    const files = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();
    for (const name of files) {
      if (applied.has(name)) continue;
      await db.executeMultiple(await readFile(new URL(name, dir), "utf8"));
      await db.execute({ sql: "INSERT INTO _boolbul_migrations (name) VALUES (?)", args: [name] });
      console.info(`Applied ${name}`);
    }
    console.info("Turso schema is up to date.");
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  console.error("Turso migration failed", { errorType: error instanceof Error ? error.name : "UnknownError" });
  process.exitCode = 1;
});
