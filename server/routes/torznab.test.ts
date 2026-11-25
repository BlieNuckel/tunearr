import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetOrSearchResults = vi.fn();
const mockEncodeNzb = vi.fn();

vi.mock("../services/torznab/search", async () => {
  const resultCache = new Map<string, { result: unknown }>();
  return {
    cleanExpiredCaches: vi.fn(),
    getCachedResult: (guid: string) => resultCache.get(guid)?.result ?? null,
    cacheResultsForDownload: (results: { guid: string }[]) => {
      for (const r of results) {
        resultCache.set(r.guid, { result: r });
      }
    },
    getOrSearchResults: (...args: unknown[]) => mockGetOrSearchResults(...args),
    buildSearchQuery: (params: {
      q?: string;
      artist?: string;
      album?: string;
    }) => {
      if (params.q) return params.q;
      if (params.artist && params.album)
        return `${params.artist} ${params.album}`;
      if (params.artist) return params.artist;
      return "";
    },
    DEFAULT_LIMIT: 100,
  };
});

vi.mock("../services/torznab/xml", async () => {
  const actual = await vi.importActual("../services/torznab/xml");
  return actual;
});

vi.mock("../services/torznab/releaseTitle", async () => {
  const actual = await vi.importActual("../services/torznab/releaseTitle");
  return actual;
});

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
    mockGetOrSearchResults.mockResolvedValue([]);

    const res = await request(app).get(
      "/?t=music&artist=Portishead&album=Dummy"
    );
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("xml");
    expect(mockGetOrSearchResults).toHaveBeenCalledWith("Portishead Dummy");
    expect(res.text).toContain("<rss");
  });

  it("returns results as RSS items with newznab:response", async () => {
    mockGetOrSearchResults.mockResolvedValue([
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

    const res = await request(app).get(
      "/?t=music&artist=Radiohead&album=OK+Computer"
    );
    expect(res.status).toBe(200);
    expect(res.text).toContain("<item>");
    expect(res.text).toContain("Radiohead - OK Computer");
    expect(res.text).not.toContain("user1");
    expect(res.text).toContain('value="3040"');
    expect(res.text).toContain('offset="0" total="1"');
  });

  it("returns placeholder item when search query is missing", async () => {
    const res = await request(app).get("/?t=music");
    expect(res.status).toBe(200);
    expect(res.text).toContain("<rss");
    expect(res.text).toContain("<item>");
    expect(res.text).toContain('value="3000"');
    expect(mockGetOrSearchResults).not.toHaveBeenCalled();
  });
});

describe("GET /?t=search", () => {
  it("searches with q parameter", async () => {
    mockGetOrSearchResults.mockResolvedValue([]);

    const res = await request(app).get("/?t=search&q=radiohead");
    expect(res.status).toBe(200);
    expect(mockGetOrSearchResults).toHaveBeenCalledWith("radiohead");
  });
  it("returns the failure as a Newznab error Lidarr can show", async () => {
    mockGetOrSearchResults.mockRejectedValue(
      new Error(
        "slskd unreachable at http://slskd:5030: connection refused, is slskd running?"
      )
    );

    const res = await request(app).get("/?t=search&q=radiohead");
    expect(res.status).toBe(200);
    expect(res.type).toBe("text/xml");
    expect(res.text).toContain('<error code="900"');
    expect(res.text).toContain(
      'description="slskd unreachable at http://slskd:5030: connection refused, is slskd running?"'
    );
  });

  it("escapes the error description", async () => {
    mockGetOrSearchResults.mockRejectedValue(
      new Error('slskd search failed: 500 <"oops">')
    );

    const res = await request(app).get("/?t=search&q=radiohead");
    expect(res.text).toContain(
      'description="slskd search failed: 500 &lt;&quot;oops&quot;&gt;"'
    );
  });
});

describe("pagination", () => {
  it("serves subsequent pages from cache without re-searching", async () => {
    const artists = ["Radiohead", "Portishead", "Massive Attack"];
    const results = artists.map((artist, i) => ({
      guid: `guid-${i}`,
      username: `user${i}`,
      directory: `Music\\${artist}\\Album`,
      files: [{ filename: `track${i}.flac`, size: 1000 }],
      totalSize: 1000,
      hasFreeUploadSlot: true,
      uploadSpeed: 100,
      bitRate: 320,
      category: 3040,
    }));
    mockGetOrSearchResults.mockResolvedValue(results);

    const res1 = await request(app).get("/?t=search&q=test&offset=0&limit=2");
    expect(res1.status).toBe(200);
    expect(res1.text).toContain('offset="0" total="3"');
    expect(res1.text).toContain("Radiohead");
    expect(res1.text).toContain("Portishead");
    expect(res1.text).not.toContain("Massive Attack");
    expect(mockGetOrSearchResults).toHaveBeenCalledTimes(1);

    const res2 = await request(app).get("/?t=search&q=test&offset=2&limit=2");
    expect(res2.status).toBe(200);
    expect(res2.text).toContain('offset="2" total="3"');
    expect(res2.text).toContain("Massive Attack");
    expect(res2.text).not.toContain("Radiohead");
    expect(mockGetOrSearchResults).toHaveBeenCalledTimes(2);
  });

  it("returns empty page when offset exceeds results", async () => {
    mockGetOrSearchResults.mockResolvedValue([
      {
        guid: "g1",
        username: "user1",
        directory: "Music\\Album",
        files: [{ filename: "track.flac", size: 1000 }],
        totalSize: 1000,
        hasFreeUploadSlot: true,
        uploadSpeed: 100,
        bitRate: 320,
        category: 3040,
      },
    ]);

    await request(app).get("/?t=search&q=test2&offset=0&limit=100");

    const res = await request(app).get(
      "/?t=search&q=test2&offset=100&limit=100"
    );
    expect(res.status).toBe(200);
    expect(res.text).toContain('offset="100" total="1"');
    expect(res.text).not.toContain("<item>");
  });
});

describe("GET /download/:guid", () => {
  it("returns 404 for unknown guid", async () => {
    const res = await request(app).get("/download/nonexistent");
    expect(res.status).toBe(404);
    expect(res.text).toContain("Item not found");
  });

  it("returns NZB for cached result", async () => {
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
    mockGetOrSearchResults.mockResolvedValue([result]);
    mockEncodeNzb.mockReturnValue("<nzb>test</nzb>");

    await request(app).get("/?t=search&q=dltest");

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
