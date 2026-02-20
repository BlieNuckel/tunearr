import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetConfigValue = vi.fn();
const mockGetAlbumByMbid = vi.fn();
const mockGetOrAddArtist = vi.fn();
const mockGetOrAddAlbum = vi.fn();
const mockLidarrGet = vi.fn();
const mockLidarrPost = vi.fn();
const mockExistsSync = vi.fn();
const mockMkdirSync = vi.fn();
const mockRmSync = vi.fn();

vi.mock("../../config", () => ({
  getConfigValue: (...args: unknown[]) => mockGetConfigValue(...args),
}));

vi.mock("./helpers", () => ({
  getAlbumByMbid: (...args: unknown[]) => mockGetAlbumByMbid(...args),
  getOrAddArtist: (...args: unknown[]) => mockGetOrAddArtist(...args),
  getOrAddAlbum: (...args: unknown[]) => mockGetOrAddAlbum(...args),
}));

vi.mock("../../lidarrApi/get", () => ({
  lidarrGet: (...args: unknown[]) => mockLidarrGet(...args),
}));

vi.mock("../../lidarrApi/post", () => ({
  lidarrPost: (...args: unknown[]) => mockLidarrPost(...args),
}));

vi.mock("fs", () => ({
  default: {
    existsSync: (p: string) => mockExistsSync(p),
    mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
    rmSync: (...args: unknown[]) => mockRmSync(...args),
  },
  existsSync: (p: string) => mockExistsSync(p),
  mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
  rmSync: (...args: unknown[]) => mockRmSync(...args),
}));

vi.mock("crypto", () => ({
  default: { randomUUID: () => "test-uuid-1234" },
  randomUUID: () => "test-uuid-1234",
}));

vi.mock("multer", () => {
  const multerMock = () => ({
    array:
      () =>
      (
        req: {
          body: Record<string, unknown>;
          __uploadId: string;
          __uploadDir: string;
        },
        _res: unknown,
        next: () => void
      ) => {
        req.__uploadId = "test-uuid-1234";
        req.__uploadDir = "/imports/test-uuid-1234";
        next();
      },
  });
  multerMock.diskStorage = () => ({});
  return { default: multerMock };
});

import express from "express";
import request from "supertest";
import importRouter from "./import";

const app = express();
app.use(express.json());
app.use("/", importRouter);
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

