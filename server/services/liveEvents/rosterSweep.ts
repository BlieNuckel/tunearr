import { getConfig, setConfig } from "../../config";
import { isLiveEventsConfigured } from "../../api/jambase/config";
import { searchEvents, MAX_PER_PAGE } from "../../api/jambase/events";
import {
  listFollowedJambaseIds,
  upsertSweptEvents,
  applyTombstones,
} from "../../db/liveEvents";
import { createLogger } from "../../logger";
import type {
  LiveEventsSettings,
  RosterFullPassCursor,
} from "../../../shared/settingsDefaults";

export type RosterSweepResult = {
  ran: boolean;
  isFullPass: boolean;
  /** True when this run continued a full pass an earlier run left unfinished. */
  resumed: boolean;
  batches: number;
  pages: number;
  events: number;
  tombstones: number;
  hitPageCap: boolean;
  completed: boolean;
};

/** Worldwide: closeness is worked out per user from these, not by filtering the fetch. */
type SweepWindow = {
  dateFrom: string;
  dateTo: string;
  sweptAt: string;
};

type BatchProgress = {
  spent: number;
  /** The page to resume from, or null when the batch was fetched to the end. */
  stoppedAt: number | null;
};

const log = createLogger("live-roster");

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Weekly because `/events` stops at about 180 days on the Developer plan: an
 * unchanged show sliding into that window never appears in a delta, so only a
 * full pass finds it.
 */
const FULL_PASS_INTERVAL_DAYS = 7;

/**
 * The vendor's documented delta pattern: overlap the watermark by five minutes
 * so an event modified during the previous run is not skipped by it.
 */
const WATERMARK_PADDING_MS = 5 * 60 * 1000;

function calendarDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

/** RFC3339 with a space, matching the format the API's examples use. */
function toWatermark(at: Date): string {
  return at.toISOString().replace("T", " ").slice(0, 19);
}

function paddedWatermark(at: Date): string {
  return toWatermark(new Date(at.getTime() - WATERMARK_PADDING_MS));
}

function isFullPassDue(
  watermark: string | null,
  fullSweptAt: string | null,
  now: number
): boolean {
  if (watermark === null || fullSweptAt === null) return true;
  const last = Date.parse(fullSweptAt);
  if (Number.isNaN(last)) return true;
  return now - last >= FULL_PASS_INTERVAL_DAYS * DAY_MS;
}

function emptyResult(isFullPass = false): RosterSweepResult {
  return {
    ran: false,
    isFullPass,
    resumed: false,
    batches: 0,
    pages: 0,
    events: 0,
    tombstones: 0,
    hitPageCap: false,
    completed: false,
  };
}

function buildWindow(horizonDays: number, now: Date): SweepWindow {
  return {
    dateFrom: calendarDay(now),
    dateTo: calendarDay(new Date(now.getTime() + horizonDays * DAY_MS)),
    sweptAt: now.toISOString(),
  };
}

async function sweepBatch(
  artistIds: string[],
  params: {
    window: SweepWindow;
    dateModifiedFrom?: string;
    startPage: number;
    pageBudget: number;
  },
  result: RosterSweepResult
): Promise<BatchProgress> {
  let page = params.startPage;
  let totalPages = params.startPage;
  let spent = 0;

  while (page <= totalPages) {
    if (spent >= params.pageBudget) {
      result.hitPageCap = true;
      return { spent, stoppedAt: page };
    }

    const response = await searchEvents({
      artistIds,
      dateFrom: params.window.dateFrom,
      dateTo: params.window.dateTo,
      dateModifiedFrom: params.dateModifiedFrom,
      page,
      perPage: MAX_PER_PAGE,
    });
    spent += 1;
    result.pages += 1;

    await upsertSweptEvents(response.events, params.window.sweptAt);
    await applyTombstones(response.tombstones);
    result.events += response.events.length;
    result.tombstones += response.tombstones.length;

    totalPages = response.totalPages;
    page += 1;
  }

  return { spent, stoppedAt: null };
}

function saveFullPassCursor(cursor: RosterFullPassCursor): void {
  setConfig({ liveEvents: { rosterFullPass: cursor } });
}

/**
 * Sweep the batches after the cursor, saving progress after each one so a
 * capped or failed run resumes there instead of starting over from batch 1.
 *
 * On completion the watermark becomes the pass's start, not its end: an event
 * modified mid-pass may sit on a page already fetched, and the next delta has to
 * pick it up.
 */
