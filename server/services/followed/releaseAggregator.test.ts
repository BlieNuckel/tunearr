import { describe, it, expect, vi, beforeEach } from "vitest";

const mockMbFetch = vi.fn();
const mockDeezerFetch = vi.fn();
const mockAppleFetch = vi.fn();

vi.mock("../../api/musicbrainz/releaseGroups", () => ({
  fetchReleaseGroupsForArtist: (...args: unknown[]) => mockMbFetch(...args),
}));
vi.mock("../../api/deezer/albums", () => ({
  getArtistAlbumsByName: (...args: unknown[]) => mockDeezerFetch(...args),
}));
vi.mock("../../api/apple/albums", () => ({
  getArtistAlbumsByName: (...args: unknown[]) => mockAppleFetch(...args),
}));
vi.mock("../../logger", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

import { aggregateArtistReleases } from "./releaseAggregator";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("aggregateArtistReleases", () => {
  it("merges releases across sources and dedupes by normalized key", async () => {
    mockMbFetch.mockResolvedValue([
      {
        id: "rg-1",
        title: "OK Computer",
        "first-release-date": "1997-06-16",
      },
    ]);
    mockDeezerFetch.mockResolvedValue([
      {
        id: 100,
        title: "OK Computer (Remastered)".replace("(Remastered)", "").trim(),
        release_date: "1997-06-16",
      },
      { id: 101, title: "Kid A", release_date: "2000-10-02" },
    ]);
    mockAppleFetch.mockResolvedValue([
      {
        collectionId: 200,
        collectionName: "Amnesiac",
        releaseDate: "2001-06-05T00:00:00Z",
      },
    ]);

    const result = await aggregateArtistReleases("mbid-123", "Radiohead");
    expect(result).toHaveLength(3);
    const ok = result.find((r) => r.album_title === "OK Computer");
    expect(ok?.source).toBe("musicbrainz");
    const kid = result.find((r) => r.album_title === "Kid A");
    expect(kid?.source).toBe("deezer");
    const am = result.find((r) => r.album_title === "Amnesiac");
    expect(am?.source).toBe("apple");
    expect(am?.release_date).toBe("2001-06-05");
  });

  it("handles MB fetch failure gracefully", async () => {
    mockMbFetch.mockRejectedValue(new Error("MB down"));
    mockDeezerFetch.mockResolvedValue([
      { id: 1, title: "Solo", release_date: "2025-03-01" },
    ]);
    mockAppleFetch.mockResolvedValue([]);

    const result = await aggregateArtistReleases("mbid-x", "X");
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("deezer");
  });

  it("ignores releases with no usable title/date", async () => {
    mockMbFetch.mockResolvedValue([
      { id: "rg-empty", title: "", "first-release-date": "" },
    ]);
    mockDeezerFetch.mockResolvedValue([]);
    mockAppleFetch.mockResolvedValue([]);

    const result = await aggregateArtistReleases("mbid-x", "X");
    expect(result).toEqual([]);
  });

  it("maps MB releases to MBID, CAA cover, and type fields", async () => {
    mockMbFetch.mockResolvedValue([
      {
        id: "rg-1",
        title: "Live Album",
        "first-release-date": "2025-05-01",
        "primary-type": "Album",
        "secondary-types": ["Live"],
      },
    ]);
    mockDeezerFetch.mockResolvedValue([]);
    mockAppleFetch.mockResolvedValue([]);

    const [rel] = await aggregateArtistReleases("mbid-x", "X");
    expect(rel.release_group_mbid).toBe("rg-1");
    expect(rel.cover_url).toBe(
      "https://coverartarchive.org/release-group/rg-1/front-500"
    );
    expect(rel.release_type).toBe("Album");
    expect(rel.secondary_types).toEqual(["Live"]);
  });

  it("maps Deezer record_type and cover, leaving MBID null", async () => {
    mockMbFetch.mockResolvedValue([]);
    mockDeezerFetch.mockResolvedValue([
      {
        id: 1,
        title: "Comp",
        release_date: "2025-03-01",
        record_type: "compilation",
        cover_xl: "https://deezer/xl.jpg",
      },
      {
        id: 2,
        title: "Ep Thing",
        release_date: "2025-03-02",
        record_type: "ep",
      },
    ]);
    mockAppleFetch.mockResolvedValue([]);

    const result = await aggregateArtistReleases("mbid-x", "X");
    const comp = result.find((r) => r.album_title === "Comp")!;
    expect(comp.release_group_mbid).toBeNull();
    expect(comp.cover_url).toBe("https://deezer/xl.jpg");
    expect(comp.release_type).toBe("Album");
    expect(comp.secondary_types).toEqual(["Compilation"]);

    const ep = result.find((r) => r.album_title === "Ep Thing")!;
    expect(ep.release_type).toBe("EP");
    expect(ep.secondary_types).toEqual([]);
    expect(ep.cover_url).toBeNull();
  });

  it("maps Apple artwork and leaves type fields null", async () => {
    mockMbFetch.mockResolvedValue([]);
    mockDeezerFetch.mockResolvedValue([]);
    mockAppleFetch.mockResolvedValue([
      {
        collectionId: 2,
        collectionName: "Apple Only",
        releaseDate: "2025-02-01T00:00:00Z",
        artworkUrl100: "https://apple/art.jpg",
      },
    ]);

    const [rel] = await aggregateArtistReleases("mbid-x", "X");
    expect(rel.release_group_mbid).toBeNull();
    expect(rel.cover_url).toBe("https://apple/art.jpg");
    expect(rel.release_type).toBeNull();
    expect(rel.secondary_types).toBeNull();
  });

  it("prefers MB row when same title+month surfaces from multiple sources", async () => {
    mockMbFetch.mockResolvedValue([
      { id: "rg-1", title: "Hello World", "first-release-date": "2025-05-01" },
    ]);
    mockDeezerFetch.mockResolvedValue([
      { id: 1, title: "Hello World", release_date: "2025-05-15" },
    ]);
    mockAppleFetch.mockResolvedValue([
      {
        collectionId: 2,
        collectionName: "Hello World",
        releaseDate: "2025-05-20",
      },
    ]);

    const result = await aggregateArtistReleases("mbid-x", "X");
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("musicbrainz");
  });
});
