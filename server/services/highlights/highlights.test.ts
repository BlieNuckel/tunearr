import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListReleases = vi.fn();
const mockWithLidarr = vi.fn();
const mockListLive = vi.fn();
const mockDismissRelease = vi.fn();
const mockSetUserResponse = vi.fn();

vi.mock("./releases", () => ({
  listReleaseHighlights: (...args: unknown[]) => mockListReleases(...args),
  withLidarrStatus: (...args: unknown[]) => mockWithLidarr(...args),
}));

vi.mock("./live", () => ({
  listLiveHighlights: (...args: unknown[]) => mockListLive(...args),
}));

vi.mock("../followed/followedService", () => ({
  dismissFollowedRelease: (...args: unknown[]) => mockDismissRelease(...args),
}));

vi.mock("../../db/liveEvents", () => ({
  setUserResponse: (...args: unknown[]) => mockSetUserResponse(...args),
}));

import { dismissHighlight, getHighlights, MAX_HIGHLIGHTS } from "./highlights";
import { TIER_FRESH, TIER_STANDING, TIER_URGENT } from "./rank";

const NOW = Date.parse("2026-11-18T12:00:00.000Z");

function entry(key: string, tier: number, at: string) {
  return { tier, at, highlight: { key } };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListReleases.mockResolvedValue([]);
  mockListLive.mockResolvedValue([]);
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
    expect(mockSetUserResponse).not.toHaveBeenCalled();
  });

  it("reports a release that is not the user's", async () => {
    mockDismissRelease.mockResolvedValue(false);
    expect(await dismissHighlight(7, "release", 12)).toBe(false);
  });

  it("dismisses a live date the same way the live pages do", async () => {
    expect(await dismissHighlight(7, "live", 34)).toBe(true);
    expect(mockSetUserResponse).toHaveBeenCalledWith(
      7,
      34,
      "dismissed",
      expect.any(String)
    );
    expect(mockDismissRelease).not.toHaveBeenCalled();
  });
});
