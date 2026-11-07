// OpenNext compiles every value from .env / .env.local into
// .open-next/cloudflare/next-env.mjs, which ships INSIDE the Worker script.
// Server secrets must come only from `wrangler secret`, so after each build we
// keep just the public NEXT_PUBLIC_* values (already inlined in the browser bundle).
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const file = ".open-next/cloudflare/next-env.mjs";
if (!existsSync(file)) {
  console.error(`${file} not found — run opennextjs-cloudflare build first.`);
  process.exit(1);
}
const source = readFileSync(file, "utf8");
let removed = 0;
const cleaned = source.replace(/^export const (\w+) = (\{.*\});$/gm, (_line, mode, json) => {
  const vars = JSON.parse(json);
  const kept = Object.fromEntries(Object.entries(vars).filter(([key]) => {
    const keep = key.startsWith("NEXT_PUBLIC_");
    if (!keep) removed++;
    return keep;
  }));
  return `export const ${mode} = ${JSON.stringify(kept)};`;
});
writeFileSync(file, cleaned);
const leftover = Object.values(JSON.parse(cleaned.match(/^export const production = (\{.*\});$/m)?.[1] ?? "{}"));
console.log(`Stripped ${removed} non-public value(s) from ${file}; ${leftover.length} public value(s) kept.`);
