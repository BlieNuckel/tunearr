import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetTopArtists = vi.fn();
const mockFetchPlexThumbnail = vi.fn();
const mockGetPlexServers = vi.fn();
const mockGetPlexAccount = vi.fn();

vi.mock("../api/plex/topArtists", () => ({
  getTopArtists: (...args: unknown[]) => mockGetTopArtists(...args),
}));

vi.mock("../services/plex", () => ({
  fetchPlexThumbnail: (...args: unknown[]) => mockFetchPlexThumbnail(...args),
}));

vi.mock("../api/plex/servers", () => ({
  getPlexServers: (...args: unknown[]) => mockGetPlexServers(...args),
}));

vi.mock("../api/plex/account", () => ({
  getPlexAccount: (...args: unknown[]) => mockGetPlexAccount(...args),
}));

import type { AuthUser } from "../auth/types";
import express from "express";
import request from "supertest";
import plexRouter from "./plex";

const app = express();
app.use((req, _res, next) => {
  req.user = <AuthUser>{
    id: 1,
    username: "admin",
    userType: "plex",
    permissions: 1,
    enabled: true,
    theme: "system",
    thumb: null,
    hasPlexToken: true,
    plexToken: "test-plex-token",
  };
  next();
});
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
    expect(mockGetTopArtists).toHaveBeenCalledWith("test-plex-token", 10);
  });

  it("forwards custom limit", async () => {
    mockGetTopArtists.mockResolvedValue([]);

    await request(app).get("/top-artists?limit=25");
    expect(mockGetTopArtists).toHaveBeenCalledWith("test-plex-token", 25);
  });
});

describe("GET /thumb", () => {
  it("returns 400 when path param is missing", async () => {
    const res = await request(app).get("/thumb");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Missing path");
  });

  it("proxies image from Plex with correct headers", async () => {
    mockFetchPlexThumbnail.mockResolvedValue({
      ok: true,
      buffer: Buffer.from([0, 0, 0, 0]),
      contentType: "image/jpeg",
    });

    const res = await request(app).get(
      "/thumb?path=/library/metadata/123/thumb"
    );
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("image/jpeg");
    expect(res.headers["cache-control"]).toBe("public, max-age=86400");
    expect(mockFetchPlexThumbnail).toHaveBeenCalledWith(
      "test-plex-token",
      "/library/metadata/123/thumb"
    );
  });

  it("proxies non-ok upstream status", async () => {
    mockFetchPlexThumbnail.mockResolvedValue({ ok: false, status: 404 });

    const res = await request(app).get("/thumb?path=/bad/path");
    expect(res.status).toBe(404);
  });
});

describe("GET /servers", () => {
  it("returns 400 when token or clientId param is missing", async () => {
    const res = await request(app).get("/servers");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Missing token or clientId");

    const res2 = await request(app).get("/servers?token=abc");
    expect(res2.status).toBe(400);
  });

  it("returns servers from getPlexServers", async () => {
    const servers = [
      { name: "My Server", uri: "http://plex:32400", local: true },
    ];
    mockGetPlexServers.mockResolvedValue(servers);

    const res = await request(app).get(
      "/servers?token=test-token&clientId=client-123"
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ servers });
    expect(mockGetPlexServers).toHaveBeenCalledWith("test-token", "client-123");
  });

  it("returns 500 when getPlexServers throws", async () => {
    mockGetPlexServers.mockRejectedValue(new Error("Plex returned 401"));

    const res = await request(app).get(
      "/servers?token=bad-token&clientId=client-123"
    );
    expect(res.status).toBe(500);
    expect(res.body.error).toContain("Plex returned 401");
  });
});

describe("GET /account", () => {
  it("returns 400 when token or clientId param is missing", async () => {
    const res = await request(app).get("/account");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Missing token or clientId");

    const res2 = await request(app).get("/account?token=abc");
    expect(res2.status).toBe(400);
  });

  it("returns account info from getPlexAccount", async () => {
    const account = { username: "testuser", thumb: "https://plex.tv/thumb" };
    mockGetPlexAccount.mockResolvedValue(account);

    const res = await request(app).get(
      "/account?token=test-token&clientId=client-123"
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual(account);
    expect(mockGetPlexAccount).toHaveBeenCalledWith("test-token", "client-123");
  });

  it("returns 500 when getPlexAccount throws", async () => {
    mockGetPlexAccount.mockRejectedValue(new Error("Plex returned 401"));

    const res = await request(app).get(
      "/account?token=bad-token&clientId=client-123"
    );
    expect(res.status).toBe(500);
    expect(res.body.error).toContain("Plex returned 401");
  });
});
