import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetTopArtists = vi.fn();
const mockGetPlexConfig = vi.fn();
const mockFetch = vi.fn();

vi.mock("../api/plex/topArtists", () => ({
  getTopArtists: (...args: unknown[]) => mockGetTopArtists(...args),
}));

vi.mock("../api/plex/config", () => ({
  getPlexConfig: (...args: unknown[]) => mockGetPlexConfig(...args),
}));

vi.stubGlobal("fetch", mockFetch);

import express from "express";
import request from "supertest";
import plexRouter from "./plex";

const app = express();
app.use("/", plexRouter);
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    res.status(500).json({ error: err.message });
  }
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /top-artists", () => {
  it("returns artists with default limit of 10", async () => {
    const artists = [{ name: "Radiohead" }];
    mockGetTopArtists.mockResolvedValue(artists);

    const res = await request(app).get("/top-artists");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ artists });
    expect(mockGetTopArtists).toHaveBeenCalledWith(10);
  });

  it("forwards custom limit", async () => {
    mockGetTopArtists.mockResolvedValue([]);

    await request(app).get("/top-artists?limit=25");
    expect(mockGetTopArtists).toHaveBeenCalledWith(25);
  });
});

describe("GET /thumb", () => {
  it("returns 400 when path param is missing", async () => {
    const res = await request(app).get("/thumb");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Missing path");
  });

  it("proxies image from Plex with correct headers", async () => {
    mockGetPlexConfig.mockReturnValue({
      baseUrl: "http://plex:32400",
      headers: { "X-Plex-Token": "token123" },
      token: "token123",
    });

    const imageBuffer = new ArrayBuffer(4);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([["content-type", "image/jpeg"]]),
      arrayBuffer: async () => imageBuffer,
    });

    const res = await request(app).get(
      "/thumb?path=/library/metadata/123/thumb"
    );
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("image/jpeg");
    expect(res.headers["cache-control"]).toBe("public, max-age=86400");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://plex:32400/library/metadata/123/thumb",
      { headers: { "X-Plex-Token": "token123" } }
    );
  });

  it("proxies non-ok upstream status", async () => {
    mockGetPlexConfig.mockReturnValue({
      baseUrl: "http://plex:32400",
      headers: { "X-Plex-Token": "token123" },
      token: "token123",
    });

    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Map(),
    });

    const res = await request(app).get("/thumb?path=/bad/path");
    expect(res.status).toBe(404);
  });
});
