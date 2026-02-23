import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetTopArtists = vi.fn();
const mockGetArtistTopTags = vi.fn();
const mockGetTopAlbumsByTag = vi.fn();
const mockLidarrGet = vi.fn();
const mockGetReleaseGroupIdFromRelease = vi.fn();

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
}));

import { getPromotedAlbum, clearPromotedAlbumCache } from "./getPromotedAlbum";

beforeEach(() => {
  vi.clearAllMocks();
  clearPromotedAlbumCache();
  vi.spyOn(Math, "random").mockReturnValue(0.1);
  // Mock MusicBrainz conversion - by default, convert Last.fm release MBIDs to release-group MBIDs
  mockGetReleaseGroupIdFromRelease.mockImplementation((mbid: string) =>
    Promise.resolve(`rg-${mbid}`)
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

    const result = await getPromotedAlbum();
    expect(result).not.toBeNull();
    expect(result!.album).toEqual({
      name: expect.any(String),
      mbid: expect.any(String),
      artistName: expect.any(String),
      artistMbid: expect.any(String),
      coverUrl: expect.stringMatching(
        /^https:\/\/coverartarchive\.org\/release-group\//
      ),
    });
    expect(result!.tag).toBe("alternative");
    expect(result!.inLibrary).toBe(false);
    expect(mockGetTopArtists).toHaveBeenCalledWith(10);
  });

  it("fetches both page 1 and a deep page of tag albums", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

    await getPromotedAlbum();

    expect(mockGetTopAlbumsByTag).toHaveBeenCalledTimes(2);
    const calls = mockGetTopAlbumsByTag.mock.calls;
    expect(calls[0][1]).toBe("1");
    const deepPage = Number(calls[1][1]);
    expect(deepPage).toBeGreaterThanOrEqual(2);
    expect(deepPage).toBeLessThanOrEqual(10);
  });

  it("returns null when Plex has no artists", async () => {
    mockGetTopArtists.mockResolvedValue([]);

    const result = await getPromotedAlbum();
    expect(result).toBeNull();
  });

  it("returns null when all tags are generic", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue([
      { name: "seen live", count: 100 },
      { name: "favorites", count: 80 },
    ]);

    const result = await getPromotedAlbum();
    expect(result).toBeNull();
  });

  it("handles tag fetch failures gracefully", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockRejectedValue(new Error("API error"));

    const result = await getPromotedAlbum();
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

    const result = await getPromotedAlbum();
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

    const result = await getPromotedAlbum();
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

    const result = await getPromotedAlbum();
    expect(result).not.toBeNull();
    expect(result!.inLibrary).toBe(false);
  });

  it("returns cached result within 30 minutes", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

    const first = await getPromotedAlbum();
    mockGetTopArtists.mockClear();

    const second = await getPromotedAlbum();
    expect(second).toEqual(first);
    expect(mockGetTopArtists).not.toHaveBeenCalled();
  });

  it("busts cache when forceRefresh is true", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

    await getPromotedAlbum();
    mockGetTopArtists.mockClear();

    await getPromotedAlbum(true);
    expect(mockGetTopArtists).toHaveBeenCalled();
  });

  it("falls back gracefully when Lidarr is unavailable", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockRejectedValue(new Error("Connection refused"));

    const result = await getPromotedAlbum();
    expect(result).not.toBeNull();
    expect(result!.inLibrary).toBe(false);
  });

  it("treats all as not in library when Lidarr returns ok: false", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockResolvedValue({ ok: false, status: 500, data: {} });

    const result = await getPromotedAlbum();
    expect(result).not.toBeNull();
    expect(result!.inLibrary).toBe(false);
  });

  it("refetches after cache expires", async () => {
    vi.useFakeTimers();
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

    await getPromotedAlbum();
    mockGetTopArtists.mockClear();

    vi.advanceTimersByTime(31 * 60 * 1000);
    await getPromotedAlbum();
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

    const result = await getPromotedAlbum();
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

    const result = await getPromotedAlbum();
    expect(result).toBeNull();
  });

  describe("trace", () => {
    it("has correct number of plexArtists entries", async () => {
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      const result = await getPromotedAlbum();
      expect(result!.trace.plexArtists).toHaveLength(2);
      expect(result!.trace.plexArtists.map((a) => a.name)).toEqual([
        "Radiohead",
        "Bjork",
      ]);
    });

    it("marks the correct artists as picked", async () => {
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      const result = await getPromotedAlbum();
      const picked = result!.trace.plexArtists.filter((a) => a.picked);
      expect(picked).toHaveLength(2);
    });

    it("chosenTag name matches result tag", async () => {
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      const result = await getPromotedAlbum();
      expect(result!.trace.chosenTag.name).toBe(result!.tag);
    });

    it("albumPool counts are accurate", async () => {
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      const result = await getPromotedAlbum();
      expect(result!.trace.albumPool.page1Count).toBe(2);
      expect(result!.trace.albumPool.deepPageCount).toBe(2);
      expect(result!.trace.albumPool.totalAfterDedup).toBe(2);
      expect(result!.trace.albumPool.deepPage).toBeGreaterThanOrEqual(2);
      expect(result!.trace.albumPool.deepPage).toBeLessThanOrEqual(10);
    });

    it("selectionReason is preferred_non_library when artist not in library", async () => {
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      const result = await getPromotedAlbum();
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

      const result = await getPromotedAlbum();
      expect(result!.trace.selectionReason).toBe("fallback_in_library");
    });

    it("merges same tags from multiple artists with combined weight", async () => {
      mockGetTopArtists.mockResolvedValue(plexArtists);
      mockGetArtistTopTags.mockResolvedValue(tags);
      mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
      mockLidarrGet.mockResolvedValue({ ok: true, data: [] });

      const result = await getPromotedAlbum();
      const altTag = result!.trace.weightedTags.find(
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

      const result = await getPromotedAlbum();
      const radiohead = result!.trace.plexArtists.find(
        (a) => a.name === "Radiohead"
      );
      expect(radiohead!.tagContributions).toHaveLength(2);
      expect(radiohead!.tagContributions[0].tagName).toBe("alternative");
    });
  });
});
