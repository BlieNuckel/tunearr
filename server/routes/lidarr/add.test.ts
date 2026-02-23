import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAlbumByMbid = vi.fn();
const mockGetOrAddArtist = vi.fn();
const mockGetOrAddAlbum = vi.fn();
const mockRemoveAlbum = vi.fn();
const mockLidarrPost = vi.fn();
const mockLidarrPut = vi.fn();
const mockClearPromotedAlbumCache = vi.fn();

vi.mock("../../promotedAlbum/getPromotedAlbum", () => ({
  clearPromotedAlbumCache: (...args: unknown[]) =>
    mockClearPromotedAlbumCache(...args),
}));

vi.mock("./helpers", () => ({
  getAlbumByMbid: (...args: unknown[]) => mockGetAlbumByMbid(...args),
  getOrAddArtist: (...args: unknown[]) => mockGetOrAddArtist(...args),
  getOrAddAlbum: (...args: unknown[]) => mockGetOrAddAlbum(...args),
  removeAlbum: (...args: unknown[]) => mockRemoveAlbum(...args),
}));

vi.mock("../../api/lidarr/post", () => ({
  lidarrPost: (...args: unknown[]) => mockLidarrPost(...args),
}));

vi.mock("../../api/lidarr/put", () => ({
  lidarrPut: (...args: unknown[]) => mockLidarrPut(...args),
}));

import express from "express";
import request from "supertest";
import addRouter from "./add";

const app = express();
app.use(express.json());
app.use("/", addRouter);
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

