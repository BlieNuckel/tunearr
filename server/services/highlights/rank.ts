import type { Highlight, HighlightTier, RankedHighlight } from "./types";

export const TIER_URGENT: HighlightTier = 0;
export const TIER_FRESH: HighlightTier = 1;
export const TIER_STANDING: HighlightTier = 2;

export function compareRanked(a: RankedHighlight, b: RankedHighlight): number {
  if (a.tier !== b.tier) return a.tier - b.tier;
  return b.at.localeCompare(a.at);
}

/** Merges every source into one order and keeps the top `limit`. */
export function rankHighlights(
  ranked: readonly RankedHighlight[],
  limit: number
): Highlight[] {
  return [...ranked]
    .sort(compareRanked)
    .slice(0, limit)
    .map((entry) => entry.highlight);
}
