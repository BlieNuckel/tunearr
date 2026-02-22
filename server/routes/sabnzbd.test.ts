import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDecodeNzb = vi.fn();
const mockAddDownload = vi.fn();
const mockGetDownload = vi.fn();
const mockGetAllDownloads = vi.fn();
const mockRemoveDownload = vi.fn();
const mockEnqueueDownload = vi.fn();
const mockGetDownloadTransfers = vi.fn();
const mockCancelDownload = vi.fn();
const mockGetSlskdConfig = vi.fn();

vi.mock("../api/slskd/nzb", () => ({
  decodeNzb: (...args: unknown[]) => mockDecodeNzb(...args),
}));

vi.mock("../api/slskd/downloadTracker", () => ({
  addDownload: (...args: unknown[]) => mockAddDownload(...args),
  getDownload: (...args: unknown[]) => mockGetDownload(...args),
  getAllDownloads: (...args: unknown[]) => mockGetAllDownloads(...args),
  removeDownload: (...args: unknown[]) => mockRemoveDownload(...args),
}));

vi.mock("../api/slskd/transfer", () => ({
  enqueueDownload: (...args: unknown[]) => mockEnqueueDownload(...args),
  getDownloadTransfers: (...args: unknown[]) => mockGetDownloadTransfers(...args),
  cancelDownload: (...args: unknown[]) => mockCancelDownload(...args),
}));

vi.mock("../api/slskd/statusMap", async () => {
  const actual = await vi.importActual("../api/slskd/statusMap");
  return actual;
});

vi.mock("../api/slskd/config", () => ({
  getSlskdConfig: (...args: unknown[]) => mockGetSlskdConfig(...args),
}));

import express from "express";
import request from "supertest";
import sabnzbdRouter from "./sabnzbd";

const app = express();
app.use("/", sabnzbdRouter);
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
  mockGetSlskdConfig.mockReturnValue({
    baseUrl: "http://slskd:5030",
    headers: {},
    downloadPath: "/downloads/complete",
  });
});

describe("GET /api?mode=version", () => {
  it("returns version", async () => {
    const res = await request(app).get("/api?mode=version");
    expect(res.status).toBe(200);
    expect(res.body.version).toBe("4.2.3");
  });
});

describe("GET /api?mode=get_config", () => {
  it("returns config with complete_dir", async () => {
    const res = await request(app).get("/api?mode=get_config");
    expect(res.status).toBe(200);
    expect(res.body.config.misc.complete_dir).toBe("/downloads/complete");
    expect(res.body.config.categories).toEqual([{ name: "music", dir: "music" }]);
  });
});

describe("GET /api?mode=fullstatus", () => {
  it("returns status with completedir", async () => {
    const res = await request(app).get("/api?mode=fullstatus");
    expect(res.status).toBe(200);
    expect(res.body.status.completedir).toBe("/downloads/complete");
  });
});

describe("GET /api?mode=queue", () => {
  it("returns in-progress downloads as queue slots", async () => {
    mockGetAllDownloads.mockReturnValue([
      {
        nzoId: "nzo1",
        title: "Test Album",
        category: "music",
        username: "user1",
        files: [{ filename: "Music\\track.flac", size: 10000000 }],
        totalSize: 10000000,
        addedAt: Date.now(),
      },
    ]);
    mockGetDownloadTransfers.mockResolvedValue([
      {
        username: "user1",
        directories: [
          {
            directory: "Music",
            files: [
              {
                username: "user1",
                filename: "Music\\track.flac",
                size: 10000000,
                state: "InProgress",
                bytesTransferred: 5000000,
                averageSpeed: 100000,
                percentComplete: 50,
                id: "t1",
              },
            ],
          },
        ],
      },
    ]);

    const res = await request(app).get("/api?mode=queue");
    expect(res.status).toBe(200);
    expect(res.body.queue.slots).toHaveLength(1);
    expect(res.body.queue.slots[0].nzo_id).toBe("nzo1");
    expect(res.body.queue.slots[0].status).toBe("Downloading");
  });

  it("returns empty queue when no downloads", async () => {
    mockGetAllDownloads.mockReturnValue([]);
    mockGetDownloadTransfers.mockResolvedValue([]);

    const res = await request(app).get("/api?mode=queue");
    expect(res.status).toBe(200);
    expect(res.body.queue.slots).toHaveLength(0);
  });
});

