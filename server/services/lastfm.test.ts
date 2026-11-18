import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetArtistsImages = vi.fn();

vi.mock("../api/deezer/artists", () => ({
  getArtistsImages: (...args: unknown[]) => mockGetArtistsImages(...args),
}));

import { enrichArtistsWithImages } from "./lastfm";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("enrichArtistsWithImages", () => {
  it("merges Deezer images into artists", async () => {
    const artists = [
      { name: "Radiohead", match: 0.9, imageUrl: "" },
      { name: "Thom Yorke", match: 0.8, imageUrl: "existing.jpg" },
    ];
    mockGetArtistsImages.mockResolvedValue(
      new Map([["radiohead", "https://deezer.com/radiohead.jpg"]])
    );

    const result = await enrichArtistsWithImages(artists);
    expect(result).toEqual([
      {
        name: "Radiohead",
        match: 0.9,
        imageUrl: "https://deezer.com/radiohead.jpg",
      },
      { name: "Thom Yorke", match: 0.8, imageUrl: "existing.jpg" },
    ]);
    expect(mockGetArtistsImages).toHaveBeenCalledWith([
      "Radiohead",
      "Thom Yorke",
    ]);
  });

  it("preserves existing imageUrl when no Deezer image found", async () => {
    const artists = [{ name: "Unknown", imageUrl: "fallback.jpg" }];
    mockGetArtistsImages.mockResolvedValue(new Map());

    const result = await enrichArtistsWithImages(artists);
    expect(result[0].imageUrl).toBe("fallback.jpg");
  });
});
