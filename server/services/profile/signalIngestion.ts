import { getRatedItems, getItemRating } from "../../api/plex/ratings";
import {
  getAllAlbumTrackCounts,
  type AlbumTrackCount,
} from "../../api/plex/albumTrackCounts";
import {
  getAllTrackPlayCounts,
  type TrackPlayCount,
} from "../../api/plex/trackPlayCounts";
import { appendSignalEvents, getSignalEvents } from "../../db/signalEvents";
import { createLogger } from "../../logger";
import type { UserSignalEvent } from "../../db/entity/UserSignalEvent";
import type { PlexRatedItem } from "../../api/plex/types";

export type PlexRatingPayload = {
  ratingKey: string;
  kind: PlexRatedItem["kind"];
  title: string;
  artist: string;
  /**
   * Parent keys, so a rating joins onto the play series by key rather than by artist name.
   * Absent on events written before the fields existed, and on album ratings for `albumKey`
   * (the rating's own `ratingKey` is the album); those fall back to the name join.
   */
  albumKey?: string;
  artistKey?: string;
  /** Plex scale 0–10; `0` is the sentinel for an un-rated (un-starred) item. */
  rating: number;
};

/** One track's cumulative play count plus the album/artist it rolls up into. */
export type TrackPlayState = {
  ratingKey: string;
  title: string;
  artistKey: string;
  artistName: string;
  albumKey: string;
  albumTitle: string;
  playCount: number;
  /**
   * Track length in milliseconds. Absent on events written before the field existed, and `0`
   * where Plex reports no length; both fold to {@link NOMINAL_TRACK_MS} until
   * {@link ingestUserTrackPlays} backfills them.
   */
  durationMs?: number;
};

/**
 * Payload of a `kind = "plex_track_plays"` event. Each event is a delta: only the tracks
 * whose cumulative play count *increased* since the previous capture. Fold the series with
 * {@link reconstructTrackPlayCounts}.
 */
export type PlexTrackPlaysPayload = {
  tracks: TrackPlayState[];
};

/** One album's track count — how much of it exists, regardless of what was played. */
export type AlbumTrackState = {
  ratingKey: string;
  title: string;
  artistKey: string;
  artistName: string;
  trackCount: number;
  /**
   * Plex agent genres for the album. Absent on events written before the field existed
   * (the sweep backfills them), empty where the section's agent supplies none.
   */
  genres?: string[];
};

/**
 * Payload of a `kind = "plex_album_tracks"` event. Each event is a delta: only the albums
 * whose track count differs from the last capture. Fold the series with
 * {@link reconstructAlbumTrackCounts}.
 */
export type PlexAlbumTracksPayload = {
  albums: AlbumTrackState[];
};

const log = createLogger("signal-ingestion");

/**
 * Cap on tracks per event. Steady-state captures are a handful of tracks, but the first
 * capture is every played track in the library — one event would be a multi-megabyte
 * `payload` cell. Chunks are appended in order and the fold is last-write-wins, so N
 * ordered chunks reconstruct identically to one oversized event.
 */
const MAX_TRACKS_PER_EVENT = 2000;

/**
 * Length assumed for a track with no duration on its event — pre-backfill rows, and the
 * handful Plex genuinely reports nothing for. Roughly a pop single.
 */
export const NOMINAL_TRACK_MS = 210_000;

/**
 * Upper bound on per-sweep un-rating candidates. Beyond this, a mass disappearance is
 * far more likely a Plex data event (history clear, library re-import) than a user
 * deliberately un-starring; we skip rather than corrupt the backup with bogus clears.
 */
const UNRATE_CANDIDATE_CAP = 50;

/** Parallel per-item Plex reads while confirming un-ratings. */
const UNRATE_CONFIRM_CONCURRENCY = 5;

/**
 * Fold an append-only event series into keyed state, last-write-wins.
 *
 * REQUIRES the series in the order it was written, oldest first — which is what
 * `getSignalEvents` returns (`ORDER BY recorded_at, id`). Order carries two meanings
 * here: a later event overwrites an earlier one for the same key, and the scan stops
 * at the first event past `cutoffMs`. Hand this an unordered series and it silently
 * returns wrong state rather than failing, so don't.
 *
 * A payload that won't parse is skipped and counted; a systematically malformed write
 * would otherwise corrupt the folded state with nothing in the logs to explain it.
 */
