import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchReleaseGroups,
  getReleaseGroupById,
  getReleaseGroupIdFromRelease,
  getReleaseGroupLabel,
  getReleaseGroupDate,
} from "./releaseGroups";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("./config", () => ({
  MB_BASE: "https://musicbrainz.test/ws/2",
  MB_HEADERS: { "User-Agent": "test" },
  rateLimitedMbFetch: (...args: unknown[]) => mockFetch(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function okResponse(data: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(data) };
}

function errorResponse(status: number) {
  return { ok: false, status, json: () => Promise.resolve({}) };
}

describe("searchReleaseGroups", () => {
  it("returns release groups sorted by score", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        "release-groups": [
          { id: "1", score: 50, title: "Low Score" },
          { id: "2", score: 100, title: "High Score" },
          { id: "3", score: 75, title: "Mid Score" },
        ],
        count: 3,
        offset: 0,
      })
    );

    const result = await searchReleaseGroups("test");
    expect(result["release-groups"][0].score).toBe(100);
    expect(result["release-groups"][1].score).toBe(75);
    expect(result["release-groups"][2].score).toBe(50);
    expect(result.count).toBe(3);
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(503));

    await expect(searchReleaseGroups("test")).rejects.toThrow(
      "MusicBrainz returned 503"
    );
  });
});

describe("getReleaseGroupById", () => {
  it("returns artist name and album title from release group MBID", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        id: "rg-123",
        title: "OK Computer",
        "artist-credit": [
          { name: "Radiohead", artist: { id: "a1", name: "Radiohead" } },
        ],
      })
    );

    const result = await getReleaseGroupById("rg-123");
    expect(result).toEqual({
      artistName: "Radiohead",
      albumTitle: "OK Computer",
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://musicbrainz.test/ws/2/release-group/rg-123?inc=artist-credits&fmt=json",
      { headers: { "User-Agent": "test" } }
    );
  });

  it("returns null when release group not found", async () => {
    mockFetch.mockResolvedValue(errorResponse(404));

    const result = await getReleaseGroupById("nonexistent");
    expect(result).toBeNull();
  });

  it("returns 'Unknown Artist' when artist-credit is empty", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        id: "rg-123",
        title: "Mystery Album",
        "artist-credit": [],
      })
    );

    const result = await getReleaseGroupById("rg-123");
    expect(result).toEqual({
      artistName: "Unknown Artist",
      albumTitle: "Mystery Album",
    });
  });
});

describe("getReleaseGroupIdFromRelease", () => {
  it("returns release-group info from release MBID", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        id: "release-123",
        title: "OK Computer",
        "release-group": {
          id: "rg-456",
          title: "OK Computer",
          "first-release-date": "1997-06-16",
        },
      })
    );

    const result = await getReleaseGroupIdFromRelease("release-123");
    expect(result).toEqual({ id: "rg-456", firstReleaseDate: "1997-06-16" });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://musicbrainz.test/ws/2/release/release-123?inc=release-groups&fmt=json",
      { headers: { "User-Agent": "test" } }
    );
  });

  it("returns empty firstReleaseDate when not present", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        id: "release-123",
        title: "OK Computer",
        "release-group": {
          id: "rg-456",
          title: "OK Computer",
        },
      })
    );

    const result = await getReleaseGroupIdFromRelease("release-123");
    expect(result).toEqual({ id: "rg-456", firstReleaseDate: "" });
  });

  it("returns null when release not found", async () => {
    mockFetch.mockResolvedValue(errorResponse(404));

    const result = await getReleaseGroupIdFromRelease("nonexistent");
    expect(result).toBeNull();
  });

  it("returns null when release-group is missing", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        id: "release-123",
        title: "Some Release",
      })
    );

    const result = await getReleaseGroupIdFromRelease("release-123");
    expect(result).toBeNull();
  });
});

describe("getReleaseGroupLabel", () => {
  it("returns label name and mbid from first release", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        releases: [
          {
            id: "rel-1",
            "label-info": [{ label: { id: "label-1", name: "Warp Records" } }],
          },
        ],
      })
    );

    const result = await getReleaseGroupLabel("rg-123");
    expect(result).toEqual({ name: "Warp Records", mbid: "label-1" });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://musicbrainz.test/ws/2/release?release-group=rg-123&inc=labels&limit=1&fmt=json",
      { headers: { "User-Agent": "test" } }
    );
  });

  it("returns null when no releases exist", async () => {
    mockFetch.mockResolvedValue(okResponse({ releases: [] }));

    const result = await getReleaseGroupLabel("rg-empty");
    expect(result).toBeNull();
  });

  it("returns null when label-info is empty", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        releases: [{ id: "rel-1", "label-info": [] }],
      })
    );

    const result = await getReleaseGroupLabel("rg-nolabel");
    expect(result).toBeNull();
  });

  it("returns null when label-info is missing", async () => {
    mockFetch.mockResolvedValue(okResponse({ releases: [{ id: "rel-1" }] }));

    const result = await getReleaseGroupLabel("rg-nolabelinfo");
    expect(result).toBeNull();
  });

  it("returns null when label object is missing from label-info entry", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        releases: [{ id: "rel-1", "label-info": [{}] }],
      })
    );

    const result = await getReleaseGroupLabel("rg-nolabelobj");
    expect(result).toBeNull();
  });

  it("returns null on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(500));

    const result = await getReleaseGroupLabel("rg-error");
    expect(result).toBeNull();
  });
});

describe("getReleaseGroupDate", () => {
  it("returns first-release-date from release group", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ "first-release-date": "1997-06-16" })
    );

    const result = await getReleaseGroupDate("rg-123");
    expect(result).toBe("1997-06-16");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://musicbrainz.test/ws/2/release-group/rg-123?fmt=json",
      { headers: { "User-Agent": "test" } }
    );
  });

  it("returns null when date is empty string", async () => {
    mockFetch.mockResolvedValue(okResponse({ "first-release-date": "" }));

    const result = await getReleaseGroupDate("rg-nodate");
    expect(result).toBeNull();
  });

  it("returns null when date field is missing", async () => {
    mockFetch.mockResolvedValue(okResponse({}));

    const result = await getReleaseGroupDate("rg-nofield");
    expect(result).toBeNull();
  });

  it("returns null on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(404));

    const result = await getReleaseGroupDate("rg-notfound");
    expect(result).toBeNull();
  });
});
