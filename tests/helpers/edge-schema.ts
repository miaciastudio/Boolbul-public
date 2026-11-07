import { readdirSync, readFileSync } from "node:fs";

/** Every Turso migration, in order, as one script (mirrors scripts/migrate-turso.ts). */
export function edgeSchemaSql(): string {
  const dir = new URL("../../turso/migrations/", import.meta.url);
  return readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()
    .map((name) => readFileSync(new URL(name, dir), "utf8")).join("\n");
}
