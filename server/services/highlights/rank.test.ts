import { describe, it, expect } from "vitest";
import {
  compareRanked,
  rankHighlights,
  TIER_FRESH,
  TIER_STANDING,
  TIER_URGENT,
} from "./rank";
import type { HighlightTier, RankedHighlight, ReleaseHighlight } from "./types";

function ranked(
  key: string,
  tier: HighlightTier,
  at: string
): RankedHighlight<ReleaseHighlight> {
  return {
    tier,
    at,
    highlight: {
      kind: "release",
      key,
      followedReleaseId: 1,
      releaseGroupMbid: null,
      title: key,
      artistName: "Artist",
      artistMbid: "mbid",
      releaseDate: "2026-11-10",
      releaseType: "Album",
      coverUrl: null,
      lidarrStatus: null,
      unseen: true,
    },
  };
}

describe("compareRanked", () => {
  it("puts a lower tier first regardless of age", () => {
    const urgent = ranked("urgent", TIER_URGENT, "2026-01-01");
    const fresh = ranked("fresh", TIER_FRESH, "2026-11-17");
    expect(compareRanked(urgent, fresh)).toBeLessThan(0);
  });

  it("puts the newer highlight first within a tier", () => {
    const older = ranked("older", TIER_FRESH, "2026-11-10");
    const newer = ranked("newer", TIER_FRESH, "2026-11-17T08:00:00.000Z");
    expect(compareRanked(newer, older)).toBeLessThan(0);
  });
});

describe("rankHighlights", () => {
  it("orders by tier then recency and keeps the top entries", () => {
    const result = rankHighlights(
      [
        ranked("standing", TIER_STANDING, "2026-11-17"),
        ranked("fresh-old", TIER_FRESH, "2026-11-05"),
        ranked("urgent", TIER_URGENT, "2026-11-01"),
        ranked("fresh-new", TIER_FRESH, "2026-11-16"),
      ],
      3
    );

    expect(result.map((h) => h.key)).toEqual([
      "urgent",
      "fresh-new",
      "fresh-old",
    ]);
  });

  it("returns nothing for no candidates", () => {
    expect(rankHighlights([], 4)).toEqual([]);
  });
});
