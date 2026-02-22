import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLidarrGet = vi.fn();

vi.mock("../../api/lidarr/get", () => ({
  lidarrGet: (...args: unknown[]) => mockLidarrGet(...args),
}));

import express from "express";
import request from "supertest";
import wantedRouter from "./wanted";

const app = express();
app.use("/", wantedRouter);

beforeEach(() => {
  vi.clearAllMocks();
});

const mockData = {
  page: 1,
  pageSize: 20,
  totalRecords: 1,
  records: [{ id: 1, title: "OK Computer" }],
};

describe("GET /wanted/missing", () => {
  it("passes default query params to Lidarr", async () => {
    mockLidarrGet.mockResolvedValue({ status: 200, data: mockData });

    await request(app).get("/wanted/missing");

    expect(mockLidarrGet).toHaveBeenCalledWith("/wanted/missing", {
      page: 1,
      pageSize: 20,
      includeArtist: true,
      sortKey: "title",
      sortDirection: "ascending",
    });
  });

  it("forwards page and pageSize from request query", async () => {
    mockLidarrGet.mockResolvedValue({ status: 200, data: mockData });

    await request(app).get("/wanted/missing?page=2&pageSize=50");

    expect(mockLidarrGet).toHaveBeenCalledWith(
      "/wanted/missing",
      expect.objectContaining({ page: "2", pageSize: "50" })
    );
  });

  it("proxies status and data from Lidarr", async () => {
    mockLidarrGet.mockResolvedValue({ status: 200, data: mockData });

    const res = await request(app).get("/wanted/missing");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockData);
  });
});