describe("POST /import/upload", () => {
  it("returns 400 when import path is not configured", async () => {
    mockGetConfigValue.mockReturnValue("");

    const res = await request(app).post("/import/upload").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Import path not configured");
  });

  it("returns 400 when import path does not exist", async () => {
    mockGetConfigValue.mockReturnValue("/imports");
    mockExistsSync.mockReturnValue(false);

    const res = await request(app).post("/import/upload").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("does not exist");
  });

  it("returns 400 when albumMbid is missing", async () => {
    mockGetConfigValue.mockReturnValue("/imports");
    mockExistsSync.mockReturnValue(true);

    const res = await request(app).post("/import/upload").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("albumMbid is required");
  });

  it("returns 404 when album has no foreignArtistId", async () => {
    mockGetConfigValue.mockReturnValue("/imports");
    mockExistsSync.mockReturnValue(true);
    mockGetAlbumByMbid.mockResolvedValue({ artist: {} });

    const res = await request(app)
      .post("/import/upload")
      .send({ albumMbid: "mbid-1" });
    expect(res.status).toBe(404);
    expect(res.body.error).toContain("Could not determine artist");
  });

  it("returns 502 when Lidarr scan fails", async () => {
    mockGetConfigValue.mockReturnValue("/imports");
    mockExistsSync.mockReturnValue(true);
    mockGetAlbumByMbid.mockResolvedValue({
      artist: { foreignArtistId: "artist-mbid" },
    });
    mockGetOrAddArtist.mockResolvedValue({ id: 1 });
    mockGetOrAddAlbum.mockResolvedValue({
      album: { id: 10 },
    });
    mockLidarrGet.mockResolvedValue({ ok: false, status: 500, data: null });

    const res = await request(app)
      .post("/import/upload")
      .send({ albumMbid: "mbid-1" });
    expect(res.status).toBe(502);
    expect(res.body.error).toContain("scan failed");
  });

  it("returns 400 when scan returns no items", async () => {
    mockGetConfigValue.mockReturnValue("/imports");
    mockExistsSync.mockReturnValue(true);
    mockGetAlbumByMbid.mockResolvedValue({
      artist: { foreignArtistId: "artist-mbid" },
    });
    mockGetOrAddArtist.mockResolvedValue({ id: 1 });
    mockGetOrAddAlbum.mockResolvedValue({
      album: { id: 10 },
    });
    mockLidarrGet.mockResolvedValue({ ok: true, status: 200, data: [] });

    const res = await request(app)
      .post("/import/upload")
      .send({ albumMbid: "mbid-1" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("no importable files");
  });

  it("returns upload info on success", async () => {
    mockGetConfigValue.mockReturnValue("/imports");
    mockExistsSync.mockReturnValue(true);
    mockGetAlbumByMbid.mockResolvedValue({
      artist: { foreignArtistId: "artist-mbid" },
    });
    mockGetOrAddArtist.mockResolvedValue({ id: 1 });
    mockGetOrAddAlbum.mockResolvedValue({
      album: { id: 10 },
    });
    const scanItems = [
      {
        path: "/imports/test-uuid-1234/song.flac",
        name: "song.flac",
        albumReleaseId: 5,
        tracks: [{ id: 1, title: "Track 1", trackNumber: "1" }],
        rejections: [],
      },
    ];
    mockLidarrGet.mockResolvedValue({ ok: true, status: 200, data: scanItems });

    const res = await request(app)
      .post("/import/upload")
      .send({ albumMbid: "mbid-1" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      uploadId: "test-uuid-1234",
      artistId: 1,
      albumId: 10,
      items: scanItems,
    });
  });
});

describe("POST /import/confirm", () => {
  it("returns 400 when items is empty", async () => {
    const res = await request(app).post("/import/confirm").send({ items: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("items array is required");
  });

  it("returns 400 when items is missing", async () => {
    const res = await request(app).post("/import/confirm").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("items array is required");
  });

  it("returns 502 when Lidarr command fails", async () => {
    mockLidarrPost.mockResolvedValue({ ok: false, status: 500 });

    const res = await request(app)
      .post("/import/confirm")
      .send({
        items: [
          {
            path: "/imports/song.flac",
            artist: { id: 1 },
            album: { id: 10 },
            albumReleaseId: 5,
            tracks: [{ id: 1 }],
            quality: { quality: { name: "FLAC" } },
          },
        ],
      });
    expect(res.status).toBe(502);
    expect(res.body.error).toContain("manual import failed");
  });

  it("maps items and sends ManualImport command on success", async () => {
    mockLidarrPost.mockResolvedValue({ ok: true, status: 200, data: {} });

    const res = await request(app)
      .post("/import/confirm")
      .send({
        items: [
          {
            path: "/imports/song.flac",
            artist: { id: 1 },
            album: { id: 10 },
            albumReleaseId: 5,
            tracks: [{ id: 1 }, { id: 2 }],
            quality: { quality: { name: "FLAC" } },
            indexerFlags: 0,
            downloadId: "dl-1",
            disableReleaseSwitching: false,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "success" });
    expect(mockLidarrPost).toHaveBeenCalledWith("/command", {
      name: "ManualImport",
      files: [
        {
          path: "/imports/song.flac",
          artistId: 1,
          albumId: 10,
          albumReleaseId: 5,
          trackIds: [1, 2],
          quality: { quality: { name: "FLAC" } },
          indexerFlags: 0,
          downloadId: "dl-1",
          disableReleaseSwitching: false,
        },
      ],
      importMode: "move",
    });
  });

  it("defaults optional fields when not provided", async () => {
    mockLidarrPost.mockResolvedValue({ ok: true, status: 200, data: {} });

    await request(app)
      .post("/import/confirm")
      .send({
        items: [
          {
            path: "/imports/song.flac",
            artist: { id: 1 },
            album: { id: 10 },
            albumReleaseId: 5,
            tracks: [{ id: 1 }],
            quality: { quality: { name: "FLAC" } },
          },
        ],
      });

    const payload = mockLidarrPost.mock.calls[0][1] as {
      files: {
        indexerFlags: number;
        downloadId: string;
        disableReleaseSwitching: boolean;
      }[];
    };
    expect(payload.files[0].indexerFlags).toBe(0);
    expect(payload.files[0].downloadId).toBe("");
    expect(payload.files[0].disableReleaseSwitching).toBe(false);
  });
});

describe("DELETE /import/:uploadId", () => {
  it("returns 400 when importPath is not configured", async () => {
    mockGetConfigValue.mockReturnValue("");

    const res = await request(app).delete("/import/test-uuid");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("importPath not configured");
  });

  it("returns 400 for path traversal attempts", async () => {
    mockGetConfigValue.mockReturnValue("/imports");

    const res = await request(app).delete("/import/..%2F..%2Fetc");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid uploadId");
  });

  it("removes directory when it exists", async () => {
    mockGetConfigValue.mockReturnValue("/imports");
    mockExistsSync.mockReturnValue(true);

    const res = await request(app).delete("/import/test-uuid");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "cleaned" });
    expect(mockRmSync).toHaveBeenCalledWith(
      expect.stringContaining("test-uuid"),
      { recursive: true }
    );
  });

  it("returns cleaned when directory does not exist", async () => {
    mockGetConfigValue.mockReturnValue("/imports");
    mockExistsSync.mockReturnValue(false);

    const res = await request(app).delete("/import/test-uuid");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "cleaned" });
    expect(mockRmSync).not.toHaveBeenCalled();
  });
});