async function runFullPass(
  artistIds: string[],
  pass: RosterFullPassCursor,
  window: SweepWindow,
  result: RosterSweepResult
): Promise<void> {
  const { liveEvents } = getConfig();
  const remaining = artistIds.filter(
    (id) => pass.afterId === null || id > pass.afterId
  );
  let cursor = pass;
  let budget = liveEvents.maxPagesPerRun;

  for (const batch of chunk(remaining, liveEvents.rosterBatchSize)) {
    if (budget <= 0) {
      result.hitPageCap = true;
      break;
    }
    result.batches += 1;
    const progress = await sweepBatch(
      batch,
      { window, startPage: cursor.page, pageBudget: budget },
      result
    );
    budget -= progress.spent;

    cursor =
      progress.stoppedAt === null
        ? { ...cursor, afterId: batch[batch.length - 1], page: 1 }
        : { ...cursor, page: progress.stoppedAt };
    if (progress.stoppedAt !== null) break;
    saveFullPassCursor(cursor);
  }

  result.completed = !result.hitPageCap;
  if (!result.completed) {
    saveFullPassCursor(cursor);
    log.warn(
      `Full pass paused at the page cap after ${cursor.afterId ?? "the start"}, page ${cursor.page}; the next run resumes there`
    );
    return;
  }

  setConfig({
    liveEvents: {
      rosterFullPass: null,
      rosterFullSweptAt: window.sweptAt,
      rosterWatermark: paddedWatermark(new Date(pass.startedAt)),
    },
  });
}

/**
 * Only advances the watermark on a clean, uncapped run: a partial delta that
 * moved it would silently lose every event it did not reach.
 */
async function runDeltaPass(
  artistIds: string[],
  watermark: string,
  window: SweepWindow,
  result: RosterSweepResult
): Promise<void> {
  const { liveEvents } = getConfig();
  const batches = chunk(artistIds, liveEvents.rosterBatchSize);
  let budget = liveEvents.maxPagesPerRun;

  for (const batch of batches) {
    if (budget <= 0) {
      result.hitPageCap = true;
      break;
    }
    result.batches += 1;
    const progress = await sweepBatch(
      batch,
      { window, dateModifiedFrom: watermark, startPage: 1, pageBudget: budget },
      result
    );
    budget -= progress.spent;
  }

  result.completed = !result.hitPageCap && result.batches === batches.length;
  if (!result.completed) {
    log.warn(
      `Delta sweep incomplete (pages=${result.pages}); watermark left where it was`
    );
    return;
  }

  setConfig({
    liveEvents: {
      rosterWatermark: paddedWatermark(new Date(window.sweptAt)),
    },
  });
}

function pickFullPass(
  liveEvents: LiveEventsSettings,
  now: Date
): RosterFullPassCursor | null {
  if (liveEvents.rosterFullPass) return liveEvents.rosterFullPass;
  if (
    !isFullPassDue(
      liveEvents.rosterWatermark,
      liveEvents.rosterFullSweptAt,
      now.getTime()
    )
  ) {
    return null;
  }
  return { startedAt: now.toISOString(), afterId: null, page: 1 };
}

/**
 * Fetch every followed artist's in-scope dates, batching up to
 * `rosterBatchSize` artist ids per call. A full pass runs weekly and can span
 * several runs when the page cap stops it; deltas run in between.
 */
export async function runRosterSweep(): Promise<RosterSweepResult> {
  if (!isLiveEventsConfigured()) return emptyResult();

  const { liveEvents } = getConfig();
  const artistIds = [...(await listFollowedJambaseIds())].sort();
  if (artistIds.length === 0) {
    log.info("No resolved followed artists yet, nothing to sweep");
    return emptyResult();
  }

  const now = new Date();
  const window = buildWindow(liveEvents.bannerHorizonDays, now);

  const pass = pickFullPass(liveEvents, now);
  const result: RosterSweepResult = {
    ...emptyResult(pass !== null),
    ran: true,
    resumed: liveEvents.rosterFullPass !== null,
  };

  log.info(
    `${pass ? "Full" : "Delta"} roster sweep${result.resumed ? " (resuming)" : ""}: ${artistIds.length} artist(s), worldwide`
  );

  if (pass) {
    await runFullPass(artistIds, pass, window, result);
  } else {
    await runDeltaPass(
      artistIds,
      liveEvents.rosterWatermark as string,
      window,
      result
    );
  }

  log.info(
    `Roster sweep done: ${result.pages} page(s), ${result.events} event(s), ${result.tombstones} tombstone(s)`
  );
  return result;
}
