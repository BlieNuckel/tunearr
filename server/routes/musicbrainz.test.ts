import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSearchReleaseGroups = vi.fn();
const mockSearchArtistReleaseGroups = vi.fn();
const mockGetReleaseTracks = vi.fn();

vi.mock("../musicbrainzApi/releaseGroups", () => ({
  searchReleaseGroups: (...args: unknown[]) => mockSearchReleaseGroups(...args),
  searchArtistReleaseGroups: (...args: unknown[]) =>
    mockSearchArtistReleaseGroups(...args),
}));

vi.mock("../musicbrainzApi/tracks", () => ({
  getReleaseTracks: (...args: unknown[]) => mockGetReleaseTracks(...args),
}));

vi.mock("../middleware/rateLimiter", () => ({
  default: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import express from "express";
import request from "supertest";
import musicbrainzRouter from "./musicbrainz";

const app = express();
app.use("/", musicbrainzRouter);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /search", () => {
  it("returns 400 when q param is missing", async () => {
    const res = await request(app).get("/search");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("q is required");
  });

  it("calls searchArtistReleaseGroups when searchType is artist", async () => {
    const data = [{ id: "rg-1", title: "OK Computer" }];
    mockSearchArtistReleaseGroups.mockResolvedValue(data);

    const res = await request(app).get("/search?q=Radiohead&searchType=artist");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(data);
    expect(mockSearchArtistReleaseGroups).toHaveBeenCalledWith("Radiohead");
    expect(mockSearchReleaseGroups).not.toHaveBeenCalled();
  });

  it("calls searchReleaseGroups for other search types", async () => {
    const data = [{ id: "rg-2", title: "Kid A" }];
    mockSearchReleaseGroups.mockResolvedValue(data);

    const res = await request(app).get("/search?q=Kid+A");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(data);
    expect(mockSearchReleaseGroups).toHaveBeenCalledWith("Kid A");
    expect(mockSearchArtistReleaseGroups).not.toHaveBeenCalled();
  });
});

describe("GET /tracks/:releaseGroupId", () => {
  it("returns tracks for a release group", async () => {
    const media = [
      { position: 1, tracks: [{ title: "Track 1", position: 1 }] },
    ];
    mockGetReleaseTracks.mockResolvedValue(media);

    const res = await request(app).get("/tracks/rg-123");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ media });
    expect(mockGetReleaseTracks).toHaveBeenCalledWith("rg-123");
  });
});
