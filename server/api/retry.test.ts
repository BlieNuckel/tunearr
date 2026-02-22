import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry } from "./retry";

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");

    const result = await withRetry(fn);

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable errors and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValue("ok");

    const promise = withRetry(fn, { baseDelayMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting all retries", async () => {
    vi.useRealTimers();
    const error = new TypeError("network error");
    const fn = vi.fn().mockRejectedValue(error);

    await expect(
      withRetry(fn, { retries: 2, baseDelayMs: 1 })
    ).rejects.toThrow("network error");
    expect(fn).toHaveBeenCalledTimes(3);

    vi.useFakeTimers();
  });

  it("does not retry non-retryable errors", async () => {
    const error = Object.assign(new Error("Not found"), { status: 404 });
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn)).rejects.toThrow("Not found");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 status errors", async () => {
    const error = Object.assign(new Error("Rate limited"), { status: 429 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue("ok");

    const promise = withRetry(fn, { baseDelayMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on 500 status errors", async () => {
    const error = Object.assign(new Error("Server error"), { status: 500 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue("ok");

    const promise = withRetry(fn, { baseDelayMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("uses exponential backoff", async () => {
    const error = new TypeError("fetch failed");
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue("ok");

    const promise = withRetry(fn, { retries: 2, baseDelayMs: 100 });

    // First retry after 100ms (100 * 2^0)
    await vi.advanceTimersByTimeAsync(100);
    expect(fn).toHaveBeenCalledTimes(2);

    // Second retry after 200ms (100 * 2^1)
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("uses custom retryOn function", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("custom"))
      .mockResolvedValue("ok");

    const promise = withRetry(fn, {
      baseDelayMs: 100,
      retryOn: (err) => err instanceof Error && err.message === "custom",
    });
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("respects retries count of 0", async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError("fail"));

    await expect(withRetry(fn, { retries: 0 })).rejects.toThrow("fail");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
