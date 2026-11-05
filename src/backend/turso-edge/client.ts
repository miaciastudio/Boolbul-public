import "server-only";
import { createClient, type Client } from "@libsql/client/web";

export function createTursoClient(signal: AbortSignal): Client {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error("Turso configuration is missing");
  }
  const parsedUrl = new URL(url);
  if (!["libsql:", "https:"].includes(parsedUrl.protocol) || parsedUrl.search || parsedUrl.username || parsedUrl.password) {
    throw new Error("Turso requires a secure primary database URL");
  }
  // HTTP avoids WebSocket state and carries the request-wide cancellation signal.
  return createClient({
    url: url.replace(/^libsql:/, "https:"),
    authToken,
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      signal.throwIfAborted();
      return fetch(input, { ...init, signal, cache: "no-store" });
    },
  });
}
