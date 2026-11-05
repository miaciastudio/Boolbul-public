import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluateRetention } from "../src/lib/edge/retention-evaluator";
import { InterceptError } from "../src/lib/edge/errors";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("1500ms fail-open boundary", () => {
  it("returns successful work and clears timers", async () => {
    vi.useFakeTimers();
    expect(await evaluateRetention(async () => ["offer"])).toEqual({ status: "ok", data: ["offer"] });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("aborts upstream at 1200ms and resolves at 1500ms even if upstream ignores abort", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const pending = evaluateRetention((upstream) => { signal = upstream; return new Promise(() => undefined); });
    await vi.advanceTimersByTimeAsync(1199);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(signal?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(300);
    expect(await pending).toEqual({ status: "failed_open", reason: "timeout" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("settles immediately when the aborted fetch rejects", async () => {
    vi.useFakeTimers();
    const pending = evaluateRetention((signal) => new Promise((_, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    await vi.advanceTimersByTimeAsync(1200);
    expect(await pending).toEqual({ status: "failed_open", reason: "timeout" });
  });

  it("does not return a late offer after upstream budget expires", async () => {
    vi.useFakeTimers();
    const pending = evaluateRetention(() => new Promise((resolve) => setTimeout(() => resolve("late"), 1300)));
    await vi.advanceTimersByTimeAsync(1300);
    expect(await pending).toEqual({ status: "failed_open", reason: "timeout" });
  });

  it("handles cancellation before and during evaluation", async () => {
    const controller = new AbortController();
    controller.abort();
    const operation = vi.fn();
    expect(await evaluateRetention(operation, controller.signal)).toEqual({ status: "failed_open", reason: "cancelled" });
    expect(operation).not.toHaveBeenCalled();
    const active = new AbortController();
    const pending = evaluateRetention(() => new Promise(() => undefined), active.signal);
    active.abort();
    expect(await pending).toEqual({ status: "failed_open", reason: "cancelled" });
  });

  it("preserves explicit rejections but safely fails open on internal errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new InterceptError("already_claimed", 409);
    expect(await evaluateRetention(async () => { throw error; })).toEqual({ status: "rejected", error });
    expect(await evaluateRetention(async () => { throw new Error("secret database detail"); }))
      .toEqual({ status: "failed_open", reason: "upstream_error" });
    expect(console.error).not.toHaveBeenCalledWith(expect.stringContaining("secret database detail"));
  });
});
