import { InterceptError } from "./errors";

export const UPSTREAM_TIMEOUT_MS = 1200;
export const FAIL_OPEN_TIMEOUT_MS = 1500;

export type EvaluationResult<T> =
  | { status: "ok"; data: T }
  | { status: "failed_open"; reason: "timeout" | "upstream_error" | "cancelled" }
  | { status: "rejected"; error: InterceptError };

export async function evaluateRetention<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  requestSignal?: AbortSignal,
): Promise<EvaluationResult<T>> {
  const controller = new AbortController();
  let upstreamTimer: ReturnType<typeof setTimeout> | undefined;
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  let cancelRequest: (() => void) | undefined;
  const boundary = new Promise<EvaluationResult<T>>((resolve) => {
    cancelRequest = () => {
      controller.abort();
      resolve({ status: "failed_open", reason: "cancelled" });
    };
    requestSignal?.addEventListener("abort", cancelRequest, { once: true });
    upstreamTimer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    deadlineTimer = setTimeout(() => {
      controller.abort();
      resolve({ status: "failed_open", reason: "timeout" });
    }, FAIL_OPEN_TIMEOUT_MS);
    if (requestSignal?.aborted) cancelRequest();
  });

  try {
    if (controller.signal.aborted) return { status: "failed_open", reason: "cancelled" };
    const work = Promise.resolve().then(() => operation(controller.signal)).then<EvaluationResult<T>>(
      (data) => controller.signal.aborted
        ? { status: "failed_open", reason: requestSignal?.aborted ? "cancelled" : "timeout" }
        : { status: "ok", data },
    ).catch((error: unknown): EvaluationResult<T> => {
      if (controller.signal.aborted) {
        return { status: "failed_open", reason: requestSignal?.aborted ? "cancelled" : "timeout" };
      }
      if (error instanceof InterceptError) return { status: "rejected", error };
      console.error("[boolbul] Intercept upstream failure", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return { status: "failed_open", reason: "upstream_error" };
    });
    return await Promise.race([work, boundary]);
  } finally {
    clearTimeout(upstreamTimer);
    clearTimeout(deadlineTimer);
    if (cancelRequest) requestSignal?.removeEventListener("abort", cancelRequest);
    controller.abort();
  }
}
