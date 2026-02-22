import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLidarrGet = vi.fn();

vi.mock("../../api/lidarr/get", () => ({
  lidarrGet: (...args: unknown[]) => mockLidarrGet(...args),
}));

import express from "express";
import request from "supertest";
import queueRouter from "./queue";

const app = express();
app.use("/", queueRouter);

beforeEach(() => {
  vi.clearAllMocks();
});

const mockData = {
  page: 1,
  pageSize: 20,
  totalRecords: 0,
  records: [],
};

describe("GET /queue", () => {
  it("passes default query params to Lidarr", async () => {
    mockLidarrGet.mockResolvedValue({ status: 200, data: mockData });

    await request(app).get("/queue");

    expect(mockLidarrGet).toHaveBeenCalledWith("/queue", {
      page: 1,
      pageSize: 20,
      includeArtist: true,
      includeAlbum: true,
    });
  });

  it("forwards page and pageSize from request query", async () => {
    mockLidarrGet.mockResolvedValue({ status: 200, data: mockData });

    await request(app).get("/queue?page=2&pageSize=10");

    expect(mockLidarrGet).toHaveBeenCalledWith(
      "/queue",
      expect.objectContaining({ page: "2", pageSize: "10" })
    );
  });

  it("proxies status and data from Lidarr", async () => {
    mockLidarrGet.mockResolvedValue({ status: 200, data: mockData });

    const res = await request(app).get("/queue");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockData);
  });
});
