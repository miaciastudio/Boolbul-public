import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@boolbul\/sdk\/react$/, replacement: path("./packages/sdk/src/react.tsx") },
      { find: /^@boolbul\/sdk\/server$/, replacement: path("./packages/sdk/src/server/index.ts") },
      { find: /^@boolbul\/sdk$/, replacement: path("./packages/sdk/src/index.ts") },
      { find: /^@sdk\//, replacement: `${path("./packages/sdk/src")}/` },
      { find: /^@\//, replacement: `${path("./src")}/` },
      { find: "server-only", replacement: path("./node_modules/server-only/empty.js") },
    ],
  },
  test: { include: ["tests/**/*.test.ts"], testTimeout: 15000, hookTimeout: 30000 },
});
