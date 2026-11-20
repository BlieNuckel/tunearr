import { resolveArtistByMbid } from "../../api/jambase/artists";
import { JambaseError } from "../../api/jambase/config";
import { isLiveEventsConfigured } from "../../api/jambase/config";
import { getConfig } from "../../config";
import {
  findLiveArtists,
  findUnresolvedFollowedArtists,
  recordArtistResolution,
  upsertSweptEvents,
} from "../../db/liveEvents";
import type { SweptEvent } from "../../db/liveEvents";
import { createLogger } from "../../logger";

export type ResolutionOutcome = {
  attempted: number;
  resolved: number;
  missing: number;
  failed: number;
};

const log = createLogger("live-resolution");

const DAY_MS = 24 * 60 * 60 * 1000;

function isoNow(): string {
  return new Date().toISOString();
}

function errorKind(error: unknown): string {
  return error instanceof JambaseError ? error.kind : "unknown";
}

/**
 * The lookup returns the whole tour, but sweeps only refresh dates inside the
 * horizon. A date stored beyond it would miss every change until it moved into
 * range, so it is left for the full pass that first sees it there.
 */
function withinSweepHorizon(events: SweptEvent[], now: Date): SweptEvent[] {
  const { liveEvents } = getConfig();
  const from = now.toISOString().slice(0, 10);
  const to = new Date(now.getTime() + liveEvents.bannerHorizonDays * DAY_MS)
    .toISOString()
    .slice(0, 10);
  return events.filter(
    (event) => event.event_date >= from && event.event_date <= to
  );
}

/**
 * Turn followed artists' MBIDs into JamBase artist ids, one call each, once.
 *
 * A definitive answer (found, or JamBase has never heard of them) is recorded
 * so the artist leaves the queue. A transient failure deliberately records
 * nothing, so the next run retries rather than burning the miss in permanently.
 */
export async function resolveFollowedArtists(
  limit: number
): Promise<ResolutionOutcome> {
  const outcome: ResolutionOutcome = {
    attempted: 0,
    resolved: 0,
    missing: 0,
    failed: 0,
  };

  if (!isLiveEventsConfigured()) return outcome;

  const pending = await findUnresolvedFollowedArtists(limit);
  if (pending.length === 0) return outcome;

  for (const artist of pending) {
    outcome.attempted += 1;
    try {
      const resolved = await resolveArtistByMbid(artist.artist_mbid);
      await recordArtistResolution(
        artist.artist_mbid,
        resolved?.jambaseArtistId ?? null,
        isoNow()
      );

      if (resolved) outcome.resolved += 1;
      else outcome.missing += 1;
    } catch (error) {
      outcome.failed += 1;
      const kind = errorKind(error);
      log.warn(
        `Could not resolve ${artist.artist_name} (${artist.artist_mbid}): ${kind}`
      );
      // A plan gate or a dead key will fail identically for everyone else in
      // this batch, so stop rather than spending a call per artist to find out.
      if (
        error instanceof JambaseError &&
        (error.kind === "plan-gated" || error.kind === "unauthorized")
      ) {
        break;
      }
    }
  }

  log.info(
    `Resolution: ${outcome.resolved} resolved, ${outcome.missing} unknown to JamBase, ${outcome.failed} failed`
  );
  return outcome;
}

/**
 * Look up a newly followed artist straight away rather than at the next tick,
 * storing their upcoming dates from the same call. One call either way, but
 * the dates appear in seconds instead of after the next weekly full pass, which
 * is the first sweep that would otherwise fetch an unchanged show.
 *
 * Nothing to do when JamBase already answered for this MBID, because another
 * follower's sweeps already keep those dates. A failure is left to the tick.
 */
export async function resolveOnFollow(
  artistMbid: string,
  artistName: string
): Promise<void> {
  if (!isLiveEventsConfigured()) return;

  try {
    const [known] = await findLiveArtists([artistMbid]);
    if (known) return;

    const resolved = await resolveArtistByMbid(artistMbid, {
      withEvents: true,
    });
    const now = new Date();
    const events = resolved ? withinSweepHorizon(resolved.events, now) : [];

    // Events before the resolution, so a failed write leaves the artist
    // pending for the tick to retry rather than tracked with no dates.
    await upsertSweptEvents(events, now.toISOString());
    await recordArtistResolution(
      artistMbid,
      resolved?.jambaseArtistId ?? null,
      now.toISOString()
    );

    log.info(
      resolved
        ? `Resolved ${artistName} on follow with ${events.length} upcoming date(s)`
        : `${artistName} is unknown to JamBase`
    );
  } catch (error) {
    log.warn(
      `Could not resolve ${artistName} (${artistMbid}) on follow: ${errorKind(error)}; the next live poll retries`
    );
  }
}
