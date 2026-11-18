import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

vi.mock("./server", () => ({
  getMbServer: () => ({
    root: "https://musicbrainz.org",
    baseUrl: "https://musicbrainz.org/ws/2",
    kind: "official",
    intervalMs: 1100,
  }),
}));

import {
  closeMbCacheStore,
  flushMbCacheStore,
  openMbCacheStore,
  pruneMbCacheStore,
  readStoredEntry,
  writeStoredEntry,
  clearMbCacheStore,
  defaultMbCachePath,
} from "./store";

let tmpDir: string;
let file: string;

function entry(value: unknown, freshInMs: number, keepInMs: number) {
  const now = Date.now();
  return {
    value,
    freshUntil: now + freshInMs,
    keepUntil: now + keepInMs,
    storedAt: now,
  };
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mb-cache-"));
  file = path.join(tmpDir, "mb-cache.db");
});

afterEach(() => {
  closeMbCacheStore();
  vi.useRealTimers();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("mb cache store", () => {
  it("creates its schema on open", () => {
    expect(openMbCacheStore(file)).toBe(true);
    expect(fs.existsSync(file)).toBe(true);
  });

  it("round-trips an entry through the file", () => {
    openMbCacheStore(file);
    const stored = entry({ title: "OK Computer" }, 60_000, 120_000);

    writeStoredEntry("k", stored);
    flushMbCacheStore();
    closeMbCacheStore();
    openMbCacheStore(file);

    expect(readStoredEntry("k")).toEqual(stored);
  });

  it("serves a queued write before it reaches the disk", () => {
    openMbCacheStore(file);
    const stored = entry("v", 60_000, 120_000);

    writeStoredEntry("k", stored);

    expect(readStoredEntry("k")).toEqual(stored);
  });

  it("writes on the next tick, not inline", async () => {
    openMbCacheStore(file);
    writeStoredEntry("k", entry("v", 60_000, 120_000));

    await new Promise((resolve) => setImmediate(resolve));
    closeMbCacheStore();
    openMbCacheStore(file);

    expect(readStoredEntry("k")?.value).toBe("v");
  });

  it("does not serve an entry past its keep time", () => {
    openMbCacheStore(file);
    writeStoredEntry("k", entry("v", -2000, -1000));
    flushMbCacheStore();

    expect(readStoredEntry("k")).toBeUndefined();
  });

  it("prunes entries past their keep time and leaves the rest", () => {
    openMbCacheStore(file);
    writeStoredEntry("old", entry("v", -2000, -1000));
    writeStoredEntry("kept", entry("v", -2000, 60_000));
    flushMbCacheStore();

    expect(pruneMbCacheStore()).toBe(1);
    expect(readStoredEntry("kept")?.value).toBe("v");
  });

  it("clears everything", () => {
    openMbCacheStore(file);
    writeStoredEntry("k", entry("v", 60_000, 120_000));
    flushMbCacheStore();

    clearMbCacheStore();

    expect(readStoredEntry("k")).toBeUndefined();
  });

  it("falls back to memory only when the file can't be opened", () => {
    const unopenable = path.join(tmpDir, "missing-dir", "mb-cache.db");

    expect(openMbCacheStore(unopenable)).toBe(false);
    expect(() => writeStoredEntry("k", entry("v", 1, 2))).not.toThrow();
    expect(readStoredEntry("k")).toBeUndefined();
  });
});

describe("mbCached over the store", () => {
  it("survives a restart", async () => {
    const { mbCached, MB_TTL } = await import("./cache");
    openMbCacheStore(file);
    const loader = vi.fn().mockResolvedValue({ title: "Kid A" });
    const options = { key: "album:x", ttlSeconds: MB_TTL.immutable };

    await mbCached(options, loader);
    flushMbCacheStore();
    closeMbCacheStore();

    vi.resetModules();
    const store = await import("./store");
    const restarted = await import("./cache");
    store.openMbCacheStore(file);

    expect(await restarted.mbCached(options, loader)).toEqual({
      title: "Kid A",
    });
    expect(loader).toHaveBeenCalledTimes(1);
    store.closeMbCacheStore();
  });
});

describe("defaultMbCachePath", () => {
  it("puts the file in APP_CONFIG_DIR, apart from the main database", () => {
    const original = process.env.APP_CONFIG_DIR;
    process.env.APP_CONFIG_DIR = "/config";
    try {
      expect(defaultMbCachePath()).toBe(path.join("/config", "mb-cache.db"));
    } finally {
      if (original === undefined) delete process.env.APP_CONFIG_DIR;
      else process.env.APP_CONFIG_DIR = original;
    }
  });
});