describe("GET /api?mode=history", () => {
  it("returns completed downloads as history slots", async () => {
    mockGetAllDownloads.mockReturnValue([
      {
        nzoId: "nzo1",
        title: "Test Album",
        category: "music",
        username: "user1",
        files: [{ filename: "Music\\track.flac", size: 10000000 }],
        totalSize: 10000000,
        addedAt: Date.now(),
      },
    ]);
    mockGetDownloadTransfers.mockResolvedValue([
      {
        username: "user1",
        directories: [
          {
            directory: "Music",
            files: [
              {
                username: "user1",
                filename: "Music\\track.flac",
                size: 10000000,
                state: "Completed, Succeeded",
                bytesTransferred: 10000000,
                averageSpeed: 100000,
                percentComplete: 100,
                id: "t1",
              },
            ],
          },
        ],
      },
    ]);

    const res = await request(app).get("/api?mode=history");
    expect(res.status).toBe(200);
    expect(res.body.history.slots).toHaveLength(1);
    expect(res.body.history.slots[0].nzo_id).toBe("nzo1");
    expect(res.body.history.slots[0].status).toBe("Completed");
    expect(res.body.history.slots[0].storage).toBe("/downloads/complete/user1");
  });
});

describe("POST /api?mode=addfile", () => {
  it("decodes NZB and queues download", async () => {
    mockDecodeNzb.mockReturnValue({
      username: "user1",
      files: [{ filename: "Music\\track.flac", size: 5000000 }],
    });
    mockEnqueueDownload.mockResolvedValue(undefined);

    const res = await request(app)
      .post("/api?mode=addfile&cat=music")
      .attach("name", Buffer.from("<nzb>test</nzb>"), "test.nzb");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(true);
    expect(res.body.nzo_ids).toHaveLength(1);
    expect(mockEnqueueDownload).toHaveBeenCalledWith("user1", [
      { filename: "Music\\track.flac", size: 5000000 },
    ]);
    expect(mockAddDownload).toHaveBeenCalled();
  });

  it("returns 400 when no file uploaded", async () => {
    const res = await request(app).post("/api?mode=addfile");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("No NZB file");
  });
});

describe("GET /api?mode=queue&name=delete", () => {
  it("cancels transfers and removes tracker", async () => {
    mockGetDownload.mockReturnValue({
      nzoId: "nzo1",
      username: "user1",
      files: [{ filename: "Music\\track.flac" }],
    });
    mockGetDownloadTransfers.mockResolvedValue([
      {
        username: "user1",
        directories: [
          {
            directory: "Music",
            files: [
              { username: "user1", filename: "Music\\track.flac", id: "t1", state: "InProgress" },
            ],
          },
        ],
      },
    ]);
    mockCancelDownload.mockResolvedValue(undefined);
    mockRemoveDownload.mockReturnValue(true);

    const res = await request(app).get("/api?mode=queue&name=delete&value=nzo1");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe(true);
    expect(mockCancelDownload).toHaveBeenCalledWith("user1", "t1");
    expect(mockRemoveDownload).toHaveBeenCalledWith("nzo1");
  });
});

describe("GET /api?mode=history&name=delete", () => {
  it("removes tracker entry", async () => {
    mockRemoveDownload.mockReturnValue(true);

    const res = await request(app).get("/api?mode=history&name=delete&value=nzo1");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe(true);
    expect(mockRemoveDownload).toHaveBeenCalledWith("nzo1");
  });
});

describe("unknown mode", () => {
  it("returns status true", async () => {
    const res = await request(app).get("/api?mode=unknown");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe(true);
  });
});