export function foldEvents<TPayload, TValue>(
  events: UserSignalEvent[],
  cutoffMs: number,
  entries: (payload: TPayload) => Iterable<[string, TValue]>,
  label: string
): Map<string, TValue> {
  const state = new Map<string, TValue>();
  let unparsed = 0;

  for (const event of events) {
    if (Date.parse(event.recorded_at) > cutoffMs) break;
    let payload: TPayload;
    try {
      payload = JSON.parse(event.payload) as TPayload;
    } catch {
      unparsed += 1;
      continue;
    }
    if (!payload) continue;
    for (const [key, value] of entries(payload)) {
      state.set(key, value);
    }
  }

  if (unparsed > 0) {
    log.warn(`Skipped ${unparsed} unparsable ${label} event(s)`);
  }
  return state;
}

/**
 * Latest known rating per `ratingKey`, replayed from the append-only `plex_rating`
 * log. Events arrive oldest-first, so a later write overwrites an earlier one.
 */
export function latestRatings(
  events: UserSignalEvent[]
): Map<string, PlexRatingPayload> {
  return foldEvents<PlexRatingPayload, PlexRatingPayload>(
    events,
    Infinity,
    (payload) =>
      typeof payload.ratingKey === "string"
        ? [[payload.ratingKey, payload]]
        : [],
    "plex_rating"
  );
}

/**
 * Whether a stored payload predates the parent-key fields while the live item carries
 * them. The rating itself is unchanged, so nothing else would ever rewrite the event —
 * and until one is written the rating can only join onto the plays series by name.
 */
function needsKeyBackfill(
  prior: PlexRatingPayload,
  item: PlexRatedItem
): boolean {
  return (
    (item.artistKey !== undefined && prior.artistKey === undefined) ||
    (item.albumKey !== undefined && prior.albumKey === undefined)
  );
}

/**
 * Change events for the current rated set vs. the latest known ratings: a row for
 * each new or changed rating, plus a one-time rewrite of events stored without the
 * parent keys. Items dropping out of the rated set (un-ratings) are handled separately
 * by {@link detectUnratings} + {@link recordUnratings}, which confirm each disappearance
 * against live Plex before recording a clear — so a transient empty/filtered response
 * can't emit mass bogus clears.
 */
export function diffRatings(
  previous: Map<string, PlexRatingPayload>,
  current: PlexRatedItem[]
): PlexRatingPayload[] {
  const changes: PlexRatingPayload[] = [];
  for (const item of current) {
    const prior = previous.get(item.ratingKey);
    if (
      !prior ||
      prior.rating !== item.rating ||
      needsKeyBackfill(prior, item)
    ) {
      changes.push({
        ratingKey: item.ratingKey,
        kind: item.kind,
        title: item.title,
        artist: item.artist,
        albumKey: item.albumKey,
        artistKey: item.artistKey,
        rating: item.rating,
      });
    }
  }
  return changes;
}

/**
 * Rated items that have disappeared from the current set: keys we last knew as rated
 * (`rating > 0`) and that the current read no longer returns. These are *candidate*
 * un-ratings — each must still be confirmed against live Plex before being recorded.
 */
export function detectUnratings(
  previous: Map<string, PlexRatingPayload>,
  current: PlexRatedItem[]
): string[] {
  const currentKeys = new Set(current.map((item) => item.ratingKey));
  const candidates: string[] = [];
  for (const [ratingKey, payload] of previous) {
    if (payload.rating > 0 && !currentKeys.has(ratingKey)) {
      candidates.push(ratingKey);
    }
  }
  return candidates;
}

/**
 * Confirm one candidate against live Plex. A per-item read guards against the
 * `userRating>=1` filter quirk (an un-starred item simply vanishes, indistinguishable
 * from a glitch). Null means "don't record a clear for this one" — either Plex still
 * reports a rating, or the confirmation read failed and we'd rather skip than guess.
 */
async function confirmUnrating(
  plexToken: string,
  previous: Map<string, PlexRatingPayload>,
  ratingKey: string
): Promise<PlexRatingPayload | null> {
  let liveRating: number | null;
  try {
    liveRating = await getItemRating(plexToken, ratingKey);
  } catch {
    return null;
  }
  if (liveRating !== null && liveRating > 0) return null;

  const prior = previous.get(ratingKey);
  return prior ? { ...prior, rating: 0 } : null;
}

/**
 * Confirm each candidate un-rating against live Plex and append a `rating = 0` clear
 * for the genuinely-unrated ones, as one batched write.
 */
