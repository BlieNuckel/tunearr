import { getRatedItems } from "../../api/plex/ratings";
import { getAllArtistPlayCounts } from "../../api/plex/artistPlayCounts";
import { appendSignalEvent, getSignalEvents } from "../../db/userProfile";
import type { UserSignalEvent } from "../../db/entity/UserSignalEvent";
import type { PlexRatedItem } from "../../api/plex/types";

/** Payload of a `kind = "plex_rating"` event — maps 1:1 to a `PlexRatedItem`. */
export type PlexRatingPayload = {
  ratingKey: string;
  kind: PlexRatedItem["kind"];
  title: string;
  artist: string;
  /** Plex scale 0–10. */
  rating: number;
};

/** Payload of a `kind = "plex_plays"` event — per-artist play counts at one instant. */
export type PlexPlaysPayload = {
  artists: { name: string; playCount: number }[];
};

/**
 * Latest known rating per `ratingKey`, replayed from the append-only `plex_rating`
 * log. Events arrive oldest-first, so a later write overwrites an earlier one.
 */
export function latestRatings(
  events: UserSignalEvent[]
): Map<string, PlexRatingPayload> {
  const map = new Map<string, PlexRatingPayload>();
  for (const event of events) {
    try {
      const payload = JSON.parse(event.payload) as PlexRatingPayload;
      if (payload && typeof payload.ratingKey === "string") {
        map.set(payload.ratingKey, payload);
      }
    } catch {
      continue;
    }
  }
  return map;
}

/**
 * Change events for the current rated set vs. the latest known ratings: a row for
 * each new or changed rating. Un-rating (an item dropping out of the rated set) is
 * deliberately NOT recorded — a transient empty/200 response would otherwise emit
 * mass "cleared" events and corrupt the backup. Cleared ratings can be handled
 * later behind a non-empty-response guard.
 */
export function diffRatings(
  previous: Map<string, PlexRatingPayload>,
  current: PlexRatedItem[]
): PlexRatingPayload[] {
  const changes: PlexRatingPayload[] = [];
  for (const item of current) {
    const prior = previous.get(item.ratingKey);
    if (!prior || prior.rating !== item.rating) {
      changes.push({
        ratingKey: item.ratingKey,
        kind: item.kind,
        title: item.title,
        artist: item.artist,
        rating: item.rating,
      });
    }
  }
  return changes;
}

/**
 * Read the user's current Plex ratings and append a `plex_rating` event for each
 * one that is new or changed since the last ingestion. Returns the number written.
 */
export async function ingestUserRatings(
  userId: number,
  plexToken: string
): Promise<number> {
  const current = await getRatedItems(plexToken);
  const previous = latestRatings(await getSignalEvents(userId, "plex_rating"));
  const changes = diffRatings(previous, current);
  for (const change of changes) {
    await appendSignalEvent(userId, "plex_rating", change);
  }
  return changes.length;
}

/**
 * Append a `plex_plays` event capturing the user's cumulative all-time per-artist play
 * counts for EVERY played artist (not just the top N) — tunearr's own durable copy of
 * the signal Plex can lose, and the series the recommender diffs to derive play trends.
 */
export async function ingestUserPlays(
  userId: number,
  plexToken: string
): Promise<void> {
  const artists = await getAllArtistPlayCounts(plexToken);
  const payload: PlexPlaysPayload = {
    artists: artists.map((a) => ({ name: a.name, playCount: a.viewCount })),
  };
  await appendSignalEvent(userId, "plex_plays", payload);
}

/** Whether a new plays capture is due — true when none exists or the last is older than the interval. */
export function playsDue(
  events: UserSignalEvent[],
  now: number,
  intervalMs: number
): boolean {
  const last = events[events.length - 1];
  if (!last) return true;
  return now - Date.parse(last.recorded_at) >= intervalMs;
}
