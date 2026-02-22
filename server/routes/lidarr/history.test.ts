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

const mockData = {
  page: 1,
  pageSize: 20,
  totalRecords: 1,
  records: [{ id: 1, date: "2025-01-01" }],
};

describe("GET /history", () => {
  it("passes default query params to Lidarr", async () => {
    mockLidarrGet.mockResolvedValue({ status: 200, data: mockData });

    await request(app).get("/history");

    expect(mockLidarrGet).toHaveBeenCalledWith("/history", {
      page: 1,
      pageSize: 20,
      includeArtist: true,
      includeAlbum: true,
      sortKey: "date",
      sortDirection: "descending",
    });
  });

  it("forwards page and pageSize from request query", async () => {
    mockLidarrGet.mockResolvedValue({ status: 200, data: mockData });

    await request(app).get("/history?page=3&pageSize=50");

    expect(mockLidarrGet).toHaveBeenCalledWith(
      "/history",
      expect.objectContaining({ page: "3", pageSize: "50" })
    );
  });

  it("includes eventType when present in query", async () => {
    mockLidarrGet.mockResolvedValue({ status: 200, data: mockData });

    await request(app).get("/history?eventType=grabbed");

    expect(mockLidarrGet).toHaveBeenCalledWith(
      "/history",
      expect.objectContaining({ eventType: "grabbed" })
    );
  });

  it("does not include eventType when absent", async () => {
    mockLidarrGet.mockResolvedValue({ status: 200, data: mockData });

    await request(app).get("/history");

    const callArgs = mockLidarrGet.mock.calls[0][1] as Record<string, unknown>;
    expect(callArgs).not.toHaveProperty("eventType");
  });

  it("proxies status and data from Lidarr", async () => {
    mockLidarrGet.mockResolvedValue({ status: 200, data: mockData });

    const res = await request(app).get("/history");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockData);
  });
});
