import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSearchReleaseGroups = vi.fn();
const mockSearchArtistReleaseGroups = vi.fn();
const mockGetReleaseTracks = vi.fn();
const mockEnrichTracksWithPreviews = vi.fn();
const mockGetReleaseGroupLabel = vi.fn();
const mockGetReleaseGroupDate = vi.fn();
const mockGetLabelAncestors = vi.fn();
const mockGetConfigValue = vi.fn();
const mockEvaluatePurchaseDecision = vi.fn();

vi.mock("../api/musicbrainz/releaseGroups", () => ({
  searchReleaseGroups: (...args: unknown[]) => mockSearchReleaseGroups(...args),
  searchArtistReleaseGroups: (...args: unknown[]) =>
    mockSearchArtistReleaseGroups(...args),
  getReleaseGroupLabel: (...args: unknown[]) =>
    mockGetReleaseGroupLabel(...args),
  getReleaseGroupDate: (...args: unknown[]) => mockGetReleaseGroupDate(...args),
}));

vi.mock("../config", () => ({
  getConfigValue: (...args: unknown[]) => mockGetConfigValue(...args),
}));

vi.mock("../api/musicbrainz/labels", () => ({
  getLabelAncestors: (...args: unknown[]) => mockGetLabelAncestors(...args),
}));

vi.mock("../services/purchaseDecision/evaluatePurchaseDecision", () => ({
  evaluatePurchaseDecision: (...args: unknown[]) =>
    mockEvaluatePurchaseDecision(...args),
}));

vi.mock("../api/musicbrainz/tracks", () => ({
  getReleaseTracks: (...args: unknown[]) => mockGetReleaseTracks(...args),
}));

vi.mock("../services/musicbrainz", () => ({
  enrichTracksWithPreviews: (...args: unknown[]) =>
    mockEnrichTracksWithPreviews(...args),
}));

vi.mock("../middleware/rateLimiter", () => ({
  default: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import express from "express";
import request from "supertest";
import musicbrainzRouter from "./musicbrainz";

const app = express();
app.use("/", musicbrainzRouter);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /search", () => {
  it("returns 400 when q param is missing", async () => {
    const res = await request(app).get("/search");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("q is required");
  });

  it("calls searchArtistReleaseGroups when searchType is artist", async () => {
    const data = [{ id: "rg-1", title: "OK Computer" }];
    mockSearchArtistReleaseGroups.mockResolvedValue(data);

    const res = await request(app).get("/search?q=Radiohead&searchType=artist");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(data);
    expect(mockSearchArtistReleaseGroups).toHaveBeenCalledWith("Radiohead");
    expect(mockSearchReleaseGroups).not.toHaveBeenCalled();
  });

  it("calls searchReleaseGroups for other search types", async () => {
    const data = [{ id: "rg-2", title: "Kid A" }];
    mockSearchReleaseGroups.mockResolvedValue(data);

    const res = await request(app).get("/search?q=Kid+A");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(data);
    expect(mockSearchReleaseGroups).toHaveBeenCalledWith("Kid A");
    expect(mockSearchArtistReleaseGroups).not.toHaveBeenCalled();
  });
});

describe("GET /tracks/:releaseGroupId", () => {
  it("returns tracks for a release group", async () => {
    const media = [
      { position: 1, tracks: [{ title: "Track 1", position: 1 }] },
    ];
    mockGetReleaseTracks.mockResolvedValue(media);

    const res = await request(app).get("/tracks/rg-123");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ media });
    expect(mockGetReleaseTracks).toHaveBeenCalledWith("rg-123");
    expect(mockEnrichTracksWithPreviews).not.toHaveBeenCalled();
  });

  it("enriches tracks with preview URLs when artistName is provided", async () => {
    const media = [
      {
        position: 1,
        tracks: [
          { title: "Creep", position: 1 },
          { title: "High and Dry", position: 2 },
        ],
      },
    ];
    const enrichedMedia = [
      {
        position: 1,
        tracks: [
          {
            title: "Creep",
            position: 1,
            previewUrl: "https://example.com/creep.mp3",
          },
          { title: "High and Dry", position: 2 },
        ],
      },
    ];
    mockGetReleaseTracks.mockResolvedValue(media);
    mockEnrichTracksWithPreviews.mockResolvedValue(enrichedMedia);

    const res = await request(app).get("/tracks/rg-123?artistName=Radiohead");

    expect(res.status).toBe(200);
    expect(res.body.media[0].tracks[0].previewUrl).toBe(
      "https://example.com/creep.mp3"
    );
    expect(res.body.media[0].tracks[1].previewUrl).toBeUndefined();
    expect(mockEnrichTracksWithPreviews).toHaveBeenCalledWith(
      media,
      "Radiohead"
    );
  });

  it("skips preview enrichment when artistName is absent", async () => {
    const media = [
      { position: 1, tracks: [{ title: "Track 1", position: 1 }] },
    ];
    mockGetReleaseTracks.mockResolvedValue(media);

    await request(app).get("/tracks/rg-456");

    expect(mockEnrichTracksWithPreviews).not.toHaveBeenCalled();
  });
});

