import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

let tmpDir: string;
let originalEnv: string | undefined;

beforeEach(() => {
  vi.resetModules();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "config-test-"));
  originalEnv = process.env.APP_CONFIG_DIR;
  process.env.APP_CONFIG_DIR = tmpDir;
});

afterEach(() => {
  process.env.APP_CONFIG_DIR = originalEnv;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function loadConfig() {
  return (await import("./config")) as typeof import("./config");
}

describe("getConfig", () => {
  it("returns defaults when no config file exists", async () => {
    const { getConfig } = await loadConfig();
    const config = getConfig();

    expect(config.lidarrUrl).toBe("");
    expect(config.lidarrApiKey).toBe("");
    expect(config.lidarrQualityProfileId).toBe(1);
    expect(config.lidarrRootFolderPath).toBe("");
    expect(config.lidarrMetadataProfileId).toBe(1);
    expect(config.lastfmApiKey).toBe("");
    expect(config.plexUrl).toBe("");
    expect(config.plexToken).toBe("");
    expect(config.importPath).toBe("");
    expect(config.slskdUrl).toBe("");
    expect(config.slskdApiKey).toBe("");
    expect(config.slskdDownloadPath).toBe("");
  });

  it("reads and merges saved config with defaults", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "config.json"),
      JSON.stringify({ lidarrUrl: "http://lidarr:8686", lidarrApiKey: "abc" })
    );

    const { getConfig } = await loadConfig();
    const config = getConfig();

    expect(config.lidarrUrl).toBe("http://lidarr:8686");
    expect(config.lidarrApiKey).toBe("abc");
    expect(config.lidarrQualityProfileId).toBe(1);
  });
});

describe("setConfig", () => {
  it("writes config and merges with existing", async () => {
    const { setConfig, getConfig } = await loadConfig();

    const base = {
      lidarrUrl: "http://test:8686",
      lidarrApiKey: "key1",
      lidarrQualityProfileId: 1,
      lidarrRootFolderPath: "/music",
      lidarrMetadataProfileId: 1,
    };

    setConfig(base);
    let config = getConfig();
    expect(config.lidarrUrl).toBe("http://test:8686");
    expect(config.lidarrApiKey).toBe("key1");

    setConfig({ ...base, lidarrUrl: "http://updated:8686" });
    config = getConfig();
    expect(config.lidarrUrl).toBe("http://updated:8686");
  });

  it("validates types", async () => {
    const { setConfig } = await loadConfig();

    expect(() => setConfig({ lidarrUrl: 123 as unknown as string })).toThrow(
      "lidarrUrl must be a string"
    );

    expect(() =>
      setConfig({
        lidarrUrl: "",
        lidarrApiKey: "",
        lidarrQualityProfileId: "bad" as unknown as number,
      })
    ).toThrow("lidarrQualityProfileId must be a number");
  });

  it("creates config directory if missing", async () => {
    const nestedDir = path.join(tmpDir, "nested", "dir");
    process.env.APP_CONFIG_DIR = nestedDir;

    const { setConfig } = await loadConfig();
    setConfig({
      lidarrUrl: "http://test:8686",
      lidarrApiKey: "key",
      lidarrQualityProfileId: 1,
      lidarrRootFolderPath: "/music",
      lidarrMetadataProfileId: 1,
    });

    expect(fs.existsSync(path.join(nestedDir, "config.json"))).toBe(true);
  });
});

describe("getConfigValue", () => {
  it("returns specific config value", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "config.json"),
      JSON.stringify({ lastfmApiKey: "fm-key-123" })
    );

    const { getConfigValue } = await loadConfig();
    expect(getConfigValue("lastfmApiKey")).toBe("fm-key-123");
    expect(getConfigValue("lidarrQualityProfileId")).toBe(1);
  });
});

describe("promotedAlbum config", () => {
  it("returns full defaults when no promotedAlbum in saved config", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "config.json"),
      JSON.stringify({ lidarrUrl: "http://test:8686" })
    );

    const { getConfig, DEFAULT_PROMOTED_ALBUM } = await loadConfig();
    const config = getConfig();

    expect(config.promotedAlbum).toEqual(DEFAULT_PROMOTED_ALBUM);
  });

  it("deep merges partial promotedAlbum with defaults", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "config.json"),
      JSON.stringify({
        promotedAlbum: { topArtistsCount: 20, cacheDurationMinutes: 60 },
      })
    );

    const { getConfig, DEFAULT_PROMOTED_ALBUM } = await loadConfig();
    const config = getConfig();

    expect(config.promotedAlbum.topArtistsCount).toBe(20);
    expect(config.promotedAlbum.cacheDurationMinutes).toBe(60);
    expect(config.promotedAlbum.pickedArtistsCount).toBe(
      DEFAULT_PROMOTED_ALBUM.pickedArtistsCount
    );
    expect(config.promotedAlbum.genericTags).toEqual(
      DEFAULT_PROMOTED_ALBUM.genericTags
    );
  });

  it("deep merges promotedAlbum on setConfig", async () => {
    const { setConfig, getConfig } = await loadConfig();

    setConfig({ promotedAlbum: { topArtistsCount: 25 } as never });
    const config = getConfig();

    expect(config.promotedAlbum.topArtistsCount).toBe(25);
    expect(config.promotedAlbum.pickedArtistsCount).toBe(3);
  });

  it("validates positive integers", async () => {
    const { setConfig } = await loadConfig();

    expect(() =>
      setConfig({ promotedAlbum: { topArtistsCount: 0 } as never })
    ).toThrow("topArtistsCount must be a positive integer");

    expect(() =>
      setConfig({ promotedAlbum: { pickedArtistsCount: -1 } as never })
    ).toThrow("pickedArtistsCount must be a positive integer");
  });

  it("validates deepPageMax >= deepPageMin", async () => {
    const { setConfig } = await loadConfig();

    expect(() =>
      setConfig({
        promotedAlbum: { deepPageMin: 5, deepPageMax: 3 } as never,
      })
    ).toThrow("deepPageMax must be >= deepPageMin");
  });

  it("validates cacheDurationMinutes is non-negative", async () => {
    const { setConfig } = await loadConfig();

    expect(() =>
      setConfig({ promotedAlbum: { cacheDurationMinutes: -1 } as never })
    ).toThrow("cacheDurationMinutes must be a non-negative number");
  });

  it("validates libraryPreference enum", async () => {
    const { setConfig } = await loadConfig();

    expect(() =>
      setConfig({ promotedAlbum: { libraryPreference: "invalid" } as never })
    ).toThrow("libraryPreference must be one of");
  });

  it("validates genericTags is an array", async () => {
    const { setConfig } = await loadConfig();

    expect(() =>
      setConfig({ promotedAlbum: { genericTags: "not-array" } as never })
    ).toThrow("genericTags must be an array");
  });

  it("allows valid promotedAlbum config", async () => {
    const { setConfig, getConfig } = await loadConfig();

    setConfig({
      promotedAlbum: {
        cacheDurationMinutes: 0,
        topArtistsCount: 5,
        pickedArtistsCount: 2,
        tagsPerArtist: 3,
        deepPageMin: 1,
        deepPageMax: 5,
        genericTags: ["rock"],
        libraryPreference: "prefer_library",
      },
    });

    const config = getConfig();
    expect(config.promotedAlbum.cacheDurationMinutes).toBe(0);
    expect(config.promotedAlbum.libraryPreference).toBe("prefer_library");
  });
});
