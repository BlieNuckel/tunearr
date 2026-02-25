import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resilientFetch } from "./resilientFetch";

function mockResponse(body = "ok", status = 200): Response {
  return new Response(body, { status });
}

describe("resilientFetch", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it("returns a Response on success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse("hello"));

    const res = await resilientFetch("https://example.com");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hello");
  });

  it("passes through custom fetchFn", async () => {
    const customFetch = vi.fn().mockResolvedValue(mockResponse("custom"));

    const res = await resilientFetch("https://example.com", undefined, {
      fetchFn: customFetch,
    });

    expect(customFetch).toHaveBeenCalledOnce();
    expect(await res.text()).toBe("custom");
    expect(globalThis.fetch).not.toBe(customFetch);
  });

  it("retries on TypeError (network failure)", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValue(mockResponse("recovered"));

    const promise = resilientFetch("https://example.com");
    await vi.advanceTimersByTimeAsync(500);
    const res = await promise;

    expect(await res.text()).toBe("recovered");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("retries on ECONNRESET", async () => {
    const econnreset = Object.assign(new Error("connection reset"), {
      code: "ECONNRESET",
    });

    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(econnreset)
      .mockResolvedValue(mockResponse("recovered"));

    const promise = resilientFetch("https://example.com");
    await vi.advanceTimersByTimeAsync(500);
    const res = await promise;

    expect(await res.text()).toBe("recovered");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry on non-retryable errors", async () => {
    const error = new Error("bad request");
    globalThis.fetch = vi.fn().mockRejectedValue(error);

    await expect(resilientFetch("https://example.com")).rejects.toThrow(
      "bad request"
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("skips retry when retry is false", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      resilientFetch("https://example.com", undefined, { retry: false })
    ).rejects.toThrow("fetch failed");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("applies AbortSignal.timeout to each fetch call", async () => {
    vi.useRealTimers();

    const customFetch = vi.fn().mockImplementation((_url, init) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return Promise.resolve(mockResponse("ok"));
    });

    await resilientFetch("https://example.com", undefined, {
      timeoutMs: 5000,
      fetchFn: customFetch,
      retry: false,
    });

    expect(customFetch).toHaveBeenCalledOnce();

    vi.useFakeTimers();
  });

  it("passes init options through to fetch", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse());

    await resilientFetch(
      "https://example.com",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"key":"value"}',
      },
      { retry: false }
    );

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"key":"value"}',
        signal: expect.any(AbortSignal),
      })
    );
  });
});
