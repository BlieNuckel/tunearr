import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTopAlbumsByTag } from "./albums";

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

describe("getTopAlbumsByTag", () => {
  it("maps response to album objects with pagination", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        albums: {
          album: [
            {
              name: "OK Computer",
              mbid: "album-1",
              artist: { name: "Radiohead", mbid: "artist-1" },
            },
            {
              name: "Kid A",
              mbid: "album-2",
              artist: { name: "Radiohead", mbid: "artist-1" },
            },
          ],
          "@attr": { page: "1", totalPages: "3" },
        },
      })
    );

    const result = await getTopAlbumsByTag("alternative");
    expect(result.albums).toHaveLength(2);
    expect(result.albums[0]).toEqual({
      name: "OK Computer",
      mbid: "album-1",
      artistName: "Radiohead",
      artistMbid: "artist-1",
      imageUrl: "",
    });
    expect(result.pagination).toEqual({ page: 1, totalPages: 3 });
  });

  it("throws on API error response", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ error: 6, message: "Tag not found" })
    );

    await expect(getTopAlbumsByTag("nonexistent")).rejects.toThrow(
      "Tag not found"
    );
  });

  it("returns empty array when no albums", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ albums: {} }));

    const result = await getTopAlbumsByTag("niche");
    expect(result.albums).toEqual([]);
  });

  it("defaults pagination to page 1 of 1", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ albums: { album: [] } }));

    const result = await getTopAlbumsByTag("niche");
    expect(result.pagination).toEqual({ page: 1, totalPages: 1 });
  });

  it("throws with default message when API error has no message", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: 6 }));

    await expect(getTopAlbumsByTag("bad")).rejects.toThrow("Last.fm API error");
  });

  it("handles missing mbid and artist fields", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        albums: {
          album: [{ name: "Album", mbid: "", artist: { name: "", mbid: "" } }],
        },
      })
    );

    const result = await getTopAlbumsByTag("rock");
    expect(result.albums[0]).toEqual({
      name: "Album",
      mbid: "",
      artistName: "",
      artistMbid: "",
      imageUrl: "",
    });
  });
});
