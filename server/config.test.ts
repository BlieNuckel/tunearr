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
