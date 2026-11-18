import { listAvailableRequestsForUser } from "../../db/requests";
import type { Request } from "../../db/index";
import { TIER_FRESH } from "./rank";
import type { RankedHighlight, RequestHighlight } from "./types";

/** How long "your request is here" stays news. */
export const REQUEST_HIGHLIGHT_DAYS = 7;

/**
 * A bulk request lands all at once; past this many, the rest would push
 * releases and live dates off Home for a week.
 */
export const MAX_REQUEST_HIGHLIGHTS = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

function toRanked(request: Request): RankedHighlight<RequestHighlight> {
  const availableAt = request.available_at as string;
  return {
    tier: TIER_FRESH,
    at: availableAt,
    highlight: {
      kind: "request",
      key: `request:${request.id}`,
      requestId: request.id,
      albumMbid: request.album_mbid,
      title: request.album_title,
      artistName: request.artist_name,
      coverUrl: `https://coverartarchive.org/release-group/${request.album_mbid}/front-500`,
      availableAt,
    },
  };
}

/** The user's requests that reached the library in the last week, newest first. */
export async function listRequestHighlights(
  userId: number,
  now: number
): Promise<RankedHighlight<RequestHighlight>[]> {
  const since = new Date(now - REQUEST_HIGHLIGHT_DAYS * DAY_MS).toISOString();
  const rows = await listAvailableRequestsForUser(userId, since);
  return rows.slice(0, MAX_REQUEST_HIGHLIGHTS).map(toRanked);
}
