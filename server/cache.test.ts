import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import NodeCache from "node-cache";
import { withCache } from "./cache";

describe("withCache", () => {
  let cache: NodeCache;

  beforeEach(() => {
    cache = new NodeCache({ checkperiod: 0 });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls the underlying function on cache miss", async () => {
    const fn = vi.fn().mockResolvedValue("result");
    const cached = withCache(fn, {
      cache,
      key: (arg: string) => arg,
      ttlMs: 60_000,
    });

    const result = await cached("test");

    expect(result).toBe("result");
    expect(fn).toHaveBeenCalledWith("test");
  });

  it("returns cached value on cache hit without calling the function", async () => {
    const fn = vi.fn().mockResolvedValue("result");
    const cached = withCache(fn, {
      cache,
      key: (arg: string) => arg,
      ttlMs: 60_000,
    });

    await cached("test");
    const result = await cached("test");

    expect(result).toBe("result");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("caches empty string results", async () => {
    const fn = vi.fn().mockResolvedValue("");
    const cached = withCache(fn, {
      cache,
      key: (arg: string) => arg,
      ttlMs: 60_000,
    });

    await cached("test");
    const result = await cached("test");

    expect(result).toBe("");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls the function again after TTL expires", async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");
    const cached = withCache(fn, {
      cache,
      key: (arg: string) => arg,
      ttlMs: 5000,
    });

    const first = await cached("test");
    expect(first).toBe("first");

    vi.advanceTimersByTime(6000);

    const second = await cached("test");
    expect(second).toBe("second");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("uses the key function to derive cache keys", async () => {
    const fn = vi.fn().mockResolvedValue("result");
    const cached = withCache(fn, {
      cache,
      key: (arg: string) => arg.toLowerCase(),
      ttlMs: 60_000,
    });

    await cached("Radiohead");
    await cached("radiohead");
    await cached("RADIOHEAD");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("supports multi-argument key functions", async () => {
    const fn = vi.fn().mockResolvedValue("artwork-url");
    const cached = withCache(fn, {
      cache,
      key: (album: string, artist: string) =>
        `${album.toLowerCase()}|${artist.toLowerCase()}`,
      ttlMs: 60_000,
    });

    await cached("OK Computer", "Radiohead");
    await cached("OK Computer", "Radiohead");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("clearCache removes all entries", async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");
    const cached = withCache(fn, {
      cache,
      key: (arg: string) => arg,
      ttlMs: 60_000,
    });

    await cached("test");
    cached.clearCache();
    const result = await cached("test");

    expect(result).toBe("second");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("shares one run between concurrent calls for the same key", async () => {
    let release!: (value: string) => void;
    const fn = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        })
    );
    const cached = withCache(fn, {
      cache,
      key: (arg: string) => arg,
      ttlMs: 60_000,
    });

    const first = cached("test");
    const second = cached("test");
    release("result");

    expect(await first).toBe("result");
    expect(await second).toBe("result");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not share runs between different keys", async () => {
    const fn = vi.fn((arg: string) => Promise.resolve(arg));
    const cached = withCache(fn, {
      cache,
      key: (arg: string) => arg,
      ttlMs: 60_000,
    });

    await Promise.all([cached("a"), cached("b")]);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("shares a rejection with waiting callers but runs again afterwards", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue("result");
    const cached = withCache(fn, {
      cache,
      key: (arg: string) => arg,
      ttlMs: 60_000,
    });

    const results = await Promise.allSettled([cached("test"), cached("test")]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    expect(fn).toHaveBeenCalledTimes(1);

    expect(await cached("test")).toBe("result");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
