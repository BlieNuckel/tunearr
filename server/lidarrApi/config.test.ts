import { describe, it, expect, vi, beforeEach } from "vitest";
import { getLidarrConfig } from "./config";

vi.mock("../config", () => ({
  getConfig: vi.fn(),
}));

import { getConfig } from "../config";

const mockGetConfig = vi.mocked(getConfig);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getLidarrConfig", () => {
  it("returns url and headers when configured", () => {
    mockGetConfig.mockReturnValue({
      lidarrUrl: "http://lidarr:8686",
      lidarrApiKey: "test-api-key",
      lidarrQualityProfileId: 1,
      lidarrRootFolderPath: "/music",
      lidarrMetadataProfileId: 1,
      lastfmApiKey: "",
      plexUrl: "",
      plexToken: "",
      importPath: "",
      theme: "system",
    });

    const config = getLidarrConfig();
    expect(config.url).toBe("http://lidarr:8686");
    expect(config.headers["X-Api-Key"]).toBe("test-api-key");
    expect(config.headers["Content-Type"]).toBe("application/json");
  });

  it("throws when lidarr is not configured", () => {
    mockGetConfig.mockReturnValue({
      lidarrUrl: "",
      lidarrApiKey: "",
      lidarrQualityProfileId: 1,
      lidarrRootFolderPath: "",
      lidarrMetadataProfileId: 1,
      lastfmApiKey: "",
      plexUrl: "",
      plexToken: "",
      importPath: "",
      theme: "system",
    });

    expect(() => getLidarrConfig()).toThrow("Lidarr not configured");
  });

  it("throws when only url is set but not api key", () => {
    mockGetConfig.mockReturnValue({
      lidarrUrl: "http://lidarr:8686",
      lidarrApiKey: "",
      lidarrQualityProfileId: 1,
      lidarrRootFolderPath: "",
      lidarrMetadataProfileId: 1,
      lastfmApiKey: "",
      plexUrl: "",
      plexToken: "",
      importPath: "",
      theme: "system",
    });

    expect(() => getLidarrConfig()).toThrow("Lidarr not configured");
  });
});
