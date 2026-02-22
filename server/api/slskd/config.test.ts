import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSlskdConfig } from "./config";

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
  plexUrl: "",
  plexToken: "",
  importPath: "",
  slskdUrl: "http://slskd:5030",
  slskdApiKey: "slskd-api-key-123",
  slskdDownloadPath: "/downloads",
  theme: "system" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSlskdConfig", () => {
  it("returns config when slskd is configured", () => {
    mockGetConfig.mockReturnValue(fullConfig);

    const config = getSlskdConfig();
    expect(config.baseUrl).toBe("http://slskd:5030");
    expect(config.headers["X-API-Key"]).toBe("slskd-api-key-123");
    expect(config.headers["Content-Type"]).toBe("application/json");
    expect(config.headers["Accept"]).toBe("application/json");
    expect(config.downloadPath).toBe("/downloads");
  });

  it("throws when slskd is not configured", () => {
    mockGetConfig.mockReturnValue({
      ...fullConfig,
      slskdUrl: "",
      slskdApiKey: "",
    });

    expect(() => getSlskdConfig()).toThrow(
      "slskd URL and API key not configured"
    );
  });

  it("strips trailing slashes from URL", () => {
    mockGetConfig.mockReturnValue({
      ...fullConfig,
      slskdUrl: "http://slskd:5030///",
    });

    const config = getSlskdConfig();
    expect(config.baseUrl).toBe("http://slskd:5030");
  });
});
