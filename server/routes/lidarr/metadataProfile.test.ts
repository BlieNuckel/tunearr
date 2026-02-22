import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLidarrGet = vi.fn();

vi.mock("../../api/lidarr/get.js", () => ({
  lidarrGet: (...args: unknown[]) => mockLidarrGet(...args),
}));

import express from "express";
import request from "supertest";
import metadataProfileRouter from "./metadataProfile";

const app = express();
app.use("/", metadataProfileRouter);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /metadataprofiles", () => {
  it("returns 200 with data from Lidarr", async () => {
    const profiles = [
      { id: 1, name: "Standard" },
      { id: 2, name: "Extended" },
    ];
    mockLidarrGet.mockResolvedValue({ status: 200, data: profiles });

    const res = await request(app).get("/metadataprofiles");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(profiles);
  });

  it("always returns 200 even when Lidarr returns error data", async () => {
    mockLidarrGet.mockResolvedValue({
      status: 500,
      data: { error: "internal" },
    });

    const res = await request(app).get("/metadataprofiles");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ error: "internal" });
  });
});
