import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSimilarArtists = vi.fn();
const mockEnrichArtistsWithImages = vi.fn();

vi.mock("../api/lastfm/artists", () => ({
  getSimilarArtists: (...args: unknown[]) => mockGetSimilarArtists(...args),
}));

vi.mock("../services/lastfm", () => ({
  enrichArtistsWithImages: (...args: unknown[]) =>
    mockEnrichArtistsWithImages(...args),
}));

import express from "express";
import request from "supertest";
import lastfmRouter from "./lastfm";

const app = express();
app.use("/", lastfmRouter);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /similar", () => {
  it("returns 400 when artist param is missing", async () => {
    const res = await request(app).get("/similar");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("artist");
  });

  it("returns similar artists with images", async () => {
    const artists = [{ name: "Thom Yorke", match: 0.9, imageUrl: "" }];
    mockGetSimilarArtists.mockResolvedValue(artists);
    mockEnrichArtistsWithImages.mockResolvedValue([
      {
        name: "Thom Yorke",
        match: 0.9,
        imageUrl: "https://deezer.com/thom.jpg",
      },
    ]);

    const res = await request(app).get("/similar?artist=Radiohead");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      artists: [
        {
          name: "Thom Yorke",
          match: 0.9,
          imageUrl: "https://deezer.com/thom.jpg",
        },
      ],
    });
    expect(mockGetSimilarArtists).toHaveBeenCalledWith("Radiohead");
    expect(mockEnrichArtistsWithImages).toHaveBeenCalledWith(artists);
  });
});
