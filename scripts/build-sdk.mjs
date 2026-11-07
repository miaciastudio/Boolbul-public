import { mkdirSync, copyFileSync, existsSync, rmSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";

// Builds @boolbul/sdk: the CDN script (public/v1/boolbul.js) and the npm ESM entries.
const dist = "packages/sdk/dist";
rmSync(dist, { recursive: true, force: true }); // no stale chunks in the npm tarball
mkdirSync(dist, { recursive: true });
mkdirSync("public/v1", { recursive: true });

const common = { bundle: true, minify: true, target: ["es2020", "chrome90", "safari15", "firefox90"], legalComments: "none", logLevel: "warning" };

await build({ ...common, entryPoints: ["packages/sdk/src/global.ts"], format: "iife", outfile: `${dist}/boolbul.global.js` });
await build({
  ...common, entryPoints: { index: "packages/sdk/src/index.ts", react: "packages/sdk/src/react.tsx",
    ...(existsSync("packages/sdk/src/server/index.ts") ? { server: "packages/sdk/src/server/index.ts" } : {}) },
  format: "esm", outdir: dist, splitting: true, external: ["react", "react/jsx-runtime"], jsx: "automatic", platform: "neutral",
});
copyFileSync(`${dist}/boolbul.global.js`, "public/v1/boolbul.js");
// Type declarations for npm consumers (dist/types/**).
execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "packages/sdk/tsconfig.json"], { stdio: "inherit" });
copyFileSync("LICENSE", "packages/sdk/LICENSE");

const size = (file) => `${(statSync(file).size / 1024).toFixed(1)} kB (${(gzipSync(readFileSync(file)).length / 1024).toFixed(1)} kB gzip)`;
console.log(`public/v1/boolbul.js  ${size("public/v1/boolbul.js")}`);
console.log(`${dist}/index.js      ${size(`${dist}/index.js`)}`);
