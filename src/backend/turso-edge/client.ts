import { createClient } from "@libsql/client/web";

const tursoUrl = process.env.TURSO_DATABASE_URL || "libsql://placeholder.turso.io";
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN || "placeholder-token";

export const tursoClient = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

