import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetQueueSlots = vi.fn();
const mockGetHistorySlots = vi.fn();
const mockProcessAddFile = vi.fn();
const mockDeleteQueueItem = vi.fn();
const mockRemoveDownload = vi.fn();
const mockGetSlskdConfig = vi.fn();

vi.mock("../services/sabnzbd/queue", () => ({
  getQueueSlots: (...args: unknown[]) => mockGetQueueSlots(...args),
}));

vi.mock("../services/sabnzbd/history", () => ({
  getHistorySlots: (...args: unknown[]) => mockGetHistorySlots(...args),
}));

vi.mock("../services/sabnzbd/addFile", () => ({
  processAddFile: (...args: unknown[]) => mockProcessAddFile(...args),
}));

vi.mock("../services/sabnzbd/deleteQueue", () => ({
  deleteQueueItem: (...args: unknown[]) => mockDeleteQueueItem(...args),
}));

vi.mock("../api/slskd/downloadTracker", () => ({
  removeDownload: (...args: unknown[]) => mockRemoveDownload(...args),
}));

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
    expect(res.body.config.categories).toEqual([{ name: "music", dir: "" }]);
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
  it("returns queue slots from service", async () => {
    mockGetQueueSlots.mockResolvedValue([
      {
        nzo_id: "nzo1",
        filename: "Test Album",
        cat: "music",
        mb: "9.5",
        mbleft: "4.8",
        percentage: "50",
        status: "Downloading",
        timeleft: "00:00:50",
      },
    ]);

    const res = await request(app).get("/api?mode=queue");
    expect(res.status).toBe(200);
    expect(res.body.queue.slots).toHaveLength(1);
    expect(res.body.queue.slots[0].nzo_id).toBe("nzo1");
    expect(res.body.queue.slots[0].status).toBe("Downloading");
  });

  it("returns empty queue when no downloads", async () => {
    mockGetQueueSlots.mockResolvedValue([]);

    const res = await request(app).get("/api?mode=queue");
    expect(res.status).toBe(200);
    expect(res.body.queue.slots).toHaveLength(0);
  });

  it("reports a failure to Lidarr as a SABnzbd error, not an empty queue", async () => {
    mockGetQueueSlots.mockRejectedValue(
      new Error(
        "slskd unreachable at http://slskd:5030: connection refused, is slskd running?"
      )
    );

    const res = await request(app).get("/api?mode=queue");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: false,
      error:
        "slskd unreachable at http://slskd:5030: connection refused, is slskd running?",
    });
  });
});

describe("GET /api?mode=history", () => {
  it("returns history slots from service", async () => {
    mockGetHistorySlots.mockResolvedValue([
      {
        nzo_id: "nzo1",
        name: "Test Album",
        category: "music",
        bytes: 10000000,
        status: "Completed",
        completed: 1700000000,
        storage: "/downloads/complete/Test Album",
      },
    ]);

    const res = await request(app).get("/api?mode=history");
    expect(res.status).toBe(200);
    expect(res.body.history.slots).toHaveLength(1);
    expect(res.body.history.slots[0].nzo_id).toBe("nzo1");
    expect(res.body.history.slots[0].status).toBe("Completed");
    expect(res.body.history.slots[0].storage).toBe(
      "/downloads/complete/Test Album"
    );
  });
  it("reports a failure to Lidarr as a SABnzbd error, not an empty history", async () => {
    mockGetHistorySlots.mockRejectedValue(
      new Error("slskd get transfers failed: 401")
    );

    const res = await request(app).get("/api?mode=history");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: false,
      error: "slskd get transfers failed: 401",
    });
  });
});

describe("POST /api?mode=addfile", () => {
  it("processes NZB and queues download", async () => {
    mockProcessAddFile.mockResolvedValue({
      nzoId: "slskd_123_abc",
      title: "Test Album",
    });

    const res = await request(app)
      .post("/api?mode=addfile&cat=music")
      .attach("name", Buffer.from("<nzb>test</nzb>"), "test.nzb");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(true);
    expect(res.body.nzo_ids).toHaveLength(1);
    expect(mockProcessAddFile).toHaveBeenCalled();
  });

  it("returns 400 when no file uploaded", async () => {
    const res = await request(app).post("/api?mode=addfile");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("No NZB file");
  });
});

describe("GET /api?mode=queue&name=delete", () => {
  it("calls deleteQueueItem service", async () => {
    mockDeleteQueueItem.mockResolvedValue(undefined);

    const res = await request(app).get(
      "/api?mode=queue&name=delete&value=nzo1"
    );
    expect(res.status).toBe(200);
    expect(res.body.status).toBe(true);
    expect(mockDeleteQueueItem).toHaveBeenCalledWith("nzo1");
  });
});

describe("GET /api?mode=history&name=delete", () => {
  it("removes tracker entry", async () => {
    mockRemoveDownload.mockReturnValue(true);

    const res = await request(app).get(
      "/api?mode=history&name=delete&value=nzo1"
    );
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
