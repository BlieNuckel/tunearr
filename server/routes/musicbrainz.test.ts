import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSearchReleaseGroups = vi.fn();
const mockFetchReleaseGroupsForArtist = vi.fn();
const mockGetReleaseTracks = vi.fn();
const mockEnrichTracksWithPreviews = vi.fn();
const mockGetReleaseGroupLabel = vi.fn();
const mockGetReleaseGroupDate = vi.fn();
const mockGetLabelAncestors = vi.fn();
const mockGetConfigValue = vi.fn();
const mockEvaluatePurchaseDecision = vi.fn();
const mockGetArtistById = vi.fn();
const mockSearchArtists = vi.fn();
const mockGetArtistMbidByName = vi.fn();
const mockGetArtistImage = vi.fn();
const mockGetArtistsImages = vi.fn();

vi.mock("../api/musicbrainz/releaseGroups", () => ({
  searchReleaseGroups: (...args: unknown[]) => mockSearchReleaseGroups(...args),
  fetchReleaseGroupsForArtist: (...args: unknown[]) =>
    mockFetchReleaseGroupsForArtist(...args),
  getReleaseGroupLabel: (...args: unknown[]) =>
    mockGetReleaseGroupLabel(...args),
  getReleaseGroupDate: (...args: unknown[]) => mockGetReleaseGroupDate(...args),
}));

vi.mock("../api/musicbrainz/artists", () => ({
  getArtistById: (...args: unknown[]) => mockGetArtistById(...args),
  searchArtists: (...args: unknown[]) => mockSearchArtists(...args),
  getArtistMbidByName: (...args: unknown[]) => mockGetArtistMbidByName(...args),
}));

vi.mock("../api/deezer/artists", () => ({
  getArtistImage: (...args: unknown[]) => mockGetArtistImage(...args),
  getArtistsImages: (...args: unknown[]) => mockGetArtistsImages(...args),
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

  it("searches release groups by query", async () => {
    const data = [{ id: "rg-2", title: "Kid A" }];
    mockSearchReleaseGroups.mockResolvedValue(data);

    const res = await request(app).get("/search?q=Kid+A");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(data);
    expect(mockSearchReleaseGroups).toHaveBeenCalledWith("Kid A");
  });
});

describe("GET /artist/search", () => {
  it("returns 400 when q param is missing", async () => {
    const res = await request(app).get("/artist/search");
    expect(res.status).toBe(400);
  });

  it("returns artists enriched with images", async () => {
    mockSearchArtists.mockResolvedValue([
      { mbid: "a1", name: "Radiohead" },
      { mbid: "a2", name: "Radio Dept." },
    ]);
    mockGetArtistsImages.mockResolvedValue(
      new Map([["radiohead", "https://img/rh.jpg"]])
    );

    const res = await request(app).get("/artist/search?q=radio");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      artists: [
        { mbid: "a1", name: "Radiohead", imageUrl: "https://img/rh.jpg" },
        { mbid: "a2", name: "Radio Dept." },
      ],
    });
    expect(mockSearchArtists).toHaveBeenCalledWith("radio");
  });
});

describe("GET /artist/id", () => {
  it("returns 400 when name is missing", async () => {
    const res = await request(app).get("/artist/id");
    expect(res.status).toBe(400);
  });

  it("resolves a name to an MBID", async () => {
    mockGetArtistMbidByName.mockResolvedValue("mbid-1");

    const res = await request(app).get("/artist/id?name=Radiohead");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mbid: "mbid-1" });
    expect(mockGetArtistMbidByName).toHaveBeenCalledWith("Radiohead");
  });
});

describe("GET /artist/:mbid", () => {
  it("returns 404 when the artist is not found", async () => {
    mockGetArtistById.mockResolvedValue(null);

    const res = await request(app).get("/artist/missing");
    expect(res.status).toBe(404);
    expect(mockFetchReleaseGroupsForArtist).not.toHaveBeenCalled();
  });

  it("composes artist details, image and release groups", async () => {
    const artist = { mbid: "a1", name: "Radiohead", type: "Group" };
    const releaseGroups = [{ id: "rg-1", title: "OK Computer" }];
    mockGetArtistById.mockResolvedValue(artist);
    mockFetchReleaseGroupsForArtist.mockResolvedValue(releaseGroups);
    mockGetArtistImage.mockResolvedValue("https://img/rh.jpg");

    const res = await request(app).get("/artist/a1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      artist: { ...artist, imageUrl: "https://img/rh.jpg" },
      releaseGroups,
    });
    expect(mockGetArtistById).toHaveBeenCalledWith("a1");
    expect(mockFetchReleaseGroupsForArtist).toHaveBeenCalledWith("a1");
    expect(mockGetArtistImage).toHaveBeenCalledWith("Radiohead");
  });

  it("omits imageUrl when no image is found", async () => {
    mockGetArtistById.mockResolvedValue({ mbid: "a1", name: "Radiohead" });
    mockFetchReleaseGroupsForArtist.mockResolvedValue([]);
    mockGetArtistImage.mockResolvedValue("");

    const res = await request(app).get("/artist/a1");
    expect(res.status).toBe(200);
    expect(res.body.artist.imageUrl).toBeUndefined();
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

    expect(mockGetLabelAncestors).toHaveBeenCalledWith("label-warp", {
      onAncestorFound: expect.any(Function),
      shouldStop: expect.any(Function),
    });
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
