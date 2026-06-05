import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PromotedAlbumConfig } from "../config";

const mockGetTopArtists = vi.fn();
const mockGetArtistTopTags = vi.fn();
const mockGetTopAlbumsByTag = vi.fn();
const mockLidarrGet = vi.fn();
const mockGetReleaseGroupIdFromRelease = vi.fn();
const mockFetchReleaseGroupsForArtist = vi.fn();
const mockGetConfigValue = vi.fn();
const mockGetSimilarArtists = vi.fn();
const mockGetArtistMbidByName = vi.fn();

vi.mock("../api/plex/topArtists", () => ({
  getTopArtists: (...args: unknown[]) => mockGetTopArtists(...args),
}));

vi.mock("../api/lastfm/artists", () => ({
  getArtistTopTags: (...args: unknown[]) => mockGetArtistTopTags(...args),
}));

vi.mock("../api/lastfm/albums", () => ({
  getTopAlbumsByTag: (...args: unknown[]) => mockGetTopAlbumsByTag(...args),
}));

vi.mock("../api/lidarr/get", () => ({
  lidarrGet: (...args: unknown[]) => mockLidarrGet(...args),
}));

vi.mock("../api/musicbrainz/releaseGroups", () => ({
  getReleaseGroupIdFromRelease: (...args: unknown[]) =>
    mockGetReleaseGroupIdFromRelease(...args),
  fetchReleaseGroupsForArtist: (...args: unknown[]) =>
    mockFetchReleaseGroupsForArtist(...args),
}));

vi.mock("../api/listenbrainz/similarArtists", () => ({
  getSimilarArtists: (...args: unknown[]) => mockGetSimilarArtists(...args),
}));

vi.mock("../api/musicbrainz/artists", () => ({
  getArtistMbidByName: (...args: unknown[]) => mockGetArtistMbidByName(...args),
}));

vi.mock("../config", () => ({
  getConfigValue: (...args: unknown[]) => mockGetConfigValue(...args),
}));

import { getPromotedAlbum, clearPromotedAlbumCache } from "./getPromotedAlbum";
import type { WithinTasteResult, ExploreResult } from "./types";

/** Narrows a result to within-taste; the suite forces this via explorationRate: 0. */
function wt(
  result: Awaited<ReturnType<typeof getPromotedAlbum>>
): WithinTasteResult {
  if (!result || result.mode !== "within_taste") {
    throw new Error("expected a within_taste result");
  }
  return result;
}

function ex(
  result: Awaited<ReturnType<typeof getPromotedAlbum>>
): ExploreResult {
  if (!result || result.mode !== "explore") {
    throw new Error("expected an explore result");
  }
  return result;
}

const defaultPromotedAlbumConfig: PromotedAlbumConfig = {
  cacheDurationMinutes: 30,
  topArtistsRange: "6months",
  topArtistsCount: 10,
  explorationRate: 0,
  exploreCandidateCount: 12,
  genreOverlapThreshold: 0.15,
  pickedArtistsCount: 3,
  tagsPerArtist: 5,
  deepPageMin: 2,
  deepPageMax: 10,
  genericTags: [
    "seen live",
    "favorites",
    "favourite",
    "my favorite",
    "love",
    "awesome",
    "beautiful",
    "cool",
    "check out",
    "spotify",
    "under 2000 listeners",
    "all",
  ],
  libraryPreference: "prefer_new",
};

beforeEach(() => {
  vi.clearAllMocks();
  clearPromotedAlbumCache();
  vi.spyOn(Math, "random").mockReturnValue(0.1);
  mockGetConfigValue.mockReturnValue(defaultPromotedAlbumConfig);
  mockGetReleaseGroupIdFromRelease.mockImplementation((mbid: string) =>
    Promise.resolve({ id: `rg-${mbid}`, firstReleaseDate: "1997-06-16" })
  );
});

const plexArtists = [
  { name: "Radiohead", viewCount: 100, thumb: "", genres: [] },
  { name: "Bjork", viewCount: 50, thumb: "", genres: [] },
];

const tags = [
  { name: "alternative", count: 100 },
  { name: "rock", count: 80 },
];

const albumsPage = {
  albums: [
    {
      name: "OK Computer",
      mbid: "alb-1",
      artistName: "Radiohead",
      artistMbid: "art-1",
    },
    {
      name: "Kid A",
      mbid: "alb-2",
      artistName: "Radiohead",
      artistMbid: "art-1",
    },
  ],
  pagination: { page: 1, totalPages: 5 },
};

