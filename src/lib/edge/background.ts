import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type WaitUntil = { waitUntil(promise: Promise<unknown>): void };

/** Set by the lean worker entry (worker.ts) for requests that bypass Next.js. */
export const edgeRequestContext = new AsyncLocalStorage<WaitUntil>();

/**
 * Keeps work alive after the response on Cloudflare Workers (ctx.waitUntil) so
 * analytics never add latency to the 1500 ms fail-open budget. Outside the
 * Worker runtime (tests, next dev without bindings) the promise simply runs.
 */
export function runInBackground(work: Promise<unknown>): void {
  const guarded = work.catch(() => undefined);
  const lean = edgeRequestContext.getStore();
  if (lean) {
    lean.waitUntil(guarded);
    return;
  }
  try {
    getCloudflareContext().ctx.waitUntil(guarded);
  } catch {
    void guarded;
  }
}
