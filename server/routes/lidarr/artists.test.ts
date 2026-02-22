import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLidarrGet = vi.fn();

vi.mock("../../api/lidarr/get", () => ({
  lidarrGet: (...args: unknown[]) => mockLidarrGet(...args),
}));

import express from "express";
import request from "supertest";
import artistsRouter from "./artists";

const app = express();
app.use("/", artistsRouter);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /artists", () => {
  it("returns mapped artist list on success", async () => {
    mockLidarrGet.mockResolvedValue({
      status: 200,
      ok: true,
      data: [
        {
          id: 1,
          artistName: "Radiohead",
          foreignArtistId: "mbid-1",
          monitored: true,
          folder: "/music/Radiohead",
        },
        {
          id: 2,
          artistName: "Björk",
          foreignArtistId: "mbid-2",
          monitored: false,
          folder: "/music/Bjork",
        },
      ],
    });

    const res = await request(app).get("/artists");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 1, name: "Radiohead", foreignArtistId: "mbid-1" },
      { id: 2, name: "Björk", foreignArtistId: "mbid-2" },
    ]);
  });

  it("proxies error status from Lidarr", async () => {
    mockLidarrGet.mockResolvedValue({
      status: 503,
      ok: false,
      data: { message: "Service unavailable" },
    });

    const res = await request(app).get("/artists");
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("Failed to fetch artists from Lidarr");
  });
});
