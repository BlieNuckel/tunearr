import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSimilarArtists = vi.fn();
const mockGetArtistTopTags = vi.fn();
const mockGetTopArtistsByTag = vi.fn();
const mockGetTopAlbumsByTag = vi.fn();
const mockEnrichWithImages = vi.fn();

vi.mock("../lastfmApi/artists", () => ({
  getSimilarArtists: (...args: unknown[]) => mockGetSimilarArtists(...args),
  getArtistTopTags: (...args: unknown[]) => mockGetArtistTopTags(...args),
  getTopArtistsByTag: (...args: unknown[]) => mockGetTopArtistsByTag(...args),
}));

vi.mock("../lastfmApi/albums", () => ({
  getTopAlbumsByTag: (...args: unknown[]) => mockGetTopAlbumsByTag(...args),
}));

vi.mock("../deezerApi/artistImages", () => ({
  enrichWithImages: (...args: unknown[]) => mockEnrichWithImages(...args),
}));

import express from "express";
import request from "supertest";
import lastfmRouter from "./lastfm";

const app = express();
app.use("/", lastfmRouter);

beforeEach(() => {
  vi.clearAllMocks();
  mockEnrichWithImages.mockResolvedValue(undefined);
});

describe("GET /similar", () => {
  it("returns 400 when artist param is missing", async () => {
    const res = await request(app).get("/similar");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("artist");
  });

  it("returns similar artists with images", async () => {
    const artists = [
      { name: "Thom Yorke", match: 0.9, imageUrl: "" },
    ];
    mockGetSimilarArtists.mockResolvedValue(artists);

    const res = await request(app).get("/similar?artist=Radiohead");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ artists });
    expect(mockGetSimilarArtists).toHaveBeenCalledWith("Radiohead");
    expect(mockEnrichWithImages).toHaveBeenCalledWith(artists);
  });
});

describe("GET /artist/tags", () => {
  it("returns 400 when artist param is missing", async () => {
    const res = await request(app).get("/artist/tags");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("artist");
  });

  it("returns artist tags", async () => {
    const tags = [{ name: "rock", count: 100 }];
    mockGetArtistTopTags.mockResolvedValue(tags);

    const res = await request(app).get("/artist/tags?artist=Radiohead");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tags });
    expect(mockGetArtistTopTags).toHaveBeenCalledWith("Radiohead");
  });
});

describe("GET /tag/artists", () => {
  it("returns 400 when tag param is missing", async () => {
    const res = await request(app).get("/tag/artists");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("tag");
  });

  it("returns artists by tag with default page", async () => {
    const result = {
      artists: [{ name: "Radiohead", imageUrl: "" }],
      pagination: { page: 1, totalPages: 5 },
    };
    mockGetTopArtistsByTag.mockResolvedValue(result);

    const res = await request(app).get("/tag/artists?tag=rock");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(mockGetTopArtistsByTag).toHaveBeenCalledWith("rock", "1");
    expect(mockEnrichWithImages).toHaveBeenCalledWith(result.artists);
  });

  it("forwards page parameter", async () => {
    const result = {
      artists: [],
      pagination: { page: 3, totalPages: 5 },
    };
    mockGetTopArtistsByTag.mockResolvedValue(result);

    await request(app).get("/tag/artists?tag=rock&page=3");
    expect(mockGetTopArtistsByTag).toHaveBeenCalledWith("rock", "3");
  });
});

describe("GET /tag/albums", () => {
  it("returns 400 when tag param is missing", async () => {
    const res = await request(app).get("/tag/albums");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("tag");
  });

  it("returns albums by tag with default page", async () => {
    const result = {
      albums: [{ name: "OK Computer", mbid: "a1", artistName: "Radiohead", artistMbid: "r1" }],
      pagination: { page: 1, totalPages: 3 },
    };
    mockGetTopAlbumsByTag.mockResolvedValue(result);

    const res = await request(app).get("/tag/albums?tag=rock");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(result);
    expect(mockGetTopAlbumsByTag).toHaveBeenCalledWith("rock", "1");
  });

  it("forwards page parameter", async () => {
    const result = {
      albums: [],
      pagination: { page: 5, totalPages: 10 },
    };
    mockGetTopAlbumsByTag.mockResolvedValue(result);

    await request(app).get("/tag/albums?tag=rock&page=5");
    expect(mockGetTopAlbumsByTag).toHaveBeenCalledWith("rock", "5");
  });
});