async function recordUnratings(
  userId: number,
  plexToken: string,
  previous: Map<string, PlexRatingPayload>,
  candidates: string[]
): Promise<number> {
  const clears: PlexRatingPayload[] = [];

  // Capped rather than fully parallel: these are per-item reads against the user's
  // own Plex server, and the candidate list can be UNRATE_CANDIDATE_CAP long.
  for (let i = 0; i < candidates.length; i += UNRATE_CONFIRM_CONCURRENCY) {
    const batch = candidates.slice(i, i + UNRATE_CONFIRM_CONCURRENCY);
    const confirmed = await Promise.all(
      batch.map((ratingKey) => confirmUnrating(plexToken, previous, ratingKey))
    );
    clears.push(...confirmed.filter((clear) => clear !== null));
  }

  await appendSignalEvents(userId, "plex_rating", clears);
  return clears.length;
}

/**
 * Read the user's current Plex ratings and append a `plex_rating` event for each one
 * that is new, changed, or newly un-rated since the last ingestion. Un-ratings are
 * confirmed per-item and skipped wholesale when an implausible number disappear at
 * once (a Plex data event, not user action). Returns the number of events written.
 */
export async function ingestUserRatings(
  userId: number,
  plexToken: string
): Promise<number> {
  const current = await getRatedItems(plexToken);
  const previous = latestRatings(await getSignalEvents(userId, "plex_rating"));
  const changes = diffRatings(previous, current);
  await appendSignalEvents(userId, "plex_rating", changes);

  let removals = 0;
  if (current.length > 0) {
    const candidates = detectUnratings(previous, current);
    if (candidates.length > UNRATE_CANDIDATE_CAP) {
      log.warn(
        `Skipping ${candidates.length} un-rating candidate(s) for user ${userId} — ` +
          "exceeds cap, likely a Plex data event rather than user action"
      );
    } else {
      removals = await recordUnratings(userId, plexToken, previous, candidates);
    }
  }
  return changes.length + removals;
}

/**
 * Cumulative per-track play count reconstructed from the delta series, considering only
 * events recorded at or before `cutoffMs`. Folds last-write-wins per `ratingKey`; unchanged
 * tracks are absent from later deltas and carry their prior value forward. Events arrive
 * oldest-first, so we stop as soon as one is past the cutoff.
 */
export function reconstructTrackPlayCounts(
  events: UserSignalEvent[],
  cutoffMs: number
): Map<string, TrackPlayState> {
  return foldEvents<PlexTrackPlaysPayload, TrackPlayState>(
    events,
    cutoffMs,
    (payload) =>
      (payload.tracks ?? [])
        .filter((track) => track && typeof track.ratingKey === "string")
        .map((track) => [track.ratingKey, track] as [string, TrackPlayState]),
    "plex_track_plays"
  );
}

/**
 * Cumulative per-album track count reconstructed from the delta series, considering only
 * events recorded at or before `cutoffMs`. Folds last-write-wins per `ratingKey`; unchanged
 * albums are absent from later deltas and carry their prior value forward.
 */
export function reconstructAlbumTrackCounts(
  events: UserSignalEvent[],
  cutoffMs: number
): Map<string, AlbumTrackState> {
  return foldEvents<PlexAlbumTracksPayload, AlbumTrackState>(
    events,
    cutoffMs,
    (payload) =>
      (payload.albums ?? [])
        .filter((album) => album && typeof album.ratingKey === "string")
        .map((album) => [album.ratingKey, album] as [string, AlbumTrackState]),
    "plex_album_tracks"
  );
}

/**
 * `playFloor` is the count already stored for the track. It only matters for a row emitted
 * solely to backfill `durationMs`, where the live count may have gone backwards (a Plex
 * history clear) and the series must stay monotonic.
 */
const toTrackPlayState = (
  track: TrackPlayCount,
  playFloor: number
): TrackPlayState => ({
  ratingKey: track.ratingKey,
  title: track.title,
  artistKey: track.artistKey,
  artistName: track.artistName,
  albumKey: track.albumKey,
  albumTitle: track.albumTitle,
  playCount: Math.max(track.viewCount, playFloor),
  durationMs: track.durationMs,
});

/**
 * Whether a stored track carries no length while Plex now reports one — rows written before
 * the field existed, and tracks Plex only later got a duration for. The play count is
 * unchanged, so nothing else would ever rewrite the event, and until one is written the
 * track's listening time can only be inferred at a nominal length. Gated on Plex actually
 * reporting a length, or the tracks it has none for would re-emit on every sweep forever.
 */
