import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSuggestions = vi.fn();
const mockGetAlbumTopTags = vi.fn();

vi.mock("../exploration/getSuggestions", () => ({
  getSuggestions: (...args: unknown[]) => mockGetSuggestions(...args),
}));

vi.mock("../api/lastfm/albums", () => ({
  getAlbumTopTags: (...args: unknown[]) => mockGetAlbumTopTags(...args),
}));

import express from "express";
import request from "supertest";
import explorationRouter from "./exploration";

const app = express();
app.use(express.json());
app.use("/", explorationRouter);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /suggestions", () => {
  it("returns suggestions for valid request", async () => {
    const mockResult = {
      suggestions: [
        {
          releaseGroup: { id: "rg-1", title: "Album A" },
          tag: "rock",
        },
      ],
      newTags: [{ name: "rock", count: 100 }],
    };
    mockGetSuggestions.mockResolvedValue(mockResult);

    const res = await request(app)
      .post("/suggestions")
      .send({
        artistName: "Radiohead",
        albumName: "OK Computer",
        albumMbid: "alb-1",
        excludeMbids: [],
        accumulatedTags: [],
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockResult);
    expect(mockGetSuggestions).toHaveBeenCalledWith(
      "Radiohead",
      "OK Computer",
      [],
      []
    );
  });

  it("returns 400 when artistName is missing", async () => {
    const res = await request(app)
      .post("/suggestions")
      .send({ albumName: "OK Computer", albumMbid: "alb-1" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("returns 400 when albumName is missing", async () => {
    const res = await request(app)
      .post("/suggestions")
      .send({ artistName: "Radiohead", albumMbid: "alb-1" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("returns 400 when albumMbid is missing", async () => {
    const res = await request(app)
      .post("/suggestions")
      .send({ artistName: "Radiohead", albumName: "OK Computer" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("defaults excludeMbids and accumulatedTags to empty arrays", async () => {
    mockGetSuggestions.mockResolvedValue({ suggestions: [], newTags: [] });

    await request(app)
      .post("/suggestions")
      .send({
        artistName: "Artist",
        albumName: "Album",
        albumMbid: "mbid",
      });

    expect(mockGetSuggestions).toHaveBeenCalledWith(
      "Artist",
      "Album",
      [],
      []
    );
  });
});

describe("GET /album-tags", () => {
  it("returns tags for valid request", async () => {
    const tags = [
      { name: "rock", count: 100 },
      { name: "indie", count: 80 },
    ];
    mockGetAlbumTopTags.mockResolvedValue(tags);

    const res = await request(app)
      .get("/album-tags?artist=Radiohead&album=OK+Computer");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tags });
    expect(mockGetAlbumTopTags).toHaveBeenCalledWith("Radiohead", "OK Computer");
  });

  it("returns 400 when artist param is missing", async () => {
    const res = await request(app).get("/album-tags?album=OK+Computer");

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("returns 400 when album param is missing", async () => {
    const res = await request(app).get("/album-tags?artist=Radiohead");

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});
