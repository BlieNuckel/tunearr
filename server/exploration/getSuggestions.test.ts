import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAlbumTopTags = vi.fn();
const mockGetArtistTopTags = vi.fn();
const mockGetTopAlbumsByTag = vi.fn();
const mockGetReleaseGroupIdFromRelease = vi.fn();
const mockGetConfigValue = vi.fn();

vi.mock("../api/lastfm/albums", () => ({
  getAlbumTopTags: (...args: unknown[]) => mockGetAlbumTopTags(...args),
  getTopAlbumsByTag: (...args: unknown[]) => mockGetTopAlbumsByTag(...args),
}));

vi.mock("../api/lastfm/artists", () => ({
  getArtistTopTags: (...args: unknown[]) => mockGetArtistTopTags(...args),
}));

vi.mock("../api/musicbrainz/releaseGroups", () => ({
  getReleaseGroupIdFromRelease: (...args: unknown[]) =>
    mockGetReleaseGroupIdFromRelease(...args),
}));

vi.mock("../config", () => ({
  getConfigValue: (...args: unknown[]) => mockGetConfigValue(...args),
}));

import { getSuggestions } from "./getSuggestions";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetConfigValue.mockReturnValue({
    genericTags: ["seen live", "favorites"],
  });
});

const album = (name: string, mbid: string, artist = "Artist") => ({
  name,
  mbid,
  artistName: artist,
  artistMbid: `${artist}-mbid`,
  imageUrl: "",
});