function parseSSEEvents(text: string): { event: string; data: unknown }[] {
  const events: { event: string; data: unknown }[] = [];
  for (const block of text.split("\n\n")) {
    if (!block.trim()) continue;
    let eventType = "";
    let data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) eventType = line.slice(7);
      else if (line.startsWith("data: ")) data = line.slice(6);
    }
    if (eventType && data) {
      events.push({ event: eventType, data: JSON.parse(data) });
    }
  }
  return events;
}

describe("GET /purchase-context/:releaseGroupId", () => {
  it("streams progress and result via SSE", async () => {
    const label = { name: "Warp Records", mbid: "label-warp" };
    const ancestors = [{ name: "Some Parent", mbid: "label-parent" }];
    const config = {
      labelBlocklist: ["Universal"],
      oldReleaseThresholdYears: 50,
    };
    const pipelineResult = {
      recommendation: "buy",
      signals: [
        { factor: "label", recommendation: "buy", reason: "not blocklisted" },
      ],
      label,
    };

    mockGetReleaseGroupLabel.mockResolvedValue(label);
    mockGetReleaseGroupDate.mockResolvedValue("2025-06-01");
    mockGetLabelAncestors.mockResolvedValue(ancestors);
    mockGetConfigValue.mockReturnValue(config);
    mockEvaluatePurchaseDecision.mockReturnValue(pipelineResult);

    const res = await request(app)
      .get("/purchase-context/rg-123")
      .buffer(true)
      .parse((res, cb) => {
        let data = "";
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on("end", () => cb(null, data));
      });

    expect(res.status).toBe(200);
    const events = parseSSEEvents(res.body as string);

    const progressEvents = events.filter((e) => e.event === "progress");
    expect(progressEvents.length).toBeGreaterThanOrEqual(1);
    expect(progressEvents[0].data).toEqual({
      step: "Looking up album details",
    });

    const resultEvent = events.find((e) => e.event === "result");
    expect(resultEvent?.data).toEqual(pipelineResult);

    expect(mockGetLabelAncestors).toHaveBeenCalledWith(
      "label-warp",
      expect.any(Function)
    );
    expect(mockEvaluatePurchaseDecision).toHaveBeenCalledWith(
      { label, labelAncestors: ancestors, firstReleaseDate: "2025-06-01" },
      config
    );
  });

  it("skips ancestor fetch when no label found", async () => {
    const pipelineResult = {
      recommendation: "neutral",
      signals: [],
      label: null,
    };

    mockGetReleaseGroupLabel.mockResolvedValue(null);
    mockGetReleaseGroupDate.mockResolvedValue(null);
    mockGetConfigValue.mockReturnValue({
      labelBlocklist: [],
      oldReleaseThresholdYears: 50,
    });
    mockEvaluatePurchaseDecision.mockReturnValue(pipelineResult);

    const res = await request(app)
      .get("/purchase-context/rg-456")
      .buffer(true)
      .parse((res, cb) => {
        let data = "";
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on("end", () => cb(null, data));
      });

    const events = parseSSEEvents(res.body as string);
    const resultEvent = events.find((e) => e.event === "result");
    expect(resultEvent?.data).toEqual(pipelineResult);

    expect(mockGetLabelAncestors).not.toHaveBeenCalled();
    expect(mockEvaluatePurchaseDecision).toHaveBeenCalledWith(
      { label: null, labelAncestors: [], firstReleaseDate: null },
      { labelBlocklist: [], oldReleaseThresholdYears: 50 }
    );
  });

  it("returns neutral fallback via SSE on unexpected error", async () => {
    mockGetReleaseGroupLabel.mockRejectedValue(new Error("network fail"));
    mockGetReleaseGroupDate.mockRejectedValue(new Error("network fail"));

    const res = await request(app)
      .get("/purchase-context/rg-error")
      .buffer(true)
      .parse((res, cb) => {
        let data = "";
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on("end", () => cb(null, data));
      });

    expect(res.status).toBe(200);
    const events = parseSSEEvents(res.body as string);
    const resultEvent = events.find((e) => e.event === "result");
    expect(resultEvent?.data).toEqual({
      recommendation: "neutral",
      signals: [],
      label: null,
    });
  });
});
