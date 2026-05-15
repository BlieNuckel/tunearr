import {
  getAllFollowedArtists,
  hasSeenRelease,
  recordSeenRelease,
  updateLastCheckedAt,
} from "./followedService";
import { aggregateArtistReleases } from "./releaseAggregator";
import { createLogger } from "../../logger";
import type { FollowedArtist } from "../../db/index";

const log = createLogger("followed-poller");

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 30 * 1000;

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;

function isoNow(): string {
  return new Date().toISOString();
}

async function pollOneArtist(follow: FollowedArtist): Promise<void> {
  const releases = await aggregateArtistReleases(
    follow.artist_mbid,
    follow.artist_name
  );

  for (const rel of releases) {
    const alreadySeen = await hasSeenRelease(follow.id, rel.release_key);
    if (alreadySeen) continue;

    await recordSeenRelease({
      followed_artist_id: follow.id,
      release_key: rel.release_key,
      source: rel.source,
      album_title: rel.album_title,
      release_date: rel.release_date,
      external_id: rel.external_id,
    });
  }

  await updateLastCheckedAt(follow.id, isoNow());
}

export async function runPollOnce(): Promise<void> {
  if (running) {
    log.warn("Poll already running, skipping this tick");
    return;
  }
  running = true;
  try {
    const follows = await getAllFollowedArtists();
    log.info(`Polling ${follows.length} followed artist(s)`);
    for (const f of follows) {
      try {
        await pollOneArtist(f);
      } catch (error) {
        log.error(`Poll failed for artist ${f.artist_name} (${f.id})`, error);
      }
    }
  } finally {
    running = false;
  }
}

export function startFollowedArtistPoller(
  intervalMs: number = DEFAULT_INTERVAL_MS
): void {
  if (timer) return;

  const tick = async () => {
    try {
      await runPollOnce();
    } catch (error) {
      log.error("Poll tick failed", error);
    } finally {
      timer = setTimeout(tick, intervalMs);
    }
  };

  timer = setTimeout(tick, FIRST_RUN_DELAY_MS);
  log.info(
    `Followed artist poller scheduled (interval: ${intervalMs / 1000}s)`
  );
}

export function stopFollowedArtistPoller(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}
