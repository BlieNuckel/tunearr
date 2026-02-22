import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildUrl } from "./config";

vi.mock("../../config", () => ({
  getConfigValue: vi.fn(),
}));

import { getConfigValue } from "../../config";

const mockGetConfigValue = vi.mocked(getConfigValue);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildUrl", () => {
  it("builds correct URL with method, api_key, format, and extra params", () => {
    mockGetConfigValue.mockReturnValue("my-lastfm-key");

    const url = buildUrl("artist.getSimilar", {
      artist: "Radiohead",
      limit: "30",
    });
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe(
      "https://ws.audioscrobbler.com/2.0/"
    );
    expect(parsed.searchParams.get("method")).toBe("artist.getSimilar");
    expect(parsed.searchParams.get("api_key")).toBe("my-lastfm-key");
    expect(parsed.searchParams.get("format")).toBe("json");
    expect(parsed.searchParams.get("artist")).toBe("Radiohead");
    expect(parsed.searchParams.get("limit")).toBe("30");
  });

  it("throws when API key is not configured", () => {
    mockGetConfigValue.mockReturnValue("");

    expect(() =>
      buildUrl("artist.getSimilar", { artist: "Radiohead" })
    ).toThrow("Last.fm API key not configured");
  });
});
