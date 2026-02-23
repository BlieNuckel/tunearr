import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSimilarArtists,
  getArtistTopTags,
  getTopArtistsByTag,
} from "./artists";

vi.mock("./config", () => ({
  buildUrl: vi.fn(() => "https://lastfm.test/api"),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

function jsonResponse(data: unknown) {
  return { json: () => Promise.resolve(data) };
}

describe("getSimilarArtists", () => {
  it("maps response to artist objects", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        similarartists: {
          artist: [
            { name: "Thom Yorke", mbid: "abc-123", match: "0.85" },
            { name: "Portishead", mbid: "", match: "0.72" },
          ],
        },
      })
    );

    const result = await getSimilarArtists("Radiohead");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: "Thom Yorke",
      mbid: "abc-123",
      match: 0.85,
      imageUrl: "",
    });
    expect(result[1].mbid).toBe("");
  });

  it("throws on API error response", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ error: 6, message: "Artist not found" })
    );

    await expect(getSimilarArtists("nonexistent")).rejects.toThrow(
      "Artist not found"
    );
  });

  it("returns empty array when no similar artists", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ similarartists: {} }));

    const result = await getSimilarArtists("Obscure Artist");
    expect(result).toEqual([]);
  });
});

describe("getArtistTopTags", () => {
  it("maps response to tag objects", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        toptags: {
          tag: [
            { name: "rock", count: 100 },
            { name: "alternative", count: 80 },
          ],
        },
      })
    );

    const result = await getArtistTopTags("Radiohead");
    expect(result).toEqual([
      { name: "rock", count: 100 },
      { name: "alternative", count: 80 },
    ]);
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ error: 6, message: "Artist not found" })
    );

    await expect(getArtistTopTags("bad")).rejects.toThrow("Artist not found");
  });
});

describe("getTopArtistsByTag", () => {
  it("maps response with pagination for single tag", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        topartists: {
          artist: [
            { name: "Artist One", mbid: "id-1" },
            { name: "Artist Two", mbid: "" },
          ],
          "@attr": { page: "2", totalPages: "5" },
        },
      })
    );

    const result = await getTopArtistsByTag(["rock"], "2");
    expect(result.artists).toHaveLength(2);
    expect(result.artists[0]).toEqual({
      name: "Artist One",
      mbid: "id-1",
      imageUrl: "",
      rank: 1,
    });
    expect(result.artists[1].rank).toBe(2);
    expect(result.pagination).toEqual({ page: 2, totalPages: 5 });
  });

  it("returns empty array for empty tags", async () => {
    const result = await getTopArtistsByTag([]);
    expect(result.artists).toEqual([]);
    expect(result.pagination).toEqual({ page: 1, totalPages: 1 });
  });

  it("returns union with priority for artists in multiple tags", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          topartists: {
            artist: [
              { name: "Nirvana", mbid: "n1" },
              { name: "Pearl Jam", mbid: "p1" },
              { name: "Soundgarden", mbid: "s1" },
            ],
            "@attr": { page: "1", totalPages: "1" },
          },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          topartists: {
            artist: [
              { name: "Nirvana", mbid: "n1" },
              { name: "Radiohead", mbid: "r1" },
              { name: "The Smashing Pumpkins", mbid: "t1" },
            ],
            "@attr": { page: "1", totalPages: "1" },
          },
        })
      );

    const result = await getTopArtistsByTag(["grunge", "alternative"], "1");
    expect(result.artists).toHaveLength(5);
    expect(result.artists[0].name).toBe("Nirvana");
    expect(result.artists.map((a) => a.name)).toContain("Pearl Jam");
    expect(result.artists.map((a) => a.name)).toContain("Radiohead");
  });

  it("defaults pagination to page 1 of 1", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ topartists: { artist: [] } }));

    const result = await getTopArtistsByTag(["niche"]);
    expect(result.pagination).toEqual({ page: 1, totalPages: 1 });
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ error: 6, message: "Tag not found" })
    );

    await expect(getTopArtistsByTag(["bad"])).rejects.toThrow("Tag not found");
  });
});
