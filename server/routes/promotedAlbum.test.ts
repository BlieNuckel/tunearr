import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

const mockGetPromotedAlbum = vi.fn();

vi.mock("../promotedAlbum/getPromotedAlbum", () => ({
  getPromotedAlbum: (...args: unknown[]) => mockGetPromotedAlbum(...args),
}));

import express from "express";
import request from "supertest";
import promotedAlbumRouter from "./promotedAlbum";

function withUser(plexToken?: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.user = {
      id: 1,
      username: "test",
      userType: "local" as const,
      permissions: 0,
      enabled: true,
      theme: "system" as const,
      thumb: null,
      hasPlexToken: !!plexToken,
      plexToken: plexToken ?? null,
    };
    next();
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /", () => {
  it("returns promoted album data", async () => {
    const app = express();
    app.use(withUser("plex-token-123"));
    app.use("/", promotedAlbumRouter);

    const data = {
      album: {
        name: "OK Computer",
        mbid: "alb-1",
        artistName: "Radiohead",
        artistMbid: "art-1",
        coverUrl: "https://coverartarchive.org/release-group/alb-1/front-500",
        year: "1997",
      },
      tag: "alternative",
      inLibrary: false,
    };
    mockGetPromotedAlbum.mockResolvedValue(data);

    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(data);
    expect(mockGetPromotedAlbum).toHaveBeenCalledWith("plex-token-123", false);
  });

  it("returns null when no album found", async () => {
    const app = express();
    app.use(withUser("plex-token-123"));
    app.use("/", promotedAlbumRouter);

    mockGetPromotedAlbum.mockResolvedValue(null);

    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("forwards refresh param as forceRefresh", async () => {
    const app = express();
    app.use(withUser("plex-token-123"));
    app.use("/", promotedAlbumRouter);

    mockGetPromotedAlbum.mockResolvedValue(null);

    await request(app).get("/?refresh=true");
    expect(mockGetPromotedAlbum).toHaveBeenCalledWith("plex-token-123", true);
  });

  it("returns null without calling service when user has no plex token", async () => {
    const app = express();
    app.use(withUser());
    app.use("/", promotedAlbumRouter);

    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
    expect(mockGetPromotedAlbum).not.toHaveBeenCalled();
  });
});