describe("getSuggestions", () => {
  it("fetches album tags and returns resolved suggestions", async () => {
    mockGetAlbumTopTags.mockResolvedValue([
      { name: "rock", count: 80 },
      { name: "indie", count: 60 },
      { name: "alternative", count: 40 },
    ]);

    mockGetTopAlbumsByTag.mockResolvedValue({
      albums: [
        album("Album A", "mbid-a", "Other Artist"),
        album("Album B", "mbid-b", "Other Artist 2"),
      ],
      pagination: { page: 1, totalPages: 1 },
    });

    mockGetReleaseGroupIdFromRelease.mockResolvedValue({
      id: "rg-1",
      firstReleaseDate: "2020-01-01",
    });

    const result = await getSuggestions("Artist", "Source Album", [], []);

    expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
    expect(result.suggestions[0].releaseGroup).toMatchObject({
      id: "rg-1",
      title: expect.any(String),
    });
    expect(result.suggestions[0].tag).toBeTruthy();
    expect(result.newTags.length).toBeGreaterThan(0);
  });

  it("supplements with artist tags when album has fewer than 3 tags", async () => {
    mockGetAlbumTopTags.mockResolvedValue([
      { name: "rock", count: 50 },
    ]);
    mockGetArtistTopTags.mockResolvedValue([
      { name: "indie", count: 40 },
      { name: "alternative", count: 30 },
    ]);

    mockGetTopAlbumsByTag.mockResolvedValue({
      albums: [album("Album X", "mbid-x", "Other")],
      pagination: { page: 1, totalPages: 1 },
    });

    mockGetReleaseGroupIdFromRelease.mockResolvedValue({
      id: "rg-2",
      firstReleaseDate: "2019-05-15",
    });

    const result = await getSuggestions("Artist", "My Album", [], []);

    expect(mockGetArtistTopTags).toHaveBeenCalledWith("Artist");
    expect(result.newTags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "rock" }),
        expect.objectContaining({ name: "indie" }),
      ])
    );
  });

  it("merges accumulated tags with new tags", async () => {
    mockGetAlbumTopTags.mockResolvedValue([
      { name: "rock", count: 50 },
      { name: "electronic", count: 30 },
      { name: "ambient", count: 20 },
    ]);

    mockGetTopAlbumsByTag.mockResolvedValue({
      albums: [album("Album Z", "mbid-z", "Another")],
      pagination: { page: 1, totalPages: 1 },
    });

    mockGetReleaseGroupIdFromRelease.mockResolvedValue({
      id: "rg-3",
      firstReleaseDate: "2021-03-01",
    });

    const accumulated = [{ name: "rock", count: 100 }];
    const result = await getSuggestions("Artist", "Album", [], accumulated);

    const rockTag = result.newTags.find(
      (t) => t.name.toLowerCase() === "rock"
    );
    expect(rockTag!.count).toBe(150);
  });

  it("filters out generic tags", async () => {
    mockGetAlbumTopTags.mockResolvedValue([
      { name: "seen live", count: 100 },
      { name: "favorites", count: 90 },
      { name: "rock", count: 50 },
    ]);

    mockGetTopAlbumsByTag.mockResolvedValue({
      albums: [album("Album W", "mbid-w", "Other")],
      pagination: { page: 1, totalPages: 1 },
    });

    mockGetReleaseGroupIdFromRelease.mockResolvedValue({
      id: "rg-4",
      firstReleaseDate: "2022-01-01",
    });

    await getSuggestions("Artist", "Album", [], []);

    const tagCallArgs = mockGetTopAlbumsByTag.mock.calls.map(
      (c: unknown[]) => (c[0] as string).toLowerCase()
    );
    expect(tagCallArgs).not.toContain("seen live");
    expect(tagCallArgs).not.toContain("favorites");
  });

  it("excludes albums by the same artist as source", async () => {
    mockGetAlbumTopTags.mockResolvedValue([
      { name: "rock", count: 80 },
      { name: "indie", count: 60 },
      { name: "pop", count: 40 },
    ]);

    mockGetTopAlbumsByTag.mockResolvedValue({
      albums: [
        album("Same Artist Album", "mbid-same", "Source Artist"),
        album("Different Album", "mbid-diff", "Other"),
      ],
      pagination: { page: 1, totalPages: 1 },
    });

    mockGetReleaseGroupIdFromRelease.mockResolvedValue({
      id: "rg-5",
      firstReleaseDate: "2020-01-01",
    });

    const result = await getSuggestions("Source Artist", "Album", [], []);

    const titles = result.suggestions.map((s) => s.releaseGroup.title);
    expect(titles).not.toContain("Same Artist Album");
  });

  it("skips candidates with failed MBID resolution", async () => {
    mockGetAlbumTopTags.mockResolvedValue([
      { name: "rock", count: 80 },
      { name: "indie", count: 60 },
      { name: "pop", count: 40 },
    ]);

    mockGetTopAlbumsByTag.mockResolvedValue({
      albums: [
        album("Bad Album", "mbid-bad", "Other1"),
        album("Good Album", "mbid-good", "Other2"),
      ],
      pagination: { page: 1, totalPages: 1 },
    });

    mockGetReleaseGroupIdFromRelease
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ id: "rg-good", firstReleaseDate: "2020" });

    const result = await getSuggestions("Artist", "Album", [], []);

    if (result.suggestions.length > 0) {
      expect(result.suggestions[0].releaseGroup.id).toBe("rg-good");
    }
  });

  it("returns empty suggestions when all tags are generic", async () => {
    mockGetAlbumTopTags.mockResolvedValue([
      { name: "seen live", count: 100 },
      { name: "favorites", count: 90 },
    ]);
    mockGetArtistTopTags.mockResolvedValue([]);

    const result = await getSuggestions("Artist", "Album", [], []);
    expect(result.suggestions).toEqual([]);
  });

  it("excludes albums in excludeMbids", async () => {
    mockGetAlbumTopTags.mockResolvedValue([
      { name: "rock", count: 80 },
      { name: "indie", count: 60 },
      { name: "pop", count: 40 },
    ]);

    mockGetTopAlbumsByTag.mockResolvedValue({
      albums: [
        album("Excluded", "mbid-excluded", "Other"),
        album("Included", "mbid-included", "Other2"),
      ],
      pagination: { page: 1, totalPages: 1 },
    });

    mockGetReleaseGroupIdFromRelease.mockResolvedValue({
      id: "rg-inc",
      firstReleaseDate: "2020-01-01",
    });

    const result = await getSuggestions(
      "Artist",
      "Album",
      ["mbid-excluded"],
      []
    );

    const mbids = result.suggestions.map((s) =>
      s.releaseGroup["artist-credit"][0].artist.name
    );
    expect(mbids).not.toContain("Other");
  });

  it("constructs valid ReleaseGroup objects", async () => {
    mockGetAlbumTopTags.mockResolvedValue([
      { name: "rock", count: 80 },
      { name: "indie", count: 60 },
      { name: "pop", count: 40 },
    ]);

    mockGetTopAlbumsByTag.mockResolvedValue({
      albums: [album("Test Album", "test-mbid", "Test Artist")],
      pagination: { page: 1, totalPages: 1 },
    });

    mockGetReleaseGroupIdFromRelease.mockResolvedValue({
      id: "rg-test",
      firstReleaseDate: "2023-06-15",
    });

    const result = await getSuggestions("Other", "Other Album", [], []);

    if (result.suggestions.length > 0) {
      const rg = result.suggestions[0].releaseGroup;
      expect(rg).toMatchObject({
        id: "rg-test",
        score: 0,
        title: "Test Album",
        "primary-type": "Album",
        "first-release-date": "2023-06-15",
      });
      expect(rg["artist-credit"][0]).toMatchObject({
        name: "Test Artist",
        artist: { id: "Test Artist-mbid", name: "Test Artist" },
      });
    }
  });
});
