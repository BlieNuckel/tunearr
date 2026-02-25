import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getArtistArtwork,
  getArtistsArtwork,
  getAlbumArtwork,
  getAlbumsArtwork,
} from "./artists";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  getArtistArtwork.clearCache();
  getAlbumArtwork.clearCache();
});

function jsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  };
}

describe("getArtistArtwork", () => {
  it("returns 600x600 artwork URL when album found", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        resultCount: 1,
        results: [
          {
            wrapperType: "collection",
            collectionId: 1234,
            collectionName: "OK Computer",
            artistId: 816,
            artistName: "Radiohead",
            artworkUrl100:
              "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/75/9c/ff/759cff39-7fe4-a20a-3e63-d6a95db02b8c/cover.jpg/100x100bb.jpg",
          },
        ],
      })
    );

    const result = await getArtistArtwork("Radiohead");

    expect(result).toBe(
      "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/75/9c/ff/759cff39-7fe4-a20a-3e63-d6a95db02b8c/cover.jpg/600x600bb.jpg"
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "https://itunes.apple.com/search?term=Radiohead&entity=album&limit=1",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("returns empty string when no results", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        resultCount: 0,
        results: [],
      })
    );

    const result = await getArtistArtwork("NonexistentArtist");
    expect(result).toBe("");
  });

  it("returns empty string when result has no artwork", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        resultCount: 1,
        results: [
          {
            wrapperType: "collection",
            collectionId: 999,
            collectionName: "Some Album",
            artistId: 999,
            artistName: "Some Artist",
          },
        ],
      })
    );

    const result = await getArtistArtwork("Some Artist");
    expect(result).toBe("");
  });
});

describe("getArtistsArtwork", () => {
  it("returns map of artist names to artwork URLs", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          resultCount: 1,
          results: [
            {
              wrapperType: "collection",
              collectionId: 1,
              artistId: 816,
              artistName: "Radiohead",
              artworkUrl100: "https://example.com/radiohead/100x100bb.jpg",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          resultCount: 1,
          results: [
            {
              wrapperType: "collection",
              collectionId: 2,
              artistId: 1234,
              artistName: "Portishead",
              artworkUrl100: "https://example.com/portishead/100x100bb.jpg",
            },
          ],
        })
      );

    const result = await getArtistsArtwork(["Radiohead", "Portishead"]);

    expect(result.size).toBe(2);
    expect(result.get("radiohead")).toBe(
      "https://example.com/radiohead/600x600bb.jpg"
    );
    expect(result.get("portishead")).toBe(
      "https://example.com/portishead/600x600bb.jpg"
    );
  });

  it("handles artists with no artwork", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          resultCount: 1,
          results: [
            {
              wrapperType: "collection",
              collectionId: 1,
              artistId: 816,
              artistName: "Radiohead",
              artworkUrl100: "https://example.com/radiohead/100x100bb.jpg",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          resultCount: 0,
          results: [],
        })
      );

    const result = await getArtistsArtwork(["Radiohead", "Unknown Artist"]);

    expect(result.size).toBe(2);
    expect(result.get("radiohead")).toBe(
      "https://example.com/radiohead/600x600bb.jpg"
    );
    expect(result.get("unknown artist")).toBe("");
  });
});

describe("getAlbumArtwork", () => {
  it("returns 600x600 artwork URL when album found", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        resultCount: 1,
        results: [
          {
            wrapperType: "collection",
            collectionId: 1234,
            collectionName: "OK Computer",
            artistId: 816,
            artistName: "Radiohead",
            artworkUrl100: "https://example.com/okcomputer/100x100bb.jpg",
          },
        ],
      })
    );

    const result = await getAlbumArtwork("OK Computer", "Radiohead");

    expect(result).toBe("https://example.com/okcomputer/600x600bb.jpg");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://itunes.apple.com/search?term=Radiohead+OK+Computer&entity=album&limit=1",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("returns empty string when no results", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        resultCount: 0,
        results: [],
      })
    );

    const result = await getAlbumArtwork("Nonexistent Album", "Unknown Artist");
    expect(result).toBe("");
  });
});

describe("getAlbumsArtwork", () => {
  it("returns map of album keys to artwork URLs", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          resultCount: 1,
          results: [
            {
              wrapperType: "collection",
              collectionId: 1,
              collectionName: "OK Computer",
              artistId: 816,
              artistName: "Radiohead",
              artworkUrl100: "https://example.com/okcomputer/100x100bb.jpg",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          resultCount: 1,
          results: [
            {
              wrapperType: "collection",
              collectionId: 2,
              collectionName: "Dummy",
              artistId: 1234,
              artistName: "Portishead",
              artworkUrl100: "https://example.com/dummy/100x100bb.jpg",
            },
          ],
        })
      );

    const result = await getAlbumsArtwork([
      { name: "OK Computer", artistName: "Radiohead" },
      { name: "Dummy", artistName: "Portishead" },
    ]);

    expect(result.size).toBe(2);
    expect(result.get("ok computer|radiohead")).toBe(
      "https://example.com/okcomputer/600x600bb.jpg"
    );
    expect(result.get("dummy|portishead")).toBe(
      "https://example.com/dummy/600x600bb.jpg"
    );
  });
});
