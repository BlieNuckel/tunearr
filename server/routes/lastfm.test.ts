import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSimilarArtists = vi.fn();
const mockGetArtistTopTags = vi.fn();
const mockGetTopArtistsByTag = vi.fn();
const mockGetTopAlbumsByTag = vi.fn();
const mockGetArtistsImages = vi.fn();
const mockGetAlbumsArtwork = vi.fn();

vi.mock("../api/lastfm/artists", () => ({
  getSimilarArtists: (...args: unknown[]) => mockGetSimilarArtists(...args),
  getArtistTopTags: (...args: unknown[]) => mockGetArtistTopTags(...args),
  getTopArtistsByTag: (...args: unknown[]) => mockGetTopArtistsByTag(...args),
}));

vi.mock("../api/lastfm/albums", () => ({
  getTopAlbumsByTag: (...args: unknown[]) => mockGetTopAlbumsByTag(...args),
}));

vi.mock("../api/apple/artists", () => ({
  getAlbumsArtwork: (...args: unknown[]) => mockGetAlbumsArtwork(...args),
}));

vi.mock("../api/deezer/artists", () => ({
  getArtistsImages: (...args: unknown[]) => mockGetArtistsImages(...args),
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
    mockGetArtistsImages.mockResolvedValue(
      new Map([["thom yorke", "https://deezer.com/thom.jpg"]])
    );

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
    expect(mockGetArtistsImages).toHaveBeenCalledWith(["Thom Yorke"]);
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
  it("returns 400 when tags param is missing", async () => {
    const res = await request(app).get("/tag/artists");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("tags");
  });

  it("returns artists by single tag with default page", async () => {
    const result = {
      artists: [{ name: "Radiohead", imageUrl: "" }],
      sections: [],
      pagination: { page: 1, totalPages: 5 },
    };
    mockGetTopArtistsByTag.mockResolvedValue(result);
    mockGetArtistsImages.mockResolvedValue(
      new Map([["radiohead", "https://deezer.com/radiohead.jpg"]])
    );

    const res = await request(app).get("/tag/artists?tags=rock");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      artists: [
        { name: "Radiohead", imageUrl: "https://deezer.com/radiohead.jpg" },
      ],
      sections: [],
      pagination: { page: 1, totalPages: 5 },
    });
    expect(mockGetTopArtistsByTag).toHaveBeenCalledWith(["rock"], "1");
    expect(mockGetArtistsImages).toHaveBeenCalledWith(["Radiohead"]);
  });

  it("returns artists by multiple tags with sections", async () => {
    const result = {
      artists: [],
      sections: [
        {
          tagCount: 2,
          tagNames: ["grunge", "rock"],
          artists: [{ name: "Nirvana", mbid: "n1", imageUrl: "", rank: 1 }],
        },
      ],
      pagination: { page: 1, totalPages: 1 },
    };
    mockGetTopArtistsByTag.mockResolvedValue(result);
    mockGetArtistsImages.mockResolvedValue(
      new Map([["nirvana", "https://deezer.com/nirvana.jpg"]])
    );

    const res = await request(app).get("/tag/artists?tags=grunge,rock");
    expect(res.status).toBe(200);
    expect(res.body.sections).toHaveLength(1);
    expect(res.body.sections[0].artists[0].imageUrl).toBe(
      "https://deezer.com/nirvana.jpg"
    );
    expect(mockGetTopArtistsByTag).toHaveBeenCalledWith(
      ["grunge", "rock"],
      "1"
    );
    expect(mockGetArtistsImages).toHaveBeenCalledWith(["Nirvana"]);
  });

  it("forwards page parameter", async () => {
    const result = {
      artists: [],
      sections: [],
      pagination: { page: 3, totalPages: 5 },
    };
    mockGetTopArtistsByTag.mockResolvedValue(result);
    mockGetArtistsImages.mockResolvedValue(new Map());

    await request(app).get("/tag/artists?tags=rock&page=3");
    expect(mockGetTopArtistsByTag).toHaveBeenCalledWith(["rock"], "3");
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
      albums: [
        {
          name: "OK Computer",
          mbid: "a1",
          artistName: "Radiohead",
          artistMbid: "r1",
          imageUrl: "",
        },
      ],
      pagination: { page: 1, totalPages: 3 },
    };
    mockGetTopAlbumsByTag.mockResolvedValue(result);
    mockGetAlbumsArtwork.mockResolvedValue(
      new Map([["ok computer|radiohead", "https://apple.com/okcomputer.jpg"]])
    );

    const res = await request(app).get("/tag/albums?tag=rock");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      albums: [
        {
          name: "OK Computer",
          mbid: "a1",
          artistName: "Radiohead",
          artistMbid: "r1",
          imageUrl: "https://apple.com/okcomputer.jpg",
        },
      ],
      pagination: { page: 1, totalPages: 3 },
    });
    expect(mockGetTopAlbumsByTag).toHaveBeenCalledWith("rock", "1");
    expect(mockGetAlbumsArtwork).toHaveBeenCalledWith([
      { name: "OK Computer", artistName: "Radiohead" },
    ]);
  });

  it("forwards page parameter", async () => {
    const result = {
      albums: [],
      pagination: { page: 5, totalPages: 10 },
    };
    mockGetTopAlbumsByTag.mockResolvedValue(result);
    mockGetAlbumsArtwork.mockResolvedValue(new Map());

    await request(app).get("/tag/albums?tag=rock&page=5");
    expect(mockGetTopAlbumsByTag).toHaveBeenCalledWith("rock", "5");
  });
});
