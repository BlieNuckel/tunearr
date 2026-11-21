import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListReleases = vi.fn();
const mockWithLidarr = vi.fn();
const mockListLive = vi.fn();
const mockDismissRelease = vi.fn();
const mockDismissLive = vi.fn();
const mockListRequests = vi.fn();
const mockDismissRequest = vi.fn();

vi.mock("./releases", () => ({
  listReleaseHighlights: (...args: unknown[]) => mockListReleases(...args),
  withLidarrStatus: (...args: unknown[]) => mockWithLidarr(...args),
}));

vi.mock("./live", () => ({
  listLiveHighlights: (...args: unknown[]) => mockListLive(...args),
  dismissLiveHighlight: (...args: unknown[]) => mockDismissLive(...args),
}));

vi.mock("./requests", () => ({
  listRequestHighlights: (...args: unknown[]) => mockListRequests(...args),
}));

vi.mock("../../db/requests", () => ({
  dismissRequestHighlight: (...args: unknown[]) => mockDismissRequest(...args),
}));

vi.mock("../followed/followedService", () => ({
  dismissFollowedRelease: (...args: unknown[]) => mockDismissRelease(...args),
}));

import { dismissHighlight, getHighlights, MAX_HIGHLIGHTS } from "./highlights";
import { TIER_FRESH, TIER_STANDING, TIER_URGENT } from "./rank";

const NOW = Date.parse("2026-11-18T12:00:00.000Z");

function entry(key: string, tier: number, at: string) {
  return { tier, at, highlight: { key } };
}

function releaseEntry(key: string, releaseGroupMbid: string) {
  return {
    tier: TIER_FRESH,
    at: "2026-11-16",
    highlight: { key, kind: "release", releaseGroupMbid },
  };
}

function requestEntry(key: string, albumMbid: string, at: string) {
  return {
    tier: TIER_FRESH,
    at,
    highlight: { key, kind: "request", albumMbid },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListReleases.mockResolvedValue([]);
  mockListLive.mockResolvedValue([]);
  mockListRequests.mockResolvedValue([]);
  mockWithLidarr.mockImplementation((items: unknown) => Promise.resolve(items));
});

describe("getHighlights", () => {
  it("merges releases and live dates into one order", async () => {
    mockListReleases.mockResolvedValue([
      entry("release:seen", TIER_STANDING, "2026-11-17"),
      entry("release:new", TIER_FRESH, "2026-11-16"),
    ]);
    mockListLive.mockResolvedValue([
      entry("live:cancelled", TIER_URGENT, "2026-11-10T00:00:00.000Z"),
      entry("live:soon", TIER_FRESH, "2026-11-18T12:00:00.000Z"),
    ]);

    const result = await getHighlights(7, NOW);

    expect(mockListReleases).toHaveBeenCalledWith(7, NOW);
    expect(mockListLive).toHaveBeenCalledWith(7, NOW);
    expect(result.items.map((h) => h.key)).toEqual([
      "live:cancelled",
      "live:soon",
      "release:new",
      "release:seen",
    ]);
  });

  it("ranks arrived requests alongside the other news", async () => {
    mockListReleases.mockResolvedValue([releaseEntry("release:1", "rg-1")]);
    mockListRequests.mockResolvedValue([
      requestEntry("request:2", "rg-2", "2026-11-17T09:00:00.000Z"),
    ]);

    const result = await getHighlights(7, NOW);

    expect(mockListRequests).toHaveBeenCalledWith(7, NOW);
    expect(result.items.map((h) => h.key)).toEqual(["request:2", "release:1"]);
  });

  it("drops a request that is already shown as a followed release", async () => {
    mockListReleases.mockResolvedValue([releaseEntry("release:1", "rg-1")]);
    mockListRequests.mockResolvedValue([
      requestEntry("request:2", "rg-1", "2026-11-17T09:00:00.000Z"),
    ]);

    const result = await getHighlights(7, NOW);

    expect(result.items.map((h) => h.key)).toEqual(["release:1"]);
  });

  it("keeps one featured highlight and three beside it", async () => {
    mockListReleases.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) =>
        entry(`release:${i}`, TIER_FRESH, `2026-11-1${i}`)
      )
    );

    const result = await getHighlights(7, NOW);

    expect(MAX_HIGHLIGHTS).toBe(4);
    expect(result.items).toHaveLength(4);
    expect(mockWithLidarr.mock.calls[0][0]).toHaveLength(4);
  });

  it("returns the Lidarr-enriched highlights", async () => {
    mockListReleases.mockResolvedValue([
      entry("release:1", TIER_FRESH, "2026-11-16"),
    ]);
    mockWithLidarr.mockResolvedValue([
      { key: "release:1", lidarrStatus: "imported" },
    ]);

    const result = await getHighlights(7, NOW);

    expect(result.items).toEqual([
      { key: "release:1", lidarrStatus: "imported" },
    ]);
  });
});

describe("dismissHighlight", () => {
  it("dismisses a release for the user", async () => {
    mockDismissRelease.mockResolvedValue(true);

    expect(await dismissHighlight(7, "release", 12)).toBe(true);
    expect(mockDismissRelease).toHaveBeenCalledWith(7, 12);
    expect(mockDismissLive).not.toHaveBeenCalled();
  });

  it("reports a release that is not the user's", async () => {
    mockDismissRelease.mockResolvedValue(false);
    expect(await dismissHighlight(7, "release", 12)).toBe(false);
  });

  it("dismisses an arrived request for the user", async () => {
    mockDismissRequest.mockResolvedValue(true);

    expect(await dismissHighlight(7, "request", 9)).toBe(true);
    expect(mockDismissRequest).toHaveBeenCalledWith(7, 9, expect.any(String));
    expect(mockDismissLive).not.toHaveBeenCalled();
  });

  it("reports a request that is not the user's", async () => {
    mockDismissRequest.mockResolvedValue(false);
    expect(await dismissHighlight(7, "request", 9)).toBe(false);
  });

  it("dismisses a touring artist's card by its baseline row", async () => {
    mockDismissLive.mockResolvedValue(true);

    expect(await dismissHighlight(7, "live", 34)).toBe(true);
    expect(mockDismissLive).toHaveBeenCalledWith(7, 34);
    expect(mockDismissRelease).not.toHaveBeenCalled();
  });

  it("reports a live card that is not the user's", async () => {
    mockDismissLive.mockResolvedValue(false);
    expect(await dismissHighlight(7, "live", 34)).toBe(false);
  });
});
