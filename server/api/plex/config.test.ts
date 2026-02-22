import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPlexConfig } from "./config";

vi.mock("../../config", () => ({
  getConfig: vi.fn(),
}));

import { getConfig } from "../../config";

const mockGetConfig = vi.mocked(getConfig);

const fullConfig = {
  lidarrUrl: "",
  lidarrApiKey: "",
  lidarrQualityProfileId: 1,
  lidarrRootFolderPath: "",
  lidarrMetadataProfileId: 1,
  lastfmApiKey: "",
  plexUrl: "http://plex:32400",
  plexToken: "plex-token-123",
  importPath: "",
  theme: "system" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPlexConfig", () => {
  it("returns config when Plex is configured", () => {
    mockGetConfig.mockReturnValue(fullConfig);

    const config = getPlexConfig();
    expect(config.baseUrl).toBe("http://plex:32400");
    expect(config.headers["X-Plex-Token"]).toBe("plex-token-123");
    expect(config.headers["Accept"]).toBe("application/json");
    expect(config.token).toBe("plex-token-123");
  });

  it("throws when Plex is not configured", () => {
    mockGetConfig.mockReturnValue({
      ...fullConfig,
      plexUrl: "",
      plexToken: "",
    });

    expect(() => getPlexConfig()).toThrow("Plex URL and token not configured");
  });

  it("strips trailing slashes from URL", () => {
    mockGetConfig.mockReturnValue({
      ...fullConfig,
      plexUrl: "http://plex:32400///",
    });

    const config = getPlexConfig();
    expect(config.baseUrl).toBe("http://plex:32400");
  });
});
