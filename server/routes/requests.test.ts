import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateRequest = vi.fn();
const mockApproveRequest = vi.fn();
const mockDeclineRequest = vi.fn();
const mockGetRequests = vi.fn();
const mockEnrichRequestsWithLidarr = vi.fn();

vi.mock("../services/requests/requestService", () => ({
  createRequest: (...args: unknown[]) => mockCreateRequest(...args),
  approveRequest: (...args: unknown[]) => mockApproveRequest(...args),
  declineRequest: (...args: unknown[]) => mockDeclineRequest(...args),
  getRequests: (...args: unknown[]) => mockGetRequests(...args),
}));

vi.mock("../services/requests/lidarrEnrichment", () => ({
  enrichRequestsWithLidarr: (...args: unknown[]) =>
    mockEnrichRequestsWithLidarr(...args),
}));

vi.mock("../middleware/requireAuth", () => ({
  requireAuth: (
    req: { user: unknown; headers: Record<string, string> },
    _res: unknown,
    next: () => void
  ) => {
    req.user = {
      id: 1,
      permissions: 9,
      username: "testuser",
      userType: "local",
      enabled: true,
      theme: "system",
      thumb: null,
    };
    next();
  },
}));

vi.mock("../middleware/requirePermission", () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) =>
    next(),
}));

import express from "express";
import request from "supertest";
import requestsRouter from "./requests";

const app = express();
app.use(express.json());
app.use("/", requestsRouter);
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

describe("POST /", () => {
  it("returns 400 when albumMbid is missing", async () => {
    const res = await request(app).post("/").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("albumMbid is required");
  });

  it("creates a request and returns the result", async () => {
    mockCreateRequest.mockResolvedValue({
      status: "pending",
      requestId: 10,
    });

    const res = await request(app).post("/").send({ albumMbid: "mbid-1" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "pending", requestId: 10 });
    expect(mockCreateRequest).toHaveBeenCalledWith(1, 9, "mbid-1");
  });

  it("returns approved when auto-approved", async () => {
    mockCreateRequest.mockResolvedValue({
      status: "approved",
      requestId: 10,
    });

    const res = await request(app).post("/").send({ albumMbid: "mbid-1" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("approved");
  });
});

describe("GET /", () => {
  it("returns sanitized request list with lidarr enrichment", async () => {
    mockGetRequests.mockResolvedValue([
      {
        id: 1,
        album_mbid: "mbid-1",
        artist_name: "Artist",
        album_title: "Album",
        status: "pending",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
        approved_at: null,
        user: {
          id: 1,
          username: "testuser",
          plex_username: null,
          plex_thumb: null,
        },
      },
    ]);
    mockEnrichRequestsWithLidarr.mockResolvedValue([
      {
        status: "downloading",
        downloadProgress: 50,
        quality: "FLAC",
        sourceIndexer: null,
        lastEvent: null,
        lidarrAlbumId: null,
      },
    ]);

    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toEqual({
      id: 1,
      albumMbid: "mbid-1",
      artistName: "Artist",
      albumTitle: "Album",
      status: "pending",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
      approvedAt: null,
      user: { id: 1, username: "testuser", thumb: null },
      lidarr: {
        status: "downloading",
        downloadProgress: 50,
        quality: "FLAC",
        sourceIndexer: null,
        lastEvent: null,
        lidarrAlbumId: null,
      },
    });
    expect(mockEnrichRequestsWithLidarr).toHaveBeenCalledWith(["mbid-1"]);
  });

  it("returns null lidarr field when enrichment returns null", async () => {
    mockGetRequests.mockResolvedValue([
      {
        id: 1,
        album_mbid: "mbid-1",
        artist_name: "Artist",
        album_title: "Album",
        status: "pending",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
        approved_at: null,
        user: null,
      },
    ]);
    mockEnrichRequestsWithLidarr.mockResolvedValue([null]);

    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body[0].lidarr).toBeNull();
  });

  it("passes single status as array", async () => {
    mockGetRequests.mockResolvedValue([]);
    mockEnrichRequestsWithLidarr.mockResolvedValue([]);
    await request(app).get("/?status=pending");
    expect(mockGetRequests).toHaveBeenCalledWith({
      status: ["pending"],
      userId: undefined,
    });
  });

  it("passes repeated status params as array", async () => {
    mockGetRequests.mockResolvedValue([]);
    mockEnrichRequestsWithLidarr.mockResolvedValue([]);
    await request(app).get("/?status=pending&status=approved");
    expect(mockGetRequests).toHaveBeenCalledWith({
      status: ["pending", "approved"],
      userId: undefined,
    });
  });
});

describe("POST /:id/approve", () => {
  it("returns 404 when request not found", async () => {
    mockApproveRequest.mockResolvedValue({ status: "not_found" });
    const res = await request(app).post("/1/approve");
    expect(res.status).toBe(404);
  });

  it("returns approved on success", async () => {
    mockApproveRequest.mockResolvedValue({ status: "approved" });
    const res = await request(app).post("/1/approve");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("approved");
    expect(mockApproveRequest).toHaveBeenCalledWith(1, 1);
  });
});

describe("POST /:id/decline", () => {
  it("returns 404 when request not found", async () => {
    mockDeclineRequest.mockResolvedValue({ status: "not_found" });
    const res = await request(app).post("/1/decline");
    expect(res.status).toBe(404);
  });

  it("returns declined on success", async () => {
    mockDeclineRequest.mockResolvedValue({ status: "declined" });
    const res = await request(app).post("/1/decline");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("declined");
  });
});
