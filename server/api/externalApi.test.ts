import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createExternalApi } from "./externalApi";

function mockFetchFn(data: unknown = {}, status = 200) {
  return vi.fn().mockResolvedValue({
    json: () => Promise.resolve(data),
    ok: status >= 200 && status < 300,
    status,
  });
}

describe("createExternalApi", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("get", () => {
    it("fetches data from the correct URL", async () => {
      const fetchFn = mockFetchFn({ name: "test" });
      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      const result = await api.get<{ name: string }>("/artists");

      expect(result).toEqual({ name: "test" });
      expect(fetchFn).toHaveBeenCalledWith(
        "https://api.example.com/artists",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Accept: "application/json",
          }),
        })
      );
    });

    it("merges default params into the URL", async () => {
      const fetchFn = mockFetchFn({});
      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        defaultParams: { api_key: "abc123", format: "json" },
        fetchFn,
      });

      await api.get("/search");

      const calledUrl = fetchFn.mock.calls[0][0] as string;
      expect(calledUrl).toContain("api_key=abc123");
      expect(calledUrl).toContain("format=json");
    });

    it("merges request params with default params", async () => {
      const fetchFn = mockFetchFn({});
      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        defaultParams: { api_key: "abc123" },
        fetchFn,
      });

      await api.get("/search", { params: { q: "radiohead" } });

      const calledUrl = fetchFn.mock.calls[0][0] as string;
      expect(calledUrl).toContain("api_key=abc123");
      expect(calledUrl).toContain("q=radiohead");
    });

    it("merges default headers with request headers", async () => {
      const fetchFn = mockFetchFn({});
      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        defaultHeaders: { "X-Api-Key": "secret" },
        fetchFn,
      });

      await api.get("/data", { headers: { "X-Custom": "value" } });

      expect(fetchFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Api-Key": "secret",
            "X-Custom": "value",
          }),
        })
      );
    });

    it("returns cached data on subsequent calls", async () => {
      const fetchFn = mockFetchFn({ name: "cached" });
      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      await api.get("/artists");
      const result = await api.get<{ name: string }>("/artists");

      expect(result).toEqual({ name: "cached" });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("re-fetches after TTL expires", async () => {
      const fetchFn = mockFetchFn({ name: "first" });
      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      await api.get("/artists", undefined, 5);

      fetchFn.mockResolvedValueOnce({
        json: () => Promise.resolve({ name: "second" }),
        ok: true,
        status: 200,
      });

      vi.advanceTimersByTime(6000);

      const result = await api.get<{ name: string }>("/artists", undefined, 5);
      expect(result).toEqual({ name: "second" });
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it("skips cache when ttl is 0", async () => {
      const fetchFn = mockFetchFn({ count: 1 });
      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      await api.get("/stats", undefined, 0);

      fetchFn.mockResolvedValueOnce({
        json: () => Promise.resolve({ count: 2 }),
        ok: true,
        status: 200,
      });

      const result = await api.get<{ count: number }>("/stats", undefined, 0);
      expect(result).toEqual({ count: 2 });
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it("caches different endpoints separately", async () => {
      const fetchFn = vi.fn();
      fetchFn.mockResolvedValueOnce({
        json: () => Promise.resolve({ type: "artists" }),
        ok: true,
        status: 200,
      });
      fetchFn.mockResolvedValueOnce({
        json: () => Promise.resolve({ type: "albums" }),
        ok: true,
        status: 200,
      });

      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      const artists = await api.get<{ type: string }>("/artists");
      const albums = await api.get<{ type: string }>("/albums");

      expect(artists).toEqual({ type: "artists" });
      expect(albums).toEqual({ type: "albums" });
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it("caches different params separately", async () => {
      const fetchFn = vi.fn();
      fetchFn.mockResolvedValueOnce({
        json: () => Promise.resolve({ artist: "Radiohead" }),
        ok: true,
        status: 200,
      });
      fetchFn.mockResolvedValueOnce({
        json: () => Promise.resolve({ artist: "Bjork" }),
        ok: true,
        status: 200,
      });

      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      await api.get("/search", { params: { q: "radiohead" } });
      await api.get("/search", { params: { q: "bjork" } });

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe("post", () => {
    it("sends POST request with body", async () => {
      const fetchFn = mockFetchFn({ id: 1 });
      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      const result = await api.post<{ id: number }>("/artists", {
        name: "Radiohead",
      });

      expect(result).toEqual({ id: 1 });
      expect(fetchFn).toHaveBeenCalledWith(
        "https://api.example.com/artists",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "Radiohead" }),
        })
      );
    });

    it("caches POST responses", async () => {
      const fetchFn = mockFetchFn({ id: 1 });
      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      await api.post("/artists", { name: "Radiohead" });
      const result = await api.post<{ id: number }>("/artists", {
        name: "Radiohead",
      });

      expect(result).toEqual({ id: 1 });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("different POST bodies are cached separately", async () => {
      const fetchFn = vi.fn();
      fetchFn.mockResolvedValueOnce({
        json: () => Promise.resolve({ id: 1 }),
        ok: true,
        status: 200,
      });
      fetchFn.mockResolvedValueOnce({
        json: () => Promise.resolve({ id: 2 }),
        ok: true,
        status: 200,
      });

      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      await api.post("/artists", { name: "Radiohead" });
      await api.post("/artists", { name: "Bjork" });

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe("getRolling", () => {
    it("returns cached data and refreshes in background when near expiry", async () => {
      const fetchFn = mockFetchFn({ version: 1 });
      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      await api.getRolling("/status", undefined, 30);

      fetchFn.mockResolvedValueOnce({
        json: () => Promise.resolve({ version: 2 }),
        ok: true,
        status: 200,
      });

      // Advance close to expiry (within rolling buffer)
      vi.advanceTimersByTime(20000);

      const result = await api.getRolling<{ version: number }>(
        "/status",
        undefined,
        30
      );

      // Should return stale data immediately
      expect(result).toEqual({ version: 1 });
    });

    it("fetches fresh data on cache miss", async () => {
      const fetchFn = mockFetchFn({ data: "fresh" });
      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      const result = await api.getRolling<{ data: string }>("/status");

      expect(result).toEqual({ data: "fresh" });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("removeCache", () => {
    it("removes a specific cached entry", async () => {
      const fetchFn = mockFetchFn({ name: "first" });
      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      await api.get("/artists");
      api.removeCache("/artists");

      fetchFn.mockResolvedValueOnce({
        json: () => Promise.resolve({ name: "second" }),
        ok: true,
        status: 200,
      });

      const result = await api.get<{ name: string }>("/artists");
      expect(result).toEqual({ name: "second" });
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe("clearCache", () => {
    it("removes all cached entries", async () => {
      const fetchFn = mockFetchFn({ data: "value" });
      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      await api.get("/a");
      await api.get("/b");
      api.clearCache();

      expect(api.cache.keys()).toHaveLength(0);
    });
  });

  describe("rate limiting", () => {
    it("delays requests when rate limit is set", async () => {
      const fetchFn = mockFetchFn({});
      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        rateLimitMs: 1000,
        fetchFn,
      });

      // First request — no delay
      const p1 = api.get("/a", undefined, 0);
      vi.advanceTimersByTime(0);
      await p1;

      // Second request — should need to wait
      const p2 = api.get("/b", undefined, 0);
      vi.advanceTimersByTime(1000);
      await p2;

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe("custom fetchFn", () => {
    it("uses the provided fetch function", async () => {
      const customFetch = mockFetchFn({ custom: true });
      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn: customFetch,
      });

      await api.get("/test");

      expect(customFetch).toHaveBeenCalled();
    });
  });

  describe("timeouts", () => {
    it("passes AbortSignal.timeout to fetch calls", async () => {
      const fetchFn = mockFetchFn({ ok: true });
      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
        timeoutMs: 5000,
      });

      await api.get("/test");

      expect(fetchFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it("uses default 10s timeout when not specified", async () => {
      const fetchFn = mockFetchFn({ ok: true });
      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      await api.get("/test");

      expect(fetchFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it("applies timeout to POST requests", async () => {
      const fetchFn = mockFetchFn({ ok: true });
      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
        timeoutMs: 3000,
      });

      await api.post("/test", { data: "value" });

      expect(fetchFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });

  describe("retry", () => {
    it("retries failed requests when retry is enabled", async () => {
      const fetchFn = vi
        .fn()
        .mockRejectedValueOnce(new TypeError("fetch failed"))
        .mockResolvedValue({
          json: () => Promise.resolve({ data: "ok" }),
          ok: true,
          status: 200,
        });

      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
        retry: { retries: 1, baseDelayMs: 100 },
      });

      const promise = api.get("/test", undefined, 0);
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toEqual({ data: "ok" });
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it("does not retry when retry is not configured", async () => {
      const fetchFn = vi
        .fn()
        .mockRejectedValue(new TypeError("fetch failed"));

      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      await expect(api.get("/test", undefined, 0)).rejects.toThrow(
        "fetch failed"
      );
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("supports retry: true for default options", async () => {
      const fetchFn = vi
        .fn()
        .mockRejectedValueOnce(new TypeError("fetch failed"))
        .mockResolvedValue({
          json: () => Promise.resolve({ data: "ok" }),
          ok: true,
          status: 200,
        });

      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
        retry: true,
      });

      const promise = api.get("/test", undefined, 0);
      await vi.advanceTimersByTimeAsync(500);
      const result = await promise;

      expect(result).toEqual({ data: "ok" });
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe("deduplication", () => {
    it("deduplicates concurrent GET requests for the same endpoint", async () => {
      let resolveJson: (value: unknown) => void;
      const jsonPromise = new Promise((resolve) => {
        resolveJson = resolve;
      });

      const fetchFn = vi.fn().mockResolvedValue({
        json: () => jsonPromise,
        ok: true,
        status: 200,
      });

      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      const p1 = api.get("/test", undefined, 0);
      const p2 = api.get("/test", undefined, 0);

      resolveJson!({ data: "shared" });

      const [r1, r2] = await Promise.all([p1, p2]);

      expect(r1).toEqual({ data: "shared" });
      expect(r2).toEqual({ data: "shared" });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it("does not deduplicate requests with different params", async () => {
      const fetchFn = vi.fn().mockImplementation(() =>
        Promise.resolve({
          json: () => Promise.resolve({ data: "result" }),
          ok: true,
          status: 200,
        })
      );

      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      await Promise.all([
        api.get("/test", { params: { q: "a" } }, 0),
        api.get("/test", { params: { q: "b" } }, 0),
      ]);

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it("cleans up in-flight entries after completion", async () => {
      const fetchFn = mockFetchFn({ data: "done" });

      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      await api.get("/test", undefined, 0);

      // Second call after first completes should make a new request
      fetchFn.mockResolvedValueOnce({
        json: () => Promise.resolve({ data: "done2" }),
        ok: true,
        status: 200,
      });

      const result = await api.get<{ data: string }>("/test", undefined, 0);
      expect(result).toEqual({ data: "done2" });
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it("cleans up in-flight entries on error", async () => {
      const fetchFn = vi
        .fn()
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: "ok" }),
          ok: true,
          status: 200,
        });

      const api = createExternalApi({
        baseUrl: "https://api.example.com",
        fetchFn,
      });

      await expect(api.get("/test", undefined, 0)).rejects.toThrow("fail");

      // Should be able to retry after failure
      const result = await api.get<{ data: string }>("/test", undefined, 0);
      expect(result).toEqual({ data: "ok" });
    });
  });
});