describe("POST /add", () => {
  it("returns 400 when albumMbid is missing", async () => {
    const res = await request(app).post("/add").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("albumMbid is required");
  });

  it("returns 404 when album has no foreignArtistId", async () => {
    mockGetAlbumByMbid.mockResolvedValue({ artist: {} });

    const res = await request(app).post("/add").send({ albumMbid: "mbid-1" });
    expect(res.status).toBe(404);
    expect(res.body.error).toContain("Could not determine artist");
  });

  it("returns already_monitored when album exists and is monitored", async () => {
    mockGetAlbumByMbid.mockResolvedValue({
      artist: { foreignArtistId: "artist-mbid" },
    });
    mockGetOrAddArtist.mockResolvedValue({ id: 1 });
    mockGetOrAddAlbum.mockResolvedValue({
      wasAdded: false,
      album: { id: 10, monitored: true },
    });

    const res = await request(app).post("/add").send({ albumMbid: "mbid-1" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("already_monitored");
    expect(mockLidarrPut).not.toHaveBeenCalled();
  });

  it("monitors and searches when album exists but is unmonitored", async () => {
    mockGetAlbumByMbid.mockResolvedValue({
      artist: { foreignArtistId: "artist-mbid" },
    });
    mockGetOrAddArtist.mockResolvedValue({ id: 1 });
    mockGetOrAddAlbum.mockResolvedValue({
      wasAdded: false,
      album: { id: 10, monitored: false },
    });
    mockLidarrPut.mockResolvedValue({ ok: true });
    mockLidarrPost.mockResolvedValue({ ok: true });

    const res = await request(app).post("/add").send({ albumMbid: "mbid-1" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(mockLidarrPut).toHaveBeenCalledWith("/album/monitor", {
      albumIds: [10],
      monitored: true,
    });
    expect(mockLidarrPost).toHaveBeenCalledWith("/command", {
      name: "AlbumSearch",
      albumIds: [10],
    });
  });

  it("searches when album is newly added", async () => {
    mockGetAlbumByMbid.mockResolvedValue({
      artist: { foreignArtistId: "artist-mbid" },
    });
    mockGetOrAddArtist.mockResolvedValue({ id: 1 });
    mockGetOrAddAlbum.mockResolvedValue({
      wasAdded: true,
      album: { id: 10, monitored: true },
    });
    mockLidarrPost.mockResolvedValue({ ok: true });

    const res = await request(app).post("/add").send({ albumMbid: "mbid-1" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(mockLidarrPut).not.toHaveBeenCalled();
    expect(mockLidarrPost).toHaveBeenCalledWith("/command", {
      name: "AlbumSearch",
      albumIds: [10],
    });
  });

  it("clears promoted album cache on successful add", async () => {
    mockGetAlbumByMbid.mockResolvedValue({
      artist: { foreignArtistId: "artist-mbid" },
    });
    mockGetOrAddArtist.mockResolvedValue({ id: 1 });
    mockGetOrAddAlbum.mockResolvedValue({
      wasAdded: true,
      album: { id: 10, monitored: true },
    });
    mockLidarrPost.mockResolvedValue({ ok: true });

    await request(app).post("/add").send({ albumMbid: "mbid-1" });
    expect(mockClearPromotedAlbumCache).toHaveBeenCalled();
  });

  it("does not clear promoted album cache when already monitored", async () => {
    mockGetAlbumByMbid.mockResolvedValue({
      artist: { foreignArtistId: "artist-mbid" },
    });
    mockGetOrAddArtist.mockResolvedValue({ id: 1 });
    mockGetOrAddAlbum.mockResolvedValue({
      wasAdded: false,
      album: { id: 10, monitored: true },
    });

    await request(app).post("/add").send({ albumMbid: "mbid-1" });
    expect(mockClearPromotedAlbumCache).not.toHaveBeenCalled();
  });

  it("throws when monitor call fails", async () => {
    mockGetAlbumByMbid.mockResolvedValue({
      artist: { foreignArtistId: "artist-mbid" },
    });
    mockGetOrAddArtist.mockResolvedValue({ id: 1 });
    mockGetOrAddAlbum.mockResolvedValue({
      wasAdded: false,
      album: { id: 10, monitored: false },
    });
    mockLidarrPut.mockResolvedValue({ ok: false });

    const res = await request(app).post("/add").send({ albumMbid: "mbid-1" });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to monitor album");
  });
});

describe("POST /remove", () => {
  it("returns 400 when albumMbid is missing", async () => {
    const res = await request(app).post("/remove").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("albumMbid is required");
  });

  it("returns 404 when album has no foreignArtistId", async () => {
    mockGetAlbumByMbid.mockResolvedValue({ artist: {} });

    const res = await request(app)
      .post("/remove")
      .send({ albumMbid: "mbid-1" });
    expect(res.status).toBe(404);
    expect(res.body.error).toContain("Could not determine artist");
  });

  it("returns artist_not_in_library when artist is not in Lidarr", async () => {
    mockGetAlbumByMbid.mockResolvedValue({
      artist: { foreignArtistId: "artist-mbid" },
    });
    mockRemoveAlbum.mockResolvedValue({ artistInLibrary: false });

    const res = await request(app)
      .post("/remove")
      .send({ albumMbid: "mbid-1" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("artist_not_in_library");
  });

  it("returns album_not_in_library when album is not in Lidarr", async () => {
    mockGetAlbumByMbid.mockResolvedValue({
      artist: { foreignArtistId: "artist-mbid" },
    });
    mockRemoveAlbum.mockResolvedValue({
      artistInLibrary: true,
      albumInLibrary: false,
    });

    const res = await request(app)
      .post("/remove")
      .send({ albumMbid: "mbid-1" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("album_not_in_library");
  });

  it("returns already_unmonitored when album is already unmonitored", async () => {
    mockGetAlbumByMbid.mockResolvedValue({
      artist: { foreignArtistId: "artist-mbid" },
    });
    mockRemoveAlbum.mockResolvedValue({
      artistInLibrary: true,
      albumInLibrary: true,
      alreadyUnmonitored: true,
    });

    const res = await request(app)
      .post("/remove")
      .send({ albumMbid: "mbid-1" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("already_unmonitored");
  });

  it("returns success when album is unmonitored", async () => {
    mockGetAlbumByMbid.mockResolvedValue({
      artist: { foreignArtistId: "artist-mbid" },
    });
    mockRemoveAlbum.mockResolvedValue({
      artistInLibrary: true,
      albumInLibrary: true,
      alreadyUnmonitored: false,
    });

    const res = await request(app)
      .post("/remove")
      .send({ albumMbid: "mbid-1" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
  });

  it("returns 500 when removeAlbum throws", async () => {
    mockGetAlbumByMbid.mockResolvedValue({
      artist: { foreignArtistId: "artist-mbid" },
    });
    mockRemoveAlbum.mockRejectedValue(new Error("Failed to unmonitor album"));

    const res = await request(app)
      .post("/remove")
      .send({ albumMbid: "mbid-1" });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to unmonitor album");
  });
});