function needsDurationBackfill(
  prior: TrackPlayState | undefined,
  track: TrackPlayCount
): boolean {
  return prior !== undefined && !prior.durationMs && track.durationMs > 0;
}

/**
 * Append `plex_track_plays` deltas capturing only the tracks whose cumulative play count
 * *increased* since the last capture — tunearr's own durable copy of the signal Plex can
 * lose, and a series that can be diffed to measure play trends. Counts are treated as
 * monotonic: a decrease or a vanished track (Plex history clear / re-import) is never
 * recorded, so the stored value is the max ever seen and a transient-empty read is a no-op.
 *
 * Tracks whose stored state predates `durationMs` are re-emitted too, which backfills the
 * whole existing series on the first sweep after deploy. When nothing increased and nothing
 * needs backfilling, no event is written.
 */
export async function ingestUserTrackPlays(
  userId: number,
  plexToken: string
): Promise<void> {
  const live = await getAllTrackPlayCounts(plexToken);
  const stored = reconstructTrackPlayCounts(
    await getSignalEvents(userId, "plex_track_plays"),
    Infinity
  );
  const changed: TrackPlayState[] = [];
  for (const track of live) {
    const prior = stored.get(track.ratingKey);
    const grew = track.viewCount > (prior?.playCount ?? 0);
    if (!grew && !needsDurationBackfill(prior, track)) continue;
    changed.push(toTrackPlayState(track, prior?.playCount ?? 0));
  }
  if (changed.length === 0) return;

  const chunks: PlexTrackPlaysPayload[] = [];
  for (let i = 0; i < changed.length; i += MAX_TRACKS_PER_EVENT) {
    chunks.push({ tracks: changed.slice(i, i + MAX_TRACKS_PER_EVENT) });
  }
  await appendSignalEvents(userId, "plex_track_plays", chunks);
}

const toAlbumTrackState = (album: AlbumTrackCount): AlbumTrackState => ({
  ratingKey: album.ratingKey,
  title: album.title,
  artistKey: album.artistKey,
  artistName: album.artistName,
  trackCount: album.trackCount,
  genres: album.genres,
});

/**
 * Whether an album's stored genres differ from what Plex now reports. Both sides normalize
 * an absent list to empty, so an album Plex has never tagged compares equal to one written
 * before the field existed — otherwise every untagged album would re-emit on every sweep.
 */
function genresChanged(
  prior: AlbumTrackState | undefined,
  live: AlbumTrackCount
): boolean {
  const before = prior?.genres ?? [];
  if (before.length !== live.genres.length) return true;
  return before.some((genre, index) => genre !== live.genres[index]);
}

/**
 * Append `plex_album_tracks` deltas capturing only the albums whose track count or genres
 * changed since the last capture — how much music the library actually holds per artist,
 * which the played-track sweep can't see (it never fetches an unplayed track), plus the
 * album's Plex genres. Unlike plays, neither quantity is
 * monotonic: an album can legitimately shrink or be re-tagged, so any difference is
 * recorded. When nothing changed, no event is written.
 */
export async function ingestUserAlbumTracks(
  userId: number,
  plexToken: string
): Promise<void> {
  const live = await getAllAlbumTrackCounts(plexToken);
  const stored = reconstructAlbumTrackCounts(
    await getSignalEvents(userId, "plex_album_tracks"),
    Infinity
  );
  const changed = live.filter((album) => {
    const prior = stored.get(album.ratingKey);
    return (
      album.trackCount !== prior?.trackCount || genresChanged(prior, album)
    );
  });
  if (changed.length === 0) return;

  const chunks: PlexAlbumTracksPayload[] = [];
  for (let i = 0; i < changed.length; i += MAX_TRACKS_PER_EVENT) {
    chunks.push({
      albums: changed.slice(i, i + MAX_TRACKS_PER_EVENT).map(toAlbumTrackState),
    });
  }
  await appendSignalEvents(userId, "plex_album_tracks", chunks);
}

/** Whether a new capture of a series is due — true when none exists or the last is older than the interval. */
export function captureDue(
  events: UserSignalEvent[],
  now: number,
  intervalMs: number
): boolean {
  const last = events[events.length - 1];
  if (!last) return true;
  return now - Date.parse(last.recorded_at) >= intervalMs;
}
