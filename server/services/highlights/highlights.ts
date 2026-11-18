import { dismissFollowedRelease } from "../followed/followedService";
import { setUserResponse } from "../../db/liveEvents";
import { listLiveHighlights } from "./live";
import { rankHighlights } from "./rank";
import { listReleaseHighlights, withLidarrStatus } from "./releases";
import type { HighlightKind, HighlightsResult } from "./types";

/** One featured highlight and three beside it on Home. */
export const MAX_HIGHLIGHTS = 4;

export const HIGHLIGHT_KINDS: readonly HighlightKind[] = ["release", "live"];

export async function getHighlights(
  userId: number,
  now: number = Date.now()
): Promise<HighlightsResult> {
  const [releases, live] = await Promise.all([
    listReleaseHighlights(userId, now),
    listLiveHighlights(userId, now),
  ]);
  const top = rankHighlights([...releases, ...live], MAX_HIGHLIGHTS);
  return { items: await withLidarrStatus(top) };
}

/** Returns false when there is nothing of this user's to dismiss. */
export async function dismissHighlight(
  userId: number,
  kind: HighlightKind,
  id: number
): Promise<boolean> {
  if (kind === "release") return dismissFollowedRelease(userId, id);
  await setUserResponse(userId, id, "dismissed", new Date().toISOString());
  return true;
}
