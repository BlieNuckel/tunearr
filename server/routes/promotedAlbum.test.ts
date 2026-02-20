import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetPromotedAlbum = vi.fn();

vi.mock("../promotedAlbum/getPromotedAlbum", () => ({
  getPromotedAlbum: (...args: unknown[]) => mockGetPromotedAlbum(...args),
}));

import express from "express";
import request from "supertest";
import promotedAlbumRouter from "./promotedAlbum";

const app = express();
app.use("/", promotedAlbumRouter);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /", () => {
  it("returns promoted album data", async () => {
    const data = {
      album: {
        name: "OK Computer",
        mbid: "alb-1",
        artistName: "Radiohead",
        artistMbid: "art-1",
        coverUrl: "https://coverartarchive.org/release-group/alb-1/front-500",
      },
      tag: "alternative",
      inLibrary: false,
    };
    mockGetPromotedAlbum.mockResolvedValue(data);

    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(data);
    expect(mockGetPromotedAlbum).toHaveBeenCalledWith(false);
  });

  it("returns null when no album found", async () => {
    mockGetPromotedAlbum.mockResolvedValue(null);

    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("forwards refresh param as forceRefresh", async () => {
    mockGetPromotedAlbum.mockResolvedValue(null);

    await request(app).get("/?refresh=true");
    expect(mockGetPromotedAlbum).toHaveBeenCalledWith(true);
  });
});
