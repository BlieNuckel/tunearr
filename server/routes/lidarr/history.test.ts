import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLidarrGet = vi.fn();

vi.mock("../../api/lidarr/get.js", () => ({
  lidarrGet: (...args: unknown[]) => mockLidarrGet(...args),
}));

import express from "express";
import request from "supertest";
import historyRouter from "./history";

const app = express();
app.use("/", historyRouter);

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    albumId: 100,
    date: "2025-01-01",
    downloadId: "dl-abc",
    data: {},
    artist: { id: 1, artistName: "Test Artist" },
    album: { id: 100, title: "Test Album" },
    ...overrides,
  };
}

function paginatedResponse(records: unknown[]) {
  return {
    page: 1,
    pageSize: 20,
    totalRecords: records.length,
    records,
  };
}

describe("GET /history", () => {
  it("makes two Lidarr calls for imported and grabbed events", async () => {
    mockLidarrGet.mockResolvedValue({
      status: 200,
      data: paginatedResponse([]),
    });

    await request(app).get("/history");

    expect(mockLidarrGet).toHaveBeenCalledTimes(2);
    expect(mockLidarrGet).toHaveBeenCalledWith(
      "/history",
      expect.objectContaining({ eventType: 3 })
    );
    expect(mockLidarrGet).toHaveBeenCalledWith(
      "/history",
      expect.objectContaining({ eventType: 1 })
    );
  });

  it("correlates indexer from grabbed events via downloadId", async () => {
    const imported = makeRecord({ downloadId: "dl-abc" });
    const grabbed = makeRecord({
      id: 2,
      downloadId: "dl-abc",
      data: { indexer: "Prowlarr" },
    });

    mockLidarrGet.mockImplementation((_path: string, query: Record<string, unknown>) => {
      if (query.eventType === 3) {
        return Promise.resolve({ status: 200, data: paginatedResponse([imported]) });
      }
      return Promise.resolve({ status: 200, data: paginatedResponse([grabbed]) });
    });

    const res = await request(app).get("/history");

    expect(res.status).toBe(200);
    expect(res.body.records[0].sourceIndexer).toBe("Prowlarr");
  });

  it("returns sourceIndexer null when no matching grabbed event exists", async () => {
    const imported = makeRecord({ downloadId: "dl-no-match" });

    mockLidarrGet.mockImplementation((_path: string, query: Record<string, unknown>) => {
      if (query.eventType === 3) {
        return Promise.resolve({ status: 200, data: paginatedResponse([imported]) });
      }
      return Promise.resolve({ status: 200, data: paginatedResponse([]) });
    });

    const res = await request(app).get("/history");

    expect(res.body.records[0].sourceIndexer).toBeNull();
  });

  it("returns sourceIndexer null when grabbed fetch fails", async () => {
    const imported = makeRecord();

    mockLidarrGet.mockImplementation((_path: string, query: Record<string, unknown>) => {
      if (query.eventType === 3) {
        return Promise.resolve({ status: 200, data: paginatedResponse([imported]) });
      }
      return Promise.reject(new Error("Lidarr down"));
    });

    const res = await request(app).get("/history");

    expect(res.status).toBe(200);
    expect(res.body.records[0].sourceIndexer).toBeNull();
  });

  it("forwards page and pageSize to both Lidarr calls", async () => {
    mockLidarrGet.mockResolvedValue({
      status: 200,
      data: paginatedResponse([]),
    });

    await request(app).get("/history?page=3&pageSize=50");

    for (const call of mockLidarrGet.mock.calls) {
      expect(call[1]).toEqual(expect.objectContaining({ page: "3", pageSize: "50" }));
    }
  });

  it("proxies status code from imported result", async () => {
    mockLidarrGet.mockImplementation((_path: string, query: Record<string, unknown>) => {
      if (query.eventType === 3) {
        return Promise.resolve({ status: 404, data: paginatedResponse([]) });
      }
      return Promise.resolve({ status: 200, data: paginatedResponse([]) });
    });

    const res = await request(app).get("/history");
    expect(res.status).toBe(404);
  });

  it("strips downloadId and data from response records", async () => {
    const imported = makeRecord({
      downloadId: "dl-abc",
      data: { downloadClient: "sabnzbd" },
    });

    mockLidarrGet.mockResolvedValue({
      status: 200,
      data: paginatedResponse([imported]),
    });

    const res = await request(app).get("/history");

    expect(res.body.records[0]).not.toHaveProperty("downloadId");
    expect(res.body.records[0]).not.toHaveProperty("data");
  });
});
