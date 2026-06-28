import { getConfigValue } from "../../config";
import { getSignalEvents, getSignalIngestionUsers } from "../../db/userProfile";
import {
  ingestUserRatings,
  ingestUserSnapshot,
  snapshotDue,
} from "./signalIngestion";
import { createLogger } from "../../logger";

const log = createLogger("signal-ingestion-poller");

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 5 * 60 * 1000;
const SNAPSHOT_INTERVAL_MS = 24 * 60 * 60 * 1000;

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;

/**
 * One ingestion sweep over every enabled user with a Plex token: append any
 * new/changed ratings, and a snapshot if one is due (>= once/day). Per-user
 * failures (e.g. a managed user whose ratings don't resolve) are logged and
 * skipped so one account never aborts the sweep.
 *
 * NOTE: single-instance assumption — a naive interval double-runs under multiple
 * replicas. The append-only log tolerates duplicate snapshots but would record
 * redundant rows.
 */
export async function runSignalIngestionOnce(now = Date.now()): Promise<void> {
  if (running) {
    log.warn("Signal ingestion already running, skipping this tick");
    return;
  }
  running = true;
  try {
    if (!getConfigValue("promotedAlbum").ratingsBackupEnabled) return;

    const users = await getSignalIngestionUsers();
    let ratingsWritten = 0;
    let snapshotsWritten = 0;

    for (const user of users) {
      try {
        ratingsWritten += await ingestUserRatings(user.userId, user.plexToken);
        const snapshots = await getSignalEvents(user.userId, "snapshot");
        if (snapshotDue(snapshots, now, SNAPSHOT_INTERVAL_MS)) {
          await ingestUserSnapshot(user.userId, user.plexToken);
          snapshotsWritten += 1;
        }
      } catch (error) {
        log.error(`Signal ingestion failed for user ${user.userId}`, error);
      }
    }

    if (ratingsWritten > 0 || snapshotsWritten > 0) {
      log.info(
        `Ingested ${ratingsWritten} rating change(s), ${snapshotsWritten} snapshot(s)`
      );
    }
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
