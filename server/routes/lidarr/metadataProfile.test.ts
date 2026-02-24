import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetMetadataProfiles = vi.fn();

vi.mock("../../services/lidarr/profiles", () => ({
  getMetadataProfiles: (...args: unknown[]) => mockGetMetadataProfiles(...args),
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
  it("returns 200 with data from service", async () => {
    const profiles = [
      { id: 1, name: "Standard" },
      { id: 2, name: "Extended" },
    ];
    mockGetMetadataProfiles.mockResolvedValue(profiles);

    const res = await request(app).get("/metadataprofiles");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(profiles);
  });

  it("returns data even when service returns error data", async () => {
    mockGetMetadataProfiles.mockResolvedValue({ error: "internal" });

    const res = await request(app).get("/metadataprofiles");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ error: "internal" });
  });
});
