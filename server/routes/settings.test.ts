import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetConfig = vi.fn();
const mockSetConfig = vi.fn();
const mockExistsSync = vi.fn();
const mockClearPromotedAlbumCache = vi.fn();
const mockTestLidarrConnection = vi.fn();

vi.mock("../config", () => ({
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
  setConfig: (...args: unknown[]) => mockSetConfig(...args),
}));

vi.mock("fs", () => ({
  default: { existsSync: (p: string) => mockExistsSync(p) },
  existsSync: (p: string) => mockExistsSync(p),
}));

vi.mock("../promotedAlbum/getPromotedAlbum", () => ({
  clearPromotedAlbumCache: (...args: unknown[]) =>
    mockClearPromotedAlbumCache(...args),
}));

vi.mock("../services/settings", () => ({
  testLidarrConnection: (...args: unknown[]) =>
    mockTestLidarrConnection(...args),
}));

vi.mock("../middleware/requireAuth", () => ({
  requireAuth: (
    req: {
      user: {
        id: number;
        username: string;
        role: string;
        enabled: boolean;
        theme: string;
      };
    },
    _res: unknown,
    next: () => void
  ) => {
    req.user = {
      id: 1,
      username: "admin",
      role: "admin",
      enabled: true,
      theme: "system",
    };
    next();
  },
}));

vi.mock("../middleware/requireAdmin", () => ({
  requireAdmin: (_req: unknown, _res: unknown, next: () => void) => {
    next();
  },
}));

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
    mockTestLidarrConnection.mockResolvedValue({
      error: "Lidarr returned 401",
      status: 401,
    });

    const res = await request(app)
      .post("/settings/test")
      .send({ lidarrUrl: "http://lidarr:8686", lidarrApiKey: "badkey" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Lidarr returned 401");
  });

  it("returns success with version and profiles", async () => {
    mockTestLidarrConnection.mockResolvedValue({
      success: true,
      version: "2.0.0",
      qualityProfiles: [{ id: 1, name: "Any" }],
      metadataProfiles: [{ id: 1, name: "Standard" }],
      rootFolderPaths: [{ id: 1, path: "/music" }],
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
    expect(mockTestLidarrConnection).toHaveBeenCalledWith(
      "http://lidarr:8686",
      "goodkey"
    );
  });
});
