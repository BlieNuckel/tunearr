import { getSignalEvents } from "../db/userProfile";
import {
  ingestUserSnapshot,
  latestRatings,
  type SnapshotPayload,
} from "../services/profile/signalIngestion";
import type { UserSignalEvent } from "../db/entity/UserSignalEvent";

/** An artist with the effective weight (windowed plays × rating boost) the recommender ranks by. */
export type ArtistWeight = {
  name: string;
  viewCount: number;
};

function parseSnapshotCounts(event: UserSignalEvent): Map<string, number> {
  const counts = new Map<string, number>();
  try {
    const payload = JSON.parse(event.payload) as SnapshotPayload;
    for (const artist of payload.artists ?? []) {
      counts.set(artist.name, artist.playCount);
    }
  } catch {
    return counts;
  }
  return counts;
}

/** Most recent snapshot recorded at or before the window start, or null if the series is younger. */
function findBaseline(
  snapshots: UserSignalEvent[],
  windowStart: number
): UserSignalEvent | null {
  for (let i = snapshots.length - 1; i >= 0; i--) {
    if (Date.parse(snapshots[i].recorded_at) <= windowStart)
      return snapshots[i];
  }
  return null;
}

function allTimeWeights(latest: Map<string, number>): ArtistWeight[] {
  return Array.from(latest, ([name, viewCount]) => ({ name, viewCount }));
}

/**
 * Per-artist play weight derived from the snapshot series. When the series spans the
 * full window, weight = plays within the window (latest cumulative count minus the count
 * at the window start). Until the series is that deep — or when nothing was played in the
 * window — weight falls back to the latest cumulative all-time count, so the set is never
 * empty and a thin history still produces sensible weights.
 */
export function derivePlayWeights(
  snapshots: UserSignalEvent[],
  now: number,
  windowMs: number
): ArtistWeight[] {
  if (snapshots.length === 0) return [];
  const latest = parseSnapshotCounts(snapshots[snapshots.length - 1]);

  const baselineEvent = findBaseline(snapshots, now - windowMs);
  if (!baselineEvent) return allTimeWeights(latest);

  const baseline = parseSnapshotCounts(baselineEvent);
  const windowed: ArtistWeight[] = [];
  let total = 0;
  for (const [name, count] of latest) {
    const delta = Math.max(0, count - (baseline.get(name) ?? 0));
    total += delta;
    if (delta > 0) windowed.push({ name, viewCount: delta });
  }
  return total > 0 ? windowed : allTimeWeights(latest);
}

/** Average rating (0–10) per artist, from the latest rating known for each rated item. */
export function aggregateArtistRatings(
  ratingEvents: UserSignalEvent[]
): Map<string, number> {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const payload of latestRatings(ratingEvents).values()) {
    if (!payload.artist) continue;
    const entry = totals.get(payload.artist) ?? { sum: 0, count: 0 };
    entry.sum += payload.rating;
    entry.count += 1;
    totals.set(payload.artist, entry);
  }
  const averages = new Map<string, number>();
  for (const [name, { sum, count }] of totals) {
    averages.set(name, sum / count);
  }
  return averages;
}

/** Boost each artist's play weight by its average rating: `× (1 + ratingWeight × avg/10)`. */
export function applyRatingMultiplier(
  plays: ArtistWeight[],
  ratings: Map<string, number>,
  ratingWeight: number
): ArtistWeight[] {
  return plays.map((play) => {
    const avg = ratings.get(play.name);
    if (avg === undefined) return play;
    return {
      name: play.name,
      viewCount: play.viewCount * (1 + ratingWeight * (avg / 10)),
    };
  });
}

/**
 * The recommender's canonical artist-weight source: windowed play trend from the user's
 * own snapshot series, boosted by their ratings. Reads everything from `user_signal_events`
 * — no live Plex query — except the cold-start case (zero snapshots), where one snapshot
 * is ingested on demand so the first read still goes through our own table.
 */
export async function loadArtistWeights(
  userId: number,
  plexToken: string,
  windowMs: number,
  ratingWeight: number,
  now: number = Date.now()
): Promise<ArtistWeight[]> {
  let snapshots = await getSignalEvents(userId, "snapshot");
  if (snapshots.length === 0) {
    await ingestUserSnapshot(userId, plexToken);
    snapshots = await getSignalEvents(userId, "snapshot");
  }

  const plays = derivePlayWeights(snapshots, now, windowMs);
  const ratings = aggregateArtistRatings(
    await getSignalEvents(userId, "plex_rating")
  );
  return applyRatingMultiplier(plays, ratings, ratingWeight);
}
