import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetTopArtists = vi.fn();
const mockFetchPlexThumbnail = vi.fn();
const mockGetConnectionStatus = vi.fn();
const mockConnectPlex = vi.fn();
const mockSelectPlexServer = vi.fn();
const mockDisconnectPlex = vi.fn();

vi.mock("../api/plex/topArtists", () => ({
  getTopArtists: (...args: unknown[]) => mockGetTopArtists(...args),
}));

vi.mock("../services/plex", () => ({
  fetchPlexThumbnail: (...args: unknown[]) => mockFetchPlexThumbnail(...args),
}));

vi.mock("../services/plexConnection", () => ({
  getPlexConnectionStatus: () => mockGetConnectionStatus(),
  connectPlex: (...args: unknown[]) => mockConnectPlex(...args),
  selectPlexServer: (...args: unknown[]) => mockSelectPlexServer(...args),
  disconnectPlex: () => mockDisconnectPlex(),
}));

import type { AuthUser } from "../auth/types";
import express from "express";
import request from "supertest";
import plexRouter from "./plex";

const app = express();
app.use(express.json());
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
    err: Error & { status?: number },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    res.status(err.status ?? 500).json({ error: err.message });
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
    expect(mockGetTopArtists).toHaveBeenCalledWith(
      "test-plex-token",
      10,
      "all"
    );
  });

  it("forwards custom limit", async () => {
    mockGetTopArtists.mockResolvedValue([]);

    await request(app).get("/top-artists?limit=25");
    expect(mockGetTopArtists).toHaveBeenCalledWith(
      "test-plex-token",
      25,
      "all"
    );
  });

  it("forwards a valid range", async () => {
    mockGetTopArtists.mockResolvedValue([]);

    await request(app).get("/top-artists?range=6months");
    expect(mockGetTopArtists).toHaveBeenCalledWith(
      "test-plex-token",
      10,
      "6months"
    );
  });

  it("falls back to all for an invalid range", async () => {
    mockGetTopArtists.mockResolvedValue([]);

    await request(app).get("/top-artists?range=bogus");
    expect(mockGetTopArtists).toHaveBeenCalledWith(
      "test-plex-token",
      10,
      "all"
    );
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

const connectionStatus = {
  connected: true,
  account: { username: "owner", thumb: "" },
  serverUrl: "http://plex:32400",
  owned: true,
  servers: [],
};

describe("Plex connection", () => {
  it("returns the connection status", async () => {
    mockGetConnectionStatus.mockResolvedValue(connectionStatus);
    const res = await request(app).get("/connection");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(connectionStatus);
  });

  it("connects the account behind an auth token", async () => {
    mockConnectPlex.mockResolvedValue(connectionStatus);
    const res = await request(app)
      .post("/connection")
      .send({ authToken: "plex-auth" });
    expect(res.status).toBe(200);
    expect(mockConnectPlex).toHaveBeenCalledWith("plex-auth");
  });

  it("rejects a connect without an auth token", async () => {
    const res = await request(app).post("/connection").send({});
    expect(res.status).toBe(400);
    expect(mockConnectPlex).not.toHaveBeenCalled();
  });

  it("selects another server", async () => {
    mockSelectPlexServer.mockResolvedValue(connectionStatus);
    const res = await request(app)
      .put("/connection/server")
      .send({ serverUrl: "http://plex:32400" });
    expect(res.status).toBe(200);
    expect(mockSelectPlexServer).toHaveBeenCalledWith("http://plex:32400");
  });

  it("rejects a server change without a URL", async () => {
    const res = await request(app).put("/connection/server").send({});
    expect(res.status).toBe(400);
  });

  it("disconnects", async () => {
    const res = await request(app).delete("/connection");
    expect(res.status).toBe(200);
    expect(mockDisconnectPlex).toHaveBeenCalled();
  });
});
