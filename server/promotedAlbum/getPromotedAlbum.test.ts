import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetTopArtists = vi.fn();
const mockGetArtistTopTags = vi.fn();
const mockGetTopAlbumsByTag = vi.fn();
const mockLidarrGet = vi.fn();

vi.mock("../plexApi/topArtists", () => ({
  getTopArtists: (...args: unknown[]) => mockGetTopArtists(...args),
}));

vi.mock("../lastfmApi/artists", () => ({
  getArtistTopTags: (...args: unknown[]) => mockGetArtistTopTags(...args),
}));

vi.mock("../lastfmApi/albums", () => ({
  getTopAlbumsByTag: (...args: unknown[]) => mockGetTopAlbumsByTag(...args),
}));

vi.mock("../lidarrApi/get", () => ({
  lidarrGet: (...args: unknown[]) => mockLidarrGet(...args),
}));

import { getPromotedAlbum, clearPromotedAlbumCache } from "./getPromotedAlbum";

beforeEach(() => {
  vi.clearAllMocks();
  clearPromotedAlbumCache();
  vi.spyOn(Math, "random").mockReturnValue(0.1);
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
      coverUrl: expect.stringContaining(
        "https://coverartarchive.org/release-group/"
      ),
    });
    expect(result!.album.coverUrl).toContain(result!.album.mbid);
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

  it("marks inLibrary true when all albums are in library", async () => {
    mockGetTopArtists.mockResolvedValue(plexArtists);
    mockGetArtistTopTags.mockResolvedValue(tags);
    mockGetTopAlbumsByTag.mockResolvedValue(albumsPage);
    mockLidarrGet.mockResolvedValue({
      ok: true,
      data: [{ foreignArtistId: "art-1" }],
    });

    const result = await getPromotedAlbum();
    expect(result).not.toBeNull();
    expect(result!.inLibrary).toBe(true);
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
    expect(result!.album.mbid).toBe("alb-1");
  });
});
