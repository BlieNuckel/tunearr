import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetConfig = vi.fn();
const mockSetConfig = vi.fn();
const mockExistsSync = vi.fn();

vi.mock("../config", () => ({
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
  setConfig: (...args: unknown[]) => mockSetConfig(...args),
}));

vi.mock("fs", () => ({
  default: { existsSync: (p: string) => mockExistsSync(p) },
  existsSync: (p: string) => mockExistsSync(p),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import express from "express";
import request from "supertest";
import settingsRouter from "./settings";

const app = express();
app.use(express.json());
app.use("/settings", settingsRouter);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /settings", () => {
  it("returns the full config", async () => {
    mockGetConfig.mockReturnValue({ lidarrUrl: "http://lidarr:8686" });
    const res = await request(app).get("/settings");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ lidarrUrl: "http://lidarr:8686" });
  });
});

describe("PUT /settings", () => {
  it("saves valid config", async () => {
    const res = await request(app)
      .put("/settings")
      .send({ lidarrUrl: "http://lidarr:8686" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockSetConfig).toHaveBeenCalledWith({
      lidarrUrl: "http://lidarr:8686",
    });
  });

  it("rejects non-existent import path", async () => {
    mockExistsSync.mockReturnValue(false);
    const res = await request(app)
      .put("/settings")
      .send({ importPath: "/bad/path" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("/bad/path");
  });

  it("accepts existing import path", async () => {
    mockExistsSync.mockReturnValue(true);
    const res = await request(app)
      .put("/settings")
      .send({ importPath: "/good/path" });
    expect(res.status).toBe(200);
  });
});

describe("POST /settings/validate-import-path", () => {
  it("returns valid for empty path", async () => {
    const res = await request(app)
      .post("/settings/validate-import-path")
      .send({ importPath: "" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: true });
  });

  it("returns valid for missing importPath", async () => {
    const res = await request(app)
      .post("/settings/validate-import-path")
      .send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: true });
  });

  it("returns valid for existing path", async () => {
    mockExistsSync.mockReturnValue(true);
    const res = await request(app)
      .post("/settings/validate-import-path")
      .send({ importPath: "/good/path" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: true });
    expect(mockExistsSync).toHaveBeenCalledWith("/good/path");
  });

  it("returns 400 for non-existent path", async () => {
    mockExistsSync.mockReturnValue(false);
    const res = await request(app)
      .post("/settings/validate-import-path")
      .send({ importPath: "/bad/path" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("/bad/path");
  });
});

describe("POST /settings/test", () => {
  it("returns 400 without required fields", async () => {
    const res = await request(app).post("/settings/test").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("URL and API key are required");
  });

  it("returns error on failed Lidarr connection", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });
    const res = await request(app)
      .post("/settings/test")
      .send({ lidarrUrl: "http://lidarr:8686", lidarrApiKey: "badkey" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Lidarr returned 401");
  });

  it("returns success with version and profiles", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: "2.0.0" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, name: "Any", items: [] }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, name: "Standard", extra: true }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, path: "/music", freeSpace: 100 }],
      });

    const res = await request(app)
      .post("/settings/test")
      .send({ lidarrUrl: "http://lidarr:8686", lidarrApiKey: "goodkey" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      version: "2.0.0",
      qualityProfiles: [{ id: 1, name: "Any" }],
      metadataProfiles: [{ id: 1, name: "Standard" }],
      rootFolderPaths: [{ id: 1, path: "/music" }],
    });
  });

  it("returns empty arrays when profile fetches fail", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: "2.0.0" }),
      })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: false });

    const res = await request(app)
      .post("/settings/test")
      .send({ lidarrUrl: "http://lidarr:8686", lidarrApiKey: "key" });

    expect(res.status).toBe(200);
    expect(res.body.qualityProfiles).toEqual([]);
    expect(res.body.metadataProfiles).toEqual([]);
    expect(res.body.rootFolderPaths).toEqual([]);
  });

  it("returns empty arrays when profile fetches throw", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: "2.0.0" }),
      })
      .mockRejectedValueOnce(new Error("network error"))
      .mockRejectedValueOnce(new Error("network error"))
      .mockRejectedValueOnce(new Error("network error"));

    const res = await request(app)
      .post("/settings/test")
      .send({ lidarrUrl: "http://lidarr:8686", lidarrApiKey: "key" });

    expect(res.status).toBe(200);
    expect(res.body.qualityProfiles).toEqual([]);
    expect(res.body.metadataProfiles).toEqual([]);
    expect(res.body.rootFolderPaths).toEqual([]);
  });

  it("strips trailing slashes from URL", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: "1.0" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    await request(app)
      .post("/settings/test")
      .send({ lidarrUrl: "http://lidarr:8686///", lidarrApiKey: "key" });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://lidarr:8686/api/v1/system/status",
      expect.any(Object)
    );
  });
});
