import type { UserLiveArtistState } from "../../db/index";
import { markViewed } from "../../db/liveEvents";
import type { HydratedLiveEvent } from "../../db/liveEvents";
import {
  dismissArtistState,
  listArtistStates,
  saveArtistState,
} from "../../db/liveArtistState";
import { snapshotOf } from "../liveEvents/baseline";
import { serializeLiveEvent } from "../liveEvents/serialize";
import { listUserTours, STATUS_NEWS_DAYS } from "../liveEvents/tours";
import type { ArtistTour, Origin } from "../liveEvents/tours";
import { TIER_FRESH, TIER_STANDING, TIER_URGENT } from "./rank";
import type { HighlightTier, LiveHighlight, RankedHighlight } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long newly announced or closer dates count as news rather than standing. */
const FRESH_DAYS = 14;

/**
 * A recent change to a show the user marked going that they have not
 * acknowledged on Home yet.
 */
function isUnacknowledgedChange(
  event: HydratedLiveEvent,
  now: number
): boolean {
  if (event.state?.response !== "going") return false;
  if (event.event_status === "scheduled" || !event.status_changed_at) {
    return false;
  }
  const changedAt = Date.parse(event.status_changed_at);
  if (Number.isNaN(changedAt) || now - changedAt > STATUS_NEWS_DAYS * DAY_MS) {
    return false;
  }
  const viewedAt = event.state.viewed_at;
  return !viewedAt || changedAt > Date.parse(viewedAt);
}

function changesFor(
  tour: ArtistTour,
  events: readonly HydratedLiveEvent[],
  now: number
): HydratedLiveEvent[] {
  return events.filter(
    (event) =>
      isUnacknowledgedChange(event, now) &&
      event.performers.some(
        (performer) => performer.artist_jambase_id === tour.jambaseArtistId
      )
  );
}

/**
 * A card needs a baseline row to be dismissed against, so listing records one
 * for any artist that has none, which is the same silent first record the
 * notifier would make. It never notifies or overwrites a row: that would
 * swallow news the next sweep should send.
 */
async function ensureStates(
  userId: number,
  tours: readonly ArtistTour[],
  origin: Origin | null,
  now: number
): Promise<Map<string, UserLiveArtistState>> {
  const byMbid = new Map(
    (await listArtistStates(userId)).map((state) => [state.artist_mbid, state])
  );
  const at = new Date(now).toISOString();
  for (const tour of tours) {
    if (byMbid.has(tour.artistMbid)) continue;
    const state = await saveArtistState(
      userId,
      tour.artistMbid,
      snapshotOf(tour, origin, at)
    );
    byMbid.set(tour.artistMbid, state);
  }
  return byMbid;
}

function isFresh(state: UserLiveArtistState, now: number): boolean {
  if (!state.notified_at) return false;
  return now - Date.parse(state.notified_at) < FRESH_DAYS * DAY_MS;
}

function rankCard(
  state: UserLiveArtistState,
  change: HydratedLiveEvent | undefined,
  now: number
): { tier: HighlightTier; at: string } {
  if (change) {
    return { tier: TIER_URGENT, at: change.status_changed_at as string };
  }
  if (isFresh(state, now)) {
    return { tier: TIER_FRESH, at: state.notified_at as string };
  }
  return { tier: TIER_STANDING, at: state.notified_at ?? state.evaluated_at };
}

function toCard(
  tour: ArtistTour,
  state: UserLiveArtistState,
  change: HydratedLiveEvent | undefined,
  origin: Origin | null
): LiveHighlight {
  return {
    kind: "live",
    key: `live:${tour.artistMbid}`,
    id: state.id,
    artistMbid: tour.artistMbid,
    artistName: tour.artistName,
    dateCount: tour.dates.length,
    closest: tour.closest ? serializeLiveEvent(tour.closest) : null,
    distanceKm: tour.distanceKm,
    hasLocation: origin !== null,
    notifiedAt: state.notified_at,
    change: change ? serializeLiveEvent(change) : null,
  };
}

/**
 * One card per touring artist, leading with the date closest to the user.
 * Dismissing it hides the artist until a closer date is announced; a change to
 * a show the user is going to shows regardless, at the top.
 */
export async function listLiveHighlights(
  userId: number,
  now: number
): Promise<RankedHighlight<LiveHighlight>[]> {
  const { origin, tours, events } = await listUserTours(userId, now);
  const states = await ensureStates(userId, tours, origin, now);

  const cards: RankedHighlight<LiveHighlight>[] = [];
  for (const tour of tours) {
    const state = states.get(tour.artistMbid);
    if (!state) continue;
    const [change] = changesFor(tour, events, now);
    if (!tour.closest && !change) continue;
    if (state.dismissed_at && !change) continue;

    cards.push({
      ...rankCard(state, change, now),
      highlight: toCard(tour, state, change, origin),
    });
  }
  return cards;
}

/**
 * Hides the artist's card until a closer date, and acknowledges any change to a
 * show they are going to so it stops showing as urgent. False when the row is
 * not this user's.
 */
export async function dismissLiveHighlight(
  userId: number,
  stateId: number,
  now: number = Date.now()
): Promise<boolean> {
  const state = (await listArtistStates(userId)).find(
    (row) => row.id === stateId
  );
  if (!state) return false;

  const at = new Date(now).toISOString();
  const { tours, events } = await listUserTours(userId, now);
  const tour = tours.find((t) => t.artistMbid === state.artist_mbid);
  if (tour) {
    for (const change of changesFor(tour, events, now)) {
      await markViewed(userId, change.id, at);
    }
  }
  return dismissArtistState(userId, stateId, at);
}
