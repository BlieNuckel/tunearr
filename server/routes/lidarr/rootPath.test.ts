import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLidarrGet = vi.fn();

vi.mock("../../api/lidarr/get.js", () => ({
  lidarrGet: (...args: unknown[]) => mockLidarrGet(...args),
}));

import express from "express";
import request from "supertest";
import rootPathRouter from "./rootPath";

const app = express();
app.use("/", rootPathRouter);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /rootfolders", () => {
  it("returns 200 with data from Lidarr", async () => {
    const folders = [{ id: 1, path: "/music" }];
    mockLidarrGet.mockResolvedValue({ status: 200, data: folders });

    const res = await request(app).get("/rootfolders");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(folders);
  });

  it("always returns 200 even when Lidarr returns error data", async () => {
    mockLidarrGet.mockResolvedValue({
      status: 500,
      data: { error: "internal" },
    });

    const res = await request(app).get("/rootfolders");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ error: "internal" });
  });
});
