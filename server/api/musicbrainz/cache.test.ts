import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let serverRoot = "https://musicbrainz.org";

vi.mock("./server", () => ({
  getMbServer: () => ({
    root: serverRoot,
    baseUrl: `${serverRoot}/ws/2`,
    kind: "official",
    intervalMs: 1100,
  }),
}));
import {
  mbCached,
  mbPrime,
  clearMbCache,
  getMbCacheStats,
  MB_TTL,
} from "./cache";
import type { MbPriority } from "./queue";
import { markLoadFailed, markLoadNotFound } from "./loadContext";

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  serverRoot = "https://musicbrainz.org";
  clearMbCache();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("mbCached", () => {
  it("loads on a miss and serves the cached value afterwards", async () => {
    const loader = vi.fn().mockResolvedValue("value");
    const options = { key: "k", ttlSeconds: MB_TTL.immutable };

    expect(await mbCached(options, loader)).toBe("value");
    expect(await mbCached(options, loader)).toBe("value");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("caches null as a real answer", async () => {
    const loader = vi.fn().mockResolvedValue(null);
    const options = { key: "k", ttlSeconds: MB_TTL.immutable };

    expect(await mbCached(options, loader)).toBeNull();
    expect(await mbCached(options, loader)).toBeNull();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("never caches a rejection", async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("503"))
      .mockResolvedValue("value");
    const options = { key: "k", ttlSeconds: MB_TTL.immutable };

    await expect(mbCached(options, loader)).rejects.toThrow("503");
    expect(await mbCached(options, loader)).toBe("value");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("collapses concurrent loads of the same key into one", async () => {
    const gate = deferred<string>();
    const loader = vi.fn().mockReturnValue(gate.promise);
    const options = { key: "k", ttlSeconds: MB_TTL.immutable };

    const all = Promise.all([
      mbCached(options, loader),
      mbCached(options, loader),
      mbCached(options, loader),
    ]);
    gate.resolve("value");

    expect(await all).toEqual(["value", "value", "value"]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("does not collapse loads of different keys", async () => {
    const loader = vi.fn().mockResolvedValue("value");
    await Promise.all([
      mbCached({ key: "a", ttlSeconds: MB_TTL.immutable }, loader),
      mbCached({ key: "b", ttlSeconds: MB_TTL.immutable }, loader),
    ]);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("keeps entries from different servers apart", async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce("official")
      .mockResolvedValueOnce("mirror");
    const options = { key: "k", ttlSeconds: MB_TTL.immutable };

    expect(await mbCached(options, loader)).toBe("official");
    serverRoot = "http://mb.local";
    expect(await mbCached(options, loader)).toBe("mirror");
    serverRoot = "https://musicbrainz.org";
    expect(await mbCached(options, loader)).toBe("official");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("passes the requested lane to the loader", async () => {
    const loader = vi.fn().mockResolvedValue("value");
    await mbCached(
      { key: "k", ttlSeconds: MB_TTL.immutable, priority: "background" },
      loader
    );
    expect(loader).toHaveBeenCalledWith("background");
  });

  it("defaults to the interactive lane", async () => {
    const loader = vi.fn().mockResolvedValue("value");
    await mbCached({ key: "k", ttlSeconds: MB_TTL.immutable }, loader);
    expect(loader).toHaveBeenCalledWith("interactive");
  });

  it("reports entry and in-flight counts", async () => {
    const gate = deferred<string>();
    const pending = mbCached(
      { key: "k", ttlSeconds: MB_TTL.immutable },
      () => gate.promise
    );

    expect(getMbCacheStats()).toEqual({ entries: 0, inFlight: 1 });

    gate.resolve("value");
    await pending;

    expect(getMbCacheStats()).toEqual({ entries: 1, inFlight: 0 });
  });
});

describe("past the fresh time", () => {
  const options = { key: "k", ttlSeconds: 60 };

  it("returns the refreshed value when it arrives within the page wait", async () => {
    vi.useFakeTimers();
    const loader = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValue("second");

    await mbCached(options, loader);
    vi.advanceTimersByTime(61_000);

    expect(await mbCached(options, loader)).toBe("second");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("refreshes on the caller's lane", async () => {
    vi.useFakeTimers();
    const lanes: MbPriority[] = [];
    const loader = vi.fn((priority: MbPriority) => {
      lanes.push(priority);
      return Promise.resolve("value");
    });

    await mbCached(options, loader);
    vi.advanceTimersByTime(61_000);
    await mbCached(options, loader);
    vi.advanceTimersByTime(61_000);
    await mbCached({ ...options, priority: "background" }, loader);

    expect(lanes).toEqual(["interactive", "interactive", "background"]);
  });

  it("gives a page the kept value after about a second, and lets the refresh land", async () => {
    vi.useFakeTimers();
    const slow = deferred<string>();
    const loader = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockReturnValueOnce(slow.promise);

    await mbCached(options, loader);
    vi.advanceTimersByTime(61_000);

    const result = mbCached(options, loader);
    await vi.advanceTimersByTimeAsync(999);
    let settled = false;
    void result.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toBe("first");

    slow.resolve("second");
    await vi.advanceTimersByTimeAsync(0);
    expect(await mbCached(options, loader)).toBe("second");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("makes a background caller wait for the refresh", async () => {
    vi.useFakeTimers();
    const slow = deferred<string>();
    const loader = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockReturnValueOnce(slow.promise);
    const background = { ...options, priority: "background" as const };

    await mbCached(background, loader);
    vi.advanceTimersByTime(61_000);

    const result = mbCached(background, loader);
    await vi.advanceTimersByTimeAsync(5000);
    slow.resolve("second");

    expect(await result).toBe("second");
  });

  it("serves the kept value when the refresh fails, on either lane", async () => {
    vi.useFakeTimers();
    const loader = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockRejectedValue(new Error("MusicBrainz returned 503"));

    await mbCached(options, loader);
    vi.advanceTimersByTime(61_000);

    expect(await mbCached(options, loader)).toBe("first");
    expect(await mbCached({ ...options, priority: "background" }, loader)).toBe(
      "first"
    );
  });

  it("keeps the value for 30 days past its fresh time, then forgets it", async () => {
    vi.useFakeTimers();
    const loader = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockRejectedValue(new Error("MusicBrainz returned 503"));

    await mbCached(options, loader);
    vi.advanceTimersByTime(60_000 + 30 * 24 * 60 * 60 * 1000 - 1000);
    expect(await mbCached(options, loader)).toBe("first");

    vi.advanceTimersByTime(2000);
    await expect(mbCached(options, loader)).rejects.toThrow("503");
  });

  it("replaces the entry when the refresh finds nothing", async () => {
    vi.useFakeTimers();
    const loader = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockImplementation(() => {
        markLoadNotFound();
        return Promise.resolve(null);
      });

    await mbCached(options, loader);
    vi.advanceTimersByTime(61_000);

    expect(await mbCached(options, loader)).toBeNull();
  });

  it("does not refresh while the value is still fresh", async () => {
    vi.useFakeTimers();
    const loader = vi.fn().mockResolvedValue("value");

    await mbCached(options, loader);
    vi.advanceTimersByTime(59_000);
    await mbCached(options, loader);

    expect(loader).toHaveBeenCalledTimes(1);
  });
});

describe("not found", () => {
  it("is trusted for 10 minutes, not the full TTL", async () => {
    vi.useFakeTimers();
    const options = { key: "k", ttlSeconds: MB_TTL.immutable };
    const loader = vi
      .fn()
      .mockImplementationOnce(() => {
        markLoadNotFound();
        return Promise.resolve(null);
      })
      .mockResolvedValue("added since");

    expect(await mbCached(options, loader)).toBeNull();
    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(await mbCached(options, loader)).toBeNull();

    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(await mbCached(options, loader)).toBe("added since");
  });
});

describe("composite loads", () => {
  it("stores nothing when one of its calls failed", async () => {
    const options = { key: "walk", ttlSeconds: MB_TTL.immutable };
    const loader = vi
      .fn()
      .mockImplementationOnce(() => {
        markLoadFailed();
        return Promise.resolve(["partial"]);
      })
      .mockResolvedValue(["complete"]);

    expect(await mbCached(options, loader)).toEqual(["partial"]);
    expect(await mbCached(options, loader)).toEqual(["complete"]);
    expect(await mbCached(options, loader)).toEqual(["complete"]);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("stores nothing when an inner call fell back to a kept value", async () => {
    vi.useFakeTimers();
    const inner = { key: "inner", ttlSeconds: 60 };
    const innerLoader = vi
      .fn()
      .mockResolvedValueOnce("old")
      .mockRejectedValue(new Error("503"));
    await mbCached(inner, innerLoader);
    vi.advanceTimersByTime(61_000);

    const outer = { key: "outer", ttlSeconds: MB_TTL.immutable };
    const outerLoader = vi.fn(async () => {
      const part = await mbCached(inner, innerLoader);
      return `built from ${part}`;
    });

    expect(await mbCached(outer, outerLoader)).toBe("built from old");
    await mbCached(outer, outerLoader);
    expect(outerLoader).toHaveBeenCalledTimes(2);
  });
});

describe("in-flight sharing", () => {
  it("does not make a page join a load queued on the background lane", async () => {
    const slow = deferred<string>();
    const loader = vi
      .fn()
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValue("page");
    const options = { key: "k", ttlSeconds: MB_TTL.immutable };

    const poller = mbCached({ ...options, priority: "background" }, loader);
    const page = mbCached({ ...options, priority: "interactive" }, loader);

    expect(await page).toBe("page");
    expect(loader.mock.calls.map((c) => c[0])).toEqual([
      "background",
      "interactive",
    ]);

    slow.resolve("poller");
    expect(await poller).toBe("poller");
  });
});

describe("expiry spread", () => {
  it("cuts up to 3 days off long fresh times", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    const options = { key: "k", ttlSeconds: MB_TTL.immutable };
    const loader = vi.fn().mockResolvedValue("value");

    await mbCached(options, loader);
    vi.advanceTimersByTime(27.01 * 24 * 60 * 60 * 1000);
    await mbCached({ ...options, priority: "background" }, loader);

    expect(loader).toHaveBeenCalledTimes(2);
    vi.mocked(Math.random).mockRestore();
  });

  it("leaves short fresh times alone", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    const options = { key: "k", ttlSeconds: MB_TTL.volatile };
    const loader = vi.fn().mockResolvedValue("value");

    await mbCached(options, loader);
    vi.advanceTimersByTime(MB_TTL.volatile * 1000 - 1000);
    await mbCached(options, loader);

    expect(loader).toHaveBeenCalledTimes(1);
    vi.mocked(Math.random).mockRestore();
  });
});

describe("clearMbCache", () => {
  it("drops cached values", async () => {
    const loader = vi.fn().mockResolvedValue("value");
    const options = { key: "k", ttlSeconds: MB_TTL.immutable };

    await mbCached(options, loader);
    clearMbCache();
    await mbCached(options, loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });
});

describe("mbPrime", () => {
  it("seeds an entry a later call is served from", async () => {
    const loader = vi.fn().mockResolvedValue("loaded");
    mbPrime({ key: "k", ttlSeconds: MB_TTL.immutable }, "primed");

    expect(await mbCached({ key: "k", ttlSeconds: 60 }, loader)).toBe("primed");
    expect(loader).not.toHaveBeenCalled();
  });

  it("never overwrites an existing entry", async () => {
    await mbCached({ key: "k", ttlSeconds: 60 }, () =>
      Promise.resolve("looked up")
    );
    mbPrime({ key: "k", ttlSeconds: MB_TTL.immutable }, "primed");

    expect(
      await mbCached({ key: "k", ttlSeconds: 60 }, () =>
        Promise.resolve("again")
      )
    ).toBe("looked up");
  });

  it("is scoped to the server it came from", async () => {
    mbPrime({ key: "k", ttlSeconds: MB_TTL.immutable }, "official");
    serverRoot = "http://mb.local";

    expect(
      await mbCached({ key: "k", ttlSeconds: 60 }, () =>
        Promise.resolve("mirror")
      )
    ).toBe("mirror");
  });
});
