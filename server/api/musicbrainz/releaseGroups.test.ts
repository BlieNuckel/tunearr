import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchReleaseGroups,
  searchArtistReleaseGroups,
  getReleaseGroupIdFromRelease,
} from "./releaseGroups";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("./config", () => ({
  MB_BASE: "https://musicbrainz.test/ws/2",
  MB_HEADERS: { "User-Agent": "test" },
  rateLimitedMbFetch: (...args: unknown[]) => mockFetch(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function okResponse(data: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(data) };
}

function errorResponse(status: number) {
  return { ok: false, status, json: () => Promise.resolve({}) };
}

describe("searchReleaseGroups", () => {
  it("returns release groups sorted by score", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        "release-groups": [
          { id: "1", score: 50, title: "Low Score" },
          { id: "2", score: 100, title: "High Score" },
          { id: "3", score: 75, title: "Mid Score" },
        ],
        count: 3,
        offset: 0,
      })
    );

    const result = await searchReleaseGroups("test");
    expect(result["release-groups"][0].score).toBe(100);
    expect(result["release-groups"][1].score).toBe(75);
    expect(result["release-groups"][2].score).toBe(50);
    expect(result.count).toBe(3);
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(503));

    await expect(searchReleaseGroups("test")).rejects.toThrow(
      "MusicBrainz returned 503"
    );
  });
});

describe("searchArtistReleaseGroups", () => {
  it("looks up artist then fetches release groups", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okResponse({ artists: [{ id: "artist-id-1", name: "Radiohead" }] })
      )
      .mockResolvedValueOnce(
        okResponse({
          "release-groups": [
            { id: "rg-1", score: 90, title: "OK Computer" },
            { id: "rg-2", score: 95, title: "Kid A" },
          ],
          count: 2,
          offset: 0,
        })
      );

    const result = await searchArtistReleaseGroups("Radiohead");
    expect(result["release-groups"][0].title).toBe("Kid A");
    expect(result["release-groups"][1].title).toBe("OK Computer");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("returns empty when no artist found", async () => {
    mockFetch.mockResolvedValue(okResponse({ artists: [] }));

    const result = await searchArtistReleaseGroups("nonexistent");
    expect(result["release-groups"]).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("throws on artist lookup error", async () => {
    mockFetch.mockResolvedValue(errorResponse(500));

    await expect(searchArtistReleaseGroups("test")).rejects.toThrow(
      "MusicBrainz returned 500"
    );
  });

  it("throws on release group lookup error", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okResponse({ artists: [{ id: "artist-id-1", name: "Test" }] })
      )
      .mockResolvedValueOnce(errorResponse(429));

    await expect(searchArtistReleaseGroups("Test")).rejects.toThrow(
      "MusicBrainz returned 429"
    );
  });
});

describe("getReleaseGroupIdFromRelease", () => {
  it("returns release-group info from release MBID", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        id: "release-123",
        title: "OK Computer",
        "release-group": {
          id: "rg-456",
          title: "OK Computer",
          "first-release-date": "1997-06-16",
        },
      })
    );

    const result = await getReleaseGroupIdFromRelease("release-123");
    expect(result).toEqual({ id: "rg-456", firstReleaseDate: "1997-06-16" });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://musicbrainz.test/ws/2/release/release-123?inc=release-groups&fmt=json",
      { headers: { "User-Agent": "test" } }
    );
  });

  it("returns empty firstReleaseDate when not present", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        id: "release-123",
        title: "OK Computer",
        "release-group": {
          id: "rg-456",
          title: "OK Computer",
        },
      })
    );

    const result = await getReleaseGroupIdFromRelease("release-123");
    expect(result).toEqual({ id: "rg-456", firstReleaseDate: "" });
  });

  it("returns null when release not found", async () => {
    mockFetch.mockResolvedValue(errorResponse(404));

    const result = await getReleaseGroupIdFromRelease("nonexistent");
    expect(result).toBeNull();
  });

  it("returns null when release-group is missing", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        id: "release-123",
        title: "Some Release",
      })
    );

    const result = await getReleaseGroupIdFromRelease("release-123");
    expect(result).toBeNull();
  });
});
