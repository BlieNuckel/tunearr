import {
  getPlexServerAccess,
  isListeningCaptureActive,
  toServerAccountId,
  type PlexServerAccess,
} from "../plexConnection";
import {
  getSignalEvents,
  getSignalIngestionUsers,
  type SignalIngestionUser,
} from "../../db/signalEvents";
import {
  captureDue,
  ingestUserAlbumTracks,
  ingestUserRatings,
  ingestUserTrackPlays,
} from "./signalIngestion";
import { ingestUserListenHistory } from "./listenHistory";
import { createLogger } from "../../logger";

/** What one user's share of a sweep wrote. */
type SweepCounts = {
  ratings: number;
  plays: number;
  catalogues: number;
  episodes: number;
};

const log = createLogger("signal-ingestion-poller");

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 5 * 60 * 1000;
const PLAYS_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * The album walk is the one capture that reads unplayed items, so it is the one whose cost
 * scales with library size rather than with listening. A library's track counts also change
 * far more slowly than its play counts, so it runs weekly rather than daily.
 */
const CATALOGUE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;

/**
 * Plays are read from the server's own log, which only knows accounts, so a user who holds a
 * token without being linked to a plex.tv account has no history we can attribute to them.
 */
async function ingestHistory(
  user: SignalIngestionUser,
  access: PlexServerAccess
): Promise<number> {
  if (!user.plexAccountId) {
    log.warn(
      `Skipping play history for ${user.displayName} (user ${user.userId}): not linked to a Plex account`
    );
    return 0;
  }
  return ingestUserListenHistory(
    user.userId,
    access.token,
    toServerAccountId(user.plexAccountId, access)
  );
}

async function ingestUser(
  user: SignalIngestionUser,
  access: PlexServerAccess,
  now: number
): Promise<SweepCounts> {
  const counts: SweepCounts = {
    ratings: 0,
    plays: 0,
    catalogues: 0,
    episodes: 0,
  };

  counts.ratings = await ingestUserRatings(user.userId, user.plexToken);
  const playEvents = await getSignalEvents(user.userId, "plex_track_plays");
  if (captureDue(playEvents, now, PLAYS_INTERVAL_MS)) {
    await ingestUserTrackPlays(user.userId, user.plexToken);
    counts.plays = 1;
  }

  // After the plays capture, so a play first seen this sweep already has its length
  // stored when the episodes join onto it.
  counts.episodes = await ingestHistory(user, access);

  const albumEvents = await getSignalEvents(user.userId, "plex_album_tracks");
  if (captureDue(albumEvents, now, CATALOGUE_INTERVAL_MS)) {
    await ingestUserAlbumTracks(user.userId, user.plexToken);
    counts.catalogues = 1;
  }
  return counts;
}

function logSweep(totals: SweepCounts): void {
  if (Object.values(totals).every((count) => count === 0)) return;
  log.info(
    `Ingested ${totals.ratings} rating change(s), ${totals.plays} plays capture(s), ` +
      `${totals.catalogues} catalogue capture(s), ${totals.episodes} listen episode(s)`
  );
}

/**
 * One ingestion sweep over every enabled user with a Plex token: append any
 * new/changed ratings, a plays capture if one is due (>= once/day), and new history.
 * Ratings, play counts and the album walk are per-account values read with the user's own
 * token; history is read through the server connection. Per-user failures (e.g. a managed
 * user whose ratings don't resolve) are logged and skipped so one account never aborts the
 * sweep.
 *
 * NOTE: single-instance assumption — a naive interval double-runs under multiple
 * replicas. The append-only log tolerates duplicate captures but would record
 * redundant rows.
 */
export async function runSignalIngestionOnce(now = Date.now()): Promise<void> {
  if (running) {
    log.warn("Signal ingestion already running, skipping this tick");
    return;
  }
  running = true;
  try {
    const access = getPlexServerAccess();
    if (!isListeningCaptureActive() || !access) return;

    const totals: SweepCounts = {
      ratings: 0,
      plays: 0,
      catalogues: 0,
      episodes: 0,
    };
    for (const user of await getSignalIngestionUsers()) {
      try {
        const counts = await ingestUser(user, access, now);
        totals.ratings += counts.ratings;
        totals.plays += counts.plays;
        totals.catalogues += counts.catalogues;
        totals.episodes += counts.episodes;
      } catch (error) {
        log.error(
          `Signal ingestion failed for ${user.displayName} (user ${user.userId})`,
          error
        );
      }
    }
    logSweep(totals);
  } finally {
    running = false;
  }
}

export function startSignalIngestionPoller(
  intervalMs: number = DEFAULT_INTERVAL_MS
): void {
  if (timer) return;

  const tick = async () => {
    try {
      await runSignalIngestionOnce();
    } catch (error) {
      log.error("Signal ingestion tick failed", error);
    } finally {
      timer = setTimeout(tick, intervalMs);
    }
  };

  timer = setTimeout(tick, FIRST_RUN_DELAY_MS);
  log.info(
    `Signal ingestion poller scheduled (interval: ${intervalMs / 1000}s)`
  );
}

export function stopSignalIngestionPoller(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}
