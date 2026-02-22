import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStartSearch = vi.fn();
const mockWaitForSearch = vi.fn();
const mockGetSearchResponses = vi.fn();
const mockDeleteSearch = vi.fn();
const mockGroupSearchResults = vi.fn();
const mockEncodeNzb = vi.fn();

vi.mock("../api/slskd/search", () => ({
  startSearch: (...args: unknown[]) => mockStartSearch(...args),
  waitForSearch: (...args: unknown[]) => mockWaitForSearch(...args),
  getSearchResponses: (...args: unknown[]) => mockGetSearchResponses(...args),
  deleteSearch: (...args: unknown[]) => mockDeleteSearch(...args),
}));

vi.mock("../api/slskd/groupResults", () => ({
  groupSearchResults: (...args: unknown[]) => mockGroupSearchResults(...args),
}));

vi.mock("../api/slskd/nzb", () => ({
  encodeNzb: (...args: unknown[]) => mockEncodeNzb(...args),
}));

import express from "express";
import request from "supertest";
import torznabRouter from "./torznab";

const app = express();
app.use("/", torznabRouter);
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

describe("GET /?t=caps", () => {
  it("returns capabilities XML", async () => {
    const res = await request(app).get("/?t=caps");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("xml");
    expect(res.text).toContain("<caps>");
    expect(res.text).toContain("music-search");
    expect(res.text).toContain('id="3040"');
    expect(res.text).toContain('id="3010"');
  });
});

describe("GET /?t=music", () => {
  it("searches with artist and album", async () => {
    mockStartSearch.mockResolvedValue({ id: "s1", searchText: "Radiohead OK Computer" });
    mockWaitForSearch.mockResolvedValue(undefined);
    mockGetSearchResponses.mockResolvedValue([]);
    mockDeleteSearch.mockResolvedValue(undefined);
    mockGroupSearchResults.mockReturnValue([]);

    const res = await request(app).get("/?t=music&artist=Radiohead&album=OK+Computer");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("xml");
    expect(mockStartSearch).toHaveBeenCalledWith("Radiohead OK Computer");
    expect(res.text).toContain("<rss");
  });

  it("returns results as RSS items", async () => {
    mockStartSearch.mockResolvedValue({ id: "s1" });
    mockWaitForSearch.mockResolvedValue(undefined);
    mockGetSearchResponses.mockResolvedValue([{}]);
    mockDeleteSearch.mockResolvedValue(undefined);
    mockGroupSearchResults.mockReturnValue([
      {
        guid: "abc123",
        username: "user1",
        directory: "Music\\Radiohead\\OK Computer",
        files: [{ filename: "01.flac", size: 30000000 }],
        totalSize: 30000000,
        hasFreeUploadSlot: true,
        uploadSpeed: 1000,
        bitRate: 320,
        category: 3040,
      },
    ]);

    const res = await request(app).get("/?t=music&artist=Radiohead&album=OK+Computer");
    expect(res.status).toBe(200);
    expect(res.text).toContain("<item>");
    expect(res.text).toContain("user1");
    expect(res.text).toContain("OK Computer");
    expect(res.text).toContain('value="3040"');
  });

  it("returns error XML when search query is missing", async () => {
    const res = await request(app).get("/?t=music");
    expect(res.status).toBe(400);
    expect(res.text).toContain("Missing search query");
  });
});

describe("GET /?t=search", () => {
  it("searches with q parameter", async () => {
    mockStartSearch.mockResolvedValue({ id: "s1" });
    mockWaitForSearch.mockResolvedValue(undefined);
    mockGetSearchResponses.mockResolvedValue([]);
    mockDeleteSearch.mockResolvedValue(undefined);
    mockGroupSearchResults.mockReturnValue([]);

    const res = await request(app).get("/?t=search&q=radiohead");
    expect(res.status).toBe(200);
    expect(mockStartSearch).toHaveBeenCalledWith("radiohead");
  });
});

describe("GET /download/:guid", () => {
  it("returns 404 for unknown guid", async () => {
    const res = await request(app).get("/download/nonexistent");
    expect(res.status).toBe(404);
    expect(res.text).toContain("Item not found");
  });

  it("returns NZB for cached result", async () => {
    mockStartSearch.mockResolvedValue({ id: "s1" });
    mockWaitForSearch.mockResolvedValue(undefined);
    mockGetSearchResponses.mockResolvedValue([]);
    mockDeleteSearch.mockResolvedValue(undefined);

    const result = {
      guid: "cached-guid-123",
      username: "user1",
      directory: "Music\\Album",
      files: [{ filename: "Music\\Album\\track.flac", size: 5000 }],
      totalSize: 5000,
      hasFreeUploadSlot: true,
      uploadSpeed: 100,
      bitRate: 320,
      category: 3040,
    };
    mockGroupSearchResults.mockReturnValue([result]);
    mockEncodeNzb.mockReturnValue("<nzb>test</nzb>");

    await request(app).get("/?t=search&q=test");

    const res = await request(app).get("/download/cached-guid-123");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("nzb");
    expect(mockEncodeNzb).toHaveBeenCalled();
  });
});

describe("unknown function", () => {
  it("returns error for unsupported t parameter", async () => {
    const res = await request(app).get("/?t=unknown");
    expect(res.status).toBe(400);
    expect(res.text).toContain("No such function");
  });
});
