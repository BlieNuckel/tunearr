import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

function okResponse(data: unknown) {
  return { ok: true, json: () => Promise.resolve(data) };
}

describe("getArtistImage", () => {
  it("fetches and returns artist image URL", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        data: [
          {
            picture_big: "https://cdn.deezer.com/big.jpg",
            picture_medium: "https://cdn.deezer.com/med.jpg",
          },
        ],
      })
    );

    const { getArtistImage } = await import("./artistImages");
    const url = await getArtistImage("Radiohead");

    expect(url).toBe("https://cdn.deezer.com/big.jpg");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("uses cache on second call", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        data: [
          { picture_big: "https://cdn.deezer.com/big.jpg", picture_medium: "" },
        ],
      })
    );

    const { getArtistImage } = await import("./artistImages");
    await getArtistImage("CacheTest");
    const url = await getArtistImage("cachetest");

    expect(url).toBe("https://cdn.deezer.com/big.jpg");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns empty string on empty results", async () => {
    mockFetch.mockResolvedValue(okResponse({ data: [] }));

    const { getArtistImage } = await import("./artistImages");
    const url = await getArtistImage("Nobody");

    expect(url).toBe("");
  });

  it("returns empty string on fetch error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const { getArtistImage } = await import("./artistImages");
    const url = await getArtistImage("ErrorArtist");

    expect(url).toBe("");
  });

  it("falls back to picture_medium when picture_big is empty", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        data: [
          { picture_big: "", picture_medium: "https://cdn.deezer.com/med.jpg" },
        ],
      })
    );

    const { getArtistImage } = await import("./artistImages");
    const url = await getArtistImage("MediumOnly");

    expect(url).toBe("https://cdn.deezer.com/med.jpg");
  });
});

describe("enrichWithImages", () => {
  it("fills in missing imageUrls from Deezer", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        data: [
          { picture_big: "https://cdn.deezer.com/img.jpg", picture_medium: "" },
        ],
      })
    );

    const { enrichWithImages } = await import("./artistImages");
    const artists = [
      { name: "Has Image", imageUrl: "existing.jpg" },
      { name: "Needs Image", imageUrl: "" },
    ];

    const result = await enrichWithImages(artists);
    expect(result[0].imageUrl).toBe("existing.jpg");
    expect(result[1].imageUrl).toBe("https://cdn.deezer.com/img.jpg");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns artists unchanged when all have images", async () => {
    const { enrichWithImages } = await import("./artistImages");
    const artists = [
      { name: "A", imageUrl: "a.jpg" },
      { name: "B", imageUrl: "b.jpg" },
    ];

    const result = await enrichWithImages(artists);
    expect(result).toEqual(artists);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
