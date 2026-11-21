import { dismissFollowedRelease } from "../followed/followedService";
import { dismissRequestHighlight } from "../../db/requests";
import { dismissLiveHighlight, listLiveHighlights } from "./live";
import { rankHighlights } from "./rank";
import { listReleaseHighlights, withLidarrStatus } from "./releases";
import { listRequestHighlights } from "./requests";
import type {
  HighlightKind,
  HighlightsResult,
  RankedHighlight,
  ReleaseHighlight,
  RequestHighlight,
} from "./types";

/** One featured highlight and three beside it on Home. */
export const MAX_HIGHLIGHTS = 4;

export const HIGHLIGHT_KINDS: readonly HighlightKind[] = [
  "release",
  "live",
  "request",
];

/**
 * A requested album by a followed artist is already a release highlight, which
 * shows it is in the library, so the request adds nothing.
 */
function withoutFollowedReleases(
  requests: RankedHighlight<RequestHighlight>[],
  releases: RankedHighlight<ReleaseHighlight>[]
): RankedHighlight<RequestHighlight>[] {
  const releaseMbids = new Set(
    releases.map((r) => r.highlight.releaseGroupMbid)
  );
  return requests.filter((r) => !releaseMbids.has(r.highlight.albumMbid));
}

export async function getHighlights(
  userId: number,
  now: number = Date.now()
): Promise<HighlightsResult> {
  const [releases, live, requests] = await Promise.all([
    listReleaseHighlights(userId, now),
    listLiveHighlights(userId, now),
    listRequestHighlights(userId, now),
  ]);
  const top = rankHighlights(
    [...releases, ...live, ...withoutFollowedReleases(requests, releases)],
    MAX_HIGHLIGHTS
  );
  return { items: await withLidarrStatus(top) };
}

/** Returns false when there is nothing of this user's to dismiss. */
export async function dismissHighlight(
  userId: number,
  kind: HighlightKind,
  id: number
): Promise<boolean> {
  const at = new Date().toISOString();
  if (kind === "release") return dismissFollowedRelease(userId, id);
  if (kind === "request") return dismissRequestHighlight(userId, id, at);
  return dismissLiveHighlight(userId, id);
}
