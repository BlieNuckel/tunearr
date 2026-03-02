import { describe, it, expect, vi, beforeEach } from "vitest";
import { getArtistImage, getArtistsImages } from "./artists";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  getArtistImage.clearCache();
});

function jsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  };
}

describe("getArtistImage", () => {
  it("returns picture_xl URL when artist found", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        data: [
          {
            id: 399,
            name: "Radiohead",
            picture_xl:
              "https://e-cdns-images.dzcdn.net/images/artist/9508a2/1000x1000-000000-80-0-0.jpg",
          },
        ],
        total: 1,
      })
    );

    const result = await getArtistImage("Radiohead");

    expect(result).toBe(
      "https://e-cdns-images.dzcdn.net/images/artist/9508a2/1000x1000-000000-80-0-0.jpg"
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.deezer.com/search/artist?q=Radiohead&limit=1",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("returns empty string when no results", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        data: [],
        total: 0,
      })
    );

    const result = await getArtistImage("NonexistentArtist");
    expect(result).toBe("");
  });

  it("returns empty string when result has no picture_xl", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        data: [
          {
            id: 999,
            name: "Some Artist",
            picture_xl: "",
          },
        ],
        total: 1,
      })
    );

    const result = await getArtistImage("Some Artist");
    expect(result).toBe("");
  });

  it("returns empty string on fetch error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await getArtistImage("Radiohead");
    expect(result).toBe("");
  });

  it("returns empty string on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await getArtistImage("Radiohead");
    expect(result).toBe("");
  });
});

describe("getArtistsImages", () => {
  it("returns map of artist names to image URLs", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: 399,
              name: "Radiohead",
              picture_xl: "https://example.com/radiohead.jpg",
            },
          ],
          total: 1,
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: 1234,
              name: "Portishead",
              picture_xl: "https://example.com/portishead.jpg",
            },
          ],
          total: 1,
        })
      );

    const result = await getArtistsImages(["Radiohead", "Portishead"]);

    expect(result.size).toBe(2);
    expect(result.get("radiohead")).toBe("https://example.com/radiohead.jpg");
    expect(result.get("portishead")).toBe("https://example.com/portishead.jpg");
  });

  it("handles artists with no image", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: 399,
              name: "Radiohead",
              picture_xl: "https://example.com/radiohead.jpg",
            },
          ],
          total: 1,
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [],
          total: 0,
        })
      );

    const result = await getArtistsImages(["Radiohead", "Unknown Artist"]);

    expect(result.size).toBe(2);
    expect(result.get("radiohead")).toBe("https://example.com/radiohead.jpg");
    expect(result.get("unknown artist")).toBe("");
  });
});