describe("getPromotedAlbum", () => {
  it("returns a promoted album on happy path with correct shape", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockResolvedValue({
      ok: true,
      data: [],
    });

    const result = await getPromotedAlbum("test-plex-token");
    expect(result).not.toBeNull();
    expect(result!.album).toEqual({
      name: expect.any(String),
      mbid: expect.any(String),
      artistName: expect.any(String),
      artistMbid: expect.any(String),
      coverUrl: expect.stringMatching(
        /^https:\/\/coverartarchive\.org\/release-group\//
      ),
      year: "1997",
    });
    expect(wt(result).tag).toBe("alternative");
    expect(result!.inLibrary).toBe(false);
    expect(mockGetTopArtists).toHaveBeenCalledWith(
      "test-plex-token",
      10,
      "6months"
    );
  });

  it("fetches both page 1 and a deep page of tag albums", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

    await getPromotedAlbum("test-plex-token");

    expect(mockGetTopAlbumsByTag).toHaveBeenCalledTimes(2);
    const calls = mockGetTopAlbumsByTag.mock.calls;
    expect(calls[0][1]).toBe("1");
    const deepPage = Number(calls[1][1]);
    expect(deepPage).toBeGreaterThanOrEqual(2);
    expect(deepPage).toBeLessThanOrEqual(10);
  });

  it("returns null when Plex has no artists", async () => {
    mockGetTopArtists.mockResolvedValue([]);

    const result = await getPromotedAlbum("test-plex-token");
    expect(result).toBeNull();
  });

  it("returns null when all tags are generic", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue([
      { name: "seen live", count: 100 },
      { name: "favorites", count: 80 },
    ]);

    const result = await getPromotedAlbum("test-plex-token");
    expect(result).toBeNull();
  });

  it("handles tag fetch failures gracefully", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockRejectedValue(new Error("API error"));

    const result = await getPromotedAlbum("test-plex-token");
    expect(result).toBeNull();
  });

  it("filters albums without MBIDs", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue({
      albums: [
        { name: "No MBID", mbid: "", artistName: "Someone", artistMbid: "x" },
      ],
      pagination: { page: 1, totalPages: 1 },
    });
    mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

    const result = await getPromotedAlbum("test-plex-token");
    expect(result).toBeNull();
  });

  it("marks inLibrary true when the album is in the Lidarr album list", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockImplementation((path: string) => {
      if (path === "/artist") {
        return Promise.resolve({
          ok: true,
          data: [{ foreignArtistId: "art-1" }],
        });
      }
      return Promise.resolve({
        ok: true,
        data: [{ foreignAlbumId: "rg-alb-1" }, { foreignAlbumId: "rg-alb-2" }],
      });
    });

    const result = await getPromotedAlbum("test-plex-token");
    expect(result).not.toBeNull();
    expect(result!.inLibrary).toBe(true);
  });

  it("marks inLibrary false when artist is in library but album is not", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockImplementation((path: string) => {
      if (path === "/artist") {
        return Promise.resolve({
          ok: true,
          data: [{ foreignArtistId: "art-1" }],
        });
      }
      return Promise.resolve({ ok: true, data: [] });
    });

    const result = await getPromotedAlbum("test-plex-token");
    expect(result).not.toBeNull();
    expect(result!.inLibrary).toBe(false);
  });

  it("returns cached result within 30 minutes", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

    const first = await getPromotedAlbum("test-plex-token");
    mockGetTopArtists.mockClear();

    const second = await getPromotedAlbum("test-plex-token");
    expect(second).toEqual(first);
    expect(mockGetTopArtists).not.toHaveBeenCalled();
  });

  it("caches results per user — different tokens get independent results", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

    await getPromotedAlbum("user-a-token");
    mockGetTopArtists.mockClear();

    await getPromotedAlbum("user-b-token");
    expect(mockGetTopArtists).toHaveBeenCalledWith(
      "user-b-token",
      10,
      "6months"
    );
  });

  it("busts cache when forceRefresh is true", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

    await getPromotedAlbum("test-plex-token");
    mockGetTopArtists.mockClear();

    await getPromotedAlbum("test-plex-token", true);
    expect(mockGetTopArtists).toHaveBeenCalled();
  });

  it("falls back gracefully when Lidarr is unavailable", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockRejectedValue(new Error("Connection refused"));

    const result = await getPromotedAlbum("test-plex-token");
    expect(result).not.toBeNull();
    expect(result!.inLibrary).toBe(false);
  });

  it("treats all as not in library when Lidarr returns ok: false", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockResolvedValue({ ok: false, status: 500, data: {} });

    const result = await getPromotedAlbum("test-plex-token");
    expect(result).not.toBeNull();
    expect(result!.inLibrary).toBe(false);
  });

  it("refetches after cache expires based on config duration", async () => {
    vi.useFakeTimers();
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

    await getPromotedAlbum("test-plex-token");
    mockGetTopArtists.mockClear();

    vi.advanceTimersByTime(31 * 60 * 1000);
    await getPromotedAlbum("test-plex-token");
    expect(mockGetTopArtists).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("respects custom cache duration from config", async () => {
    vi.useFakeTimers();
    mockGetConfigValue.mockReturnValue({
      ...defaultPromotedAlbumConfig,
      cacheDurationMinutes: 5,
    });
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

    await getPromotedAlbum("test-plex-token");
    mockGetTopArtists.mockClear();

    vi.advanceTimersByTime(6 * 60 * 1000);
    await getPromotedAlbum("test-plex-token");
    expect(mockGetTopArtists).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("deduplicates albums from both pages", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);

    const duplicatedPage = {
      albums: [
        {
          name: "OK Computer",
          mbid: "alb-1",
          artistName: "Radiohead",
          artistMbid: "art-1",
        },
      ],
      pagination: { page: 1, totalPages: 1 },
    };
    mockGetTopAlbumsByTag.mockResolvedValue(duplicatedPage);
    mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

    const result = await getPromotedAlbum("test-plex-token");
    expect(result).not.toBeNull();
    // MBID is converted from release to release-group
    expect(result!.album.mbid).toBe("rg-alb-1");
  });

  it("returns null when no albums can be converted to release-groups", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockResolvedValue({ ok: true, data: [] });
    mockGetReleaseGroupIdFromRelease.mockResolvedValue(null);

    const result = await getPromotedAlbum("test-plex-token");
    expect(result).toBeNull();
  });

  describe("anti-repeat", () => {
    it("avoids re-showing the most recent album on refresh", async () => {
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      const first = await getPromotedAlbum("test-plex-token");
      const second = await getPromotedAlbum("test-plex-token", true);

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      expect(second!.album.mbid).not.toBe(first!.album.mbid);
    });

    it("falls back to the full pool when every album was recently shown", async () => {
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue({
        albums: [albumsPage.albums[0]],
        pagination: { page: 1, totalPages: 1 },
      });
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      const first = await getPromotedAlbum("test-plex-token");
      const second = await getPromotedAlbum("test-plex-token", true);

      expect(first).not.toBeNull();
      expect(second!.album.mbid).toBe(first!.album.mbid);
    });
  });

  describe("trace", () => {
    it("has correct number of plexArtists entries", async () => {
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      const result = await getPromotedAlbum("test-plex-token");
      expect(wt(result).trace.plexArtists).toHaveLength(2);
      expect(wt(result).trace.plexArtists.map((a) => a.name)).toEqual([
        "Radiohead",
        "Bjork",
      ]);
    });

    it("marks the correct artists as picked", async () => {
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      const result = await getPromotedAlbum("test-plex-token");
      const picked = wt(result).trace.plexArtists.filter((a) => a.picked);
      expect(picked).toHaveLength(2);
    });

    it("chosenTag name matches result tag", async () => {
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      const result = await getPromotedAlbum("test-plex-token");
      expect(wt(result).trace.chosenTag.name).toBe(wt(result).tag);
    });

    it("albumPool counts are accurate", async () => {
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      const result = await getPromotedAlbum("test-plex-token");
      const { albumPool } = wt(result).trace;
      expect(albumPool.page1Count).toBe(2);
      expect(albumPool.deepPageCount).toBe(2);
      expect(albumPool.totalAfterDedup).toBe(2);
      expect(albumPool.deepPage).toBeGreaterThanOrEqual(2);
      expect(albumPool.deepPage).toBeLessThanOrEqual(10);
    });

    it("selectionReason is preferred_non_library when artist not in library", async () => {
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      const result = await getPromotedAlbum("test-plex-token");
      expect(result!.trace.selectionReason).toBe("preferred_non_library");
    });

    it("selectionReason is fallback_in_library when all artists are in library", async () => {
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockImplementation((path: string) => {
        if (path === "/artist") {
          return Promise.resolve({
            ok: true,
            data: [{ foreignArtistId: "art-1" }],
          });
        }
        return Promise.resolve({
          ok: true,
          data: [
            { foreignAlbumId: "rg-alb-1" },
            { foreignAlbumId: "rg-alb-2" },
          ],
        });
      });

      const result = await getPromotedAlbum("test-plex-token");
      expect(result!.trace.selectionReason).toBe("fallback_in_library");
    });

    it("merges same tags from multiple artists with combined weight", async () => {
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      const result = await getPromotedAlbum("test-plex-token");
      const altTag = wt(result).trace.weightedTags.find(
        (t) => t.name === "alternative"
      );
      expect(altTag).toBeDefined();
      expect(altTag!.fromArtists).toContain("Radiohead");
      expect(altTag!.fromArtists).toContain("Bjork");
      expect(altTag!.weight).toBe(100 * 100 + 100 * 50);
    });

    it("picked artists have tagContributions populated", async () => {
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      const result = await getPromotedAlbum("test-plex-token");
      const radiohead = wt(result).trace.plexArtists.find(
        (a) => a.name === "Radiohead"
      );
      expect(radiohead!.tagContributions).toHaveLength(2);
      expect(radiohead!.tagContributions[0].tagName).toBe("alternative");
    });
  });

  describe("config-driven behavior", () => {
    it("uses topArtistsCount from config", async () => {
      mockGetConfigValue.mockReturnValue({
        ...defaultPromotedAlbumConfig,
        topArtistsCount: 5,
      });
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      await getPromotedAlbum("test-plex-token");
      expect(mockGetTopArtists).toHaveBeenCalledWith(
        "test-plex-token",
        5,
        "6months"
      );
    });

    it("uses topArtistsRange from config", async () => {
      mockGetConfigValue.mockReturnValue({
        ...defaultPromotedAlbumConfig,
        topArtistsRange: "4weeks",
      });
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      await getPromotedAlbum("test-plex-token");
      expect(mockGetTopArtists).toHaveBeenCalledWith(
        "test-plex-token",
        10,
        "4weeks"
      );
    });

    it("uses custom genericTags from config", async () => {
      mockGetConfigValue.mockReturnValue({
        ...defaultPromotedAlbumConfig,
        genericTags: ["alternative"],
      });
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      const result = await getPromotedAlbum("test-plex-token");
      if (result) {
        expect(wt(result).tag).toBe("rock");
      }
    });

    it("prefer_library mode selects library artist first", async () => {
      mockGetConfigValue.mockReturnValue({
        ...defaultPromotedAlbumConfig,
        libraryPreference: "prefer_library",
      });

      const libraryAlbums = {
        albums: [
          {
            name: "Library Album",
            mbid: "lib-1",
            artistName: "Library Artist",
            artistMbid: "lib-art-1",
          },
          {
            name: "New Album",
            mbid: "new-1",
            artistName: "New Artist",
            artistMbid: "new-art-1",
          },
        ],
        pagination: { page: 1, totalPages: 1 },
      };

      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(libraryAlbums);
      mockLidarrGet.mockImplementation((p: string) => {
        if (p === "/artist") {
          return Promise.resolve({
            ok: true,
            data: [{ foreignArtistId: "lib-art-1" }],
          });
        }
        return Promise.resolve({ ok: true, data: [] });
      });

      const result = await getPromotedAlbum("test-plex-token");
      expect(result).not.toBeNull();
      expect(result!.trace.selectionReason).toBe("preferred_library");
      expect(result!.album.artistMbid).toBe("lib-art-1");
    });

    it("no_preference mode selects first valid album", async () => {
      mockGetConfigValue.mockReturnValue({
        ...defaultPromotedAlbumConfig,
        libraryPreference: "no_preference",
      });
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      const result = await getPromotedAlbum("test-plex-token");
      expect(result).not.toBeNull();
      expect(result!.trace.selectionReason).toBe("no_preference");
    });

    it("uses deepPageMin and deepPageMax from config", async () => {
      mockGetConfigValue.mockReturnValue({
        ...defaultPromotedAlbumConfig,
        deepPageMin: 5,
        deepPageMax: 5,
      });
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      await getPromotedAlbum("test-plex-token");
      const calls = mockGetTopAlbumsByTag.mock.calls;
      expect(calls[1][1]).toBe("5");
    });
  });

  describe("explore mode", () => {
    const exploreConfig = { ...defaultPromotedAlbumConfig, explorationRate: 1 };

    const similarArtists = [
      {
        artist_mbid: "mbid-rock",
        name: "Rock Clone",
        comment: "",
        type: "Group",
        gender: null,
        score: 9000,
        reference_mbid: "mbid-seed",
      },
      {
        artist_mbid: "mbid-jazz",
        name: "Jazz Cat",
        comment: "",
        type: "Group",
        gender: null,
        score: 5000,
        reference_mbid: "mbid-seed",
      },
    ];

    const genreByArtist: Record<string, { name: string; count: number }[]> = {
      Radiohead: [
        { name: "alternative", count: 100 },
        { name: "rock", count: 80 },
      ],
      "Rock Clone": [
        { name: "alternative", count: 100 },
        { name: "rock", count: 80 },
      ],
      "Jazz Cat": [
        { name: "jazz", count: 100 },
        { name: "bebop", count: 50 },
      ],
    };

    const jazzReleaseGroups = [
      {
        id: "rg-jazz-1",
        score: 1,
        title: "Blue Album",
        "primary-type": "Album",
        "first-release-date": "1965-03-01",
        "artist-credit": [
          { name: "Jazz Cat", artist: { id: "mbid-jazz", name: "Jazz Cat" } },
        ],
      },
    ];

    function setupExplore() {
      mockGetConfigValue.mockReturnValue(exploreConfig);
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistMbidByName.mockResolvedValue("mbid-seed");
      mockGetSimilarArtists.mockResolvedValue(similarArtists);
      mockGetArtistTopTags.mockImplementation((name: string) =>
        Promise.resolve(genreByArtist[name] ?? [])
      );
      mockFetchReleaseGroupsForArtist.mockImplementation((mbid: string) =>
        Promise.resolve(mbid === "mbid-jazz" ? jazzReleaseGroups : [])
      );
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });
    }

    it("surfaces a genre-distant album from a similar artist", async () => {
      setupExplore();

      const result = await getPromotedAlbum("test-plex-token");
      expect(ex(result).mode).toBe("explore");
      expect(ex(result).seedArtist).toBe("Radiohead");
      expect(ex(result).album.name).toBe("Blue Album");
      expect(ex(result).album.artistName).toBe("Jazz Cat");
      expect(ex(result).album.mbid).toBe("rg-jazz-1");
      expect(ex(result).album.year).toBe("1965");
    });

    it("reports the new genres the seed does not share", async () => {
      setupExplore();

      const result = await getPromotedAlbum("test-plex-token");
      expect(ex(result).newGenres).toEqual(["jazz", "bebop"]);
    });

    it("chooses the genre-distant candidate, not the same-genre one", async () => {
      setupExplore();

      const result = await getPromotedAlbum("test-plex-token");
      const { candidates, chosenArtist } = ex(result).trace;
      expect(chosenArtist).toBe("Jazz Cat");

      const jazz = candidates.find((c) => c.name === "Jazz Cat");
      const rock = candidates.find((c) => c.name === "Rock Clone");
      expect(jazz!.isDifferentGenre).toBe(true);
      expect(jazz!.chosen).toBe(true);
      expect(rock!.isDifferentGenre).toBe(false);
      expect(rock!.chosen).toBe(false);
    });

    it("falls back to within-taste when the seed has no MBID", async () => {
      setupExplore();
      mockGetArtistMbidByName.mockResolvedValue(null);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);

      const result = await getPromotedAlbum("test-plex-token");
      expect(result!.mode).toBe("within_taste");
    });

    it("falls back to within-taste when ListenBrainz returns no similar artists", async () => {
      setupExplore();
      mockGetSimilarArtists.mockResolvedValue([]);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);

      const result = await getPromotedAlbum("test-plex-token");
      expect(result!.mode).toBe("within_taste");
    });

    it("falls back to within-taste when no candidate is a different genre", async () => {
      setupExplore();
      mockGetArtistTopTags.mockResolvedValue(genreByArtist["Radiohead"]);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);

      const result = await getPromotedAlbum("test-plex-token");
      expect(result!.mode).toBe("within_taste");
    });

    it("does not repeat the most recent album across refreshes", async () => {
      setupExplore();
      mockFetchReleaseGroupsForArtist.mockImplementation((mbid: string) =>
        Promise.resolve(
          mbid === "mbid-jazz"
            ? [
                jazzReleaseGroups[0],
                { ...jazzReleaseGroups[0], id: "rg-jazz-2", title: "Green" },
              ]
            : []
        )
      );

      const first = await getPromotedAlbum("test-plex-token");
      const second = await getPromotedAlbum("test-plex-token", true);
      expect(ex(first).album.mbid).not.toBe(ex(second).album.mbid);
    });
  });
});
