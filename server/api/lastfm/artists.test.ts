import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSimilarArtists } from "./artists";

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
